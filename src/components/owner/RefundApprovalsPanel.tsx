import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRefundApprovalRequests,
  approveRefundApprovalRequest,
  rejectRefundApprovalRequest,
  type RefundApprovalRequest,
} from "@/api/payments";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatPaise, formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n";
import { useAuth } from "@/auth/context";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

export const RefundApprovalsPanel: React.FC = () => {
  const { t } = useLocale();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [approvingReq, setApprovingReq] = useState<RefundApprovalRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<RefundApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [stepUpOtp, setStepUpOtp] = useState("");
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
  });

  const tenantMap = React.useMemo(
    () => new Map(tenants.map((ten) => [ten.id, ten.name])),
    [tenants]
  );

  const {
    data: approvalsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.refundApprovals("pending"),
    queryFn: () => listRefundApprovalRequests("pending"),
    refetchInterval: 15000,
  });

  const requests = approvalsData?.refund_requests || [];

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReq) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      await approveRefundApprovalRequest(approvingReq.id, {
        note: approvalNote.trim() || undefined,
        otp: stepUpOtp.trim() || undefined,
      });

      setApprovingReq(null);
      setApprovalNote("");
      setStepUpOtp("");
      setNeedsStepUp(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.refundApprovals() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number; code?: string };
      if (
        apiErr.status === 401 &&
        (apiErr.code === "auth.stepUpRequired" ||
          /step-up|otp/i.test(apiErr.message || ""))
      ) {
        setNeedsStepUp(true);
        setActionError("Authorization OTP required for high-value approval.");
      } else {
        setActionError(apiErr.message || "Approval failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      setActionError(t("owner.refundApprovals.rejectReasonPlaceholder"));
      return;
    }
    setIsSubmitting(true);
    setActionError(null);

    try {
      await rejectRefundApprovalRequest(rejectingReq.id, rejectionReason.trim());
      setRejectingReq(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.refundApprovals() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setActionError(apiErr.message || "Rejection failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-hairline rounded-2xl p-6 flex items-center justify-center gap-2 text-ink-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{t("owner.refundApprovals.loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface border border-hairline rounded-2xl p-4 text-xs text-danger flex items-center justify-between">
        <span>{t("owner.refundApprovals.loadError")}</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="underline font-medium hover:text-danger-emphasis"
        >
          {t("common.retry") || "Retry"}
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm space-y-0">
      {/* Panel Header */}
      <div className="px-6 py-4 bg-accent-tint/40 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {t("owner.refundApprovals.title")}
            </h3>
            <p className="text-xs text-ink-muted">
              {t("owner.refundApprovals.subtitle")}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-accent text-white text-xs font-semibold">
          {t("owner.refundApprovals.pendingCount", { count: requests.length })}
        </span>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
            <tr>
              <th className="px-6 py-3">{t("owner.refundApprovals.colTenant")}</th>
              <th className="px-6 py-3">{t("owner.refundApprovals.colAmount")}</th>
              <th className="px-6 py-3">{t("owner.refundApprovals.colReason")}</th>
              <th className="px-6 py-3">{t("owner.refundApprovals.colStatus")}</th>
              <th className="px-6 py-3 text-right">
                {t("owner.refundApprovals.colActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-ink">
            {requests.map((req) => {
              const tenantName = tenantMap.get(req.tenant_id) || "Tenant";
              const isMaker = Boolean(userId && req.requested_by && userId === req.requested_by);
              return (
                <tr key={req.id} className="hover:bg-bg/50 transition">
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-ink">{tenantName}</div>
                        <div className="text-xs text-ink-muted">
                          {formatDate(req.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold text-ink">
                    {formatPaise(req.amount_paise)}
                  </td>
                  <td className="px-6 py-4 text-xs text-ink-muted max-w-xs truncate">
                    &ldquo;{req.reason}&rdquo;
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-tint text-warning border border-warning/30">
                      {req.approvals.length} / {req.required_approvals}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isMaker ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-ink-muted italic bg-bg px-2.5 py-1 rounded-lg border border-hairline"
                        title={t("owner.refundApprovals.selfApprovalBlocked")}
                      >
                        {t("owner.refundApprovals.selfApprovalBlocked")}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingReq(req);
                            setActionError(null);
                            setApprovalNote("");
                            setStepUpOtp("");
                            setNeedsStepUp(false);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-success text-white hover:bg-success-emphasis transition shadow-xs"
                        >
                          {t("owner.refundApprovals.approve")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingReq(req);
                            setActionError(null);
                            setRejectionReason("");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-danger/40 text-danger hover:bg-danger-tint transition"
                        >
                          {t("owner.refundApprovals.reject")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Approve Modal */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-hairline w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <h3 className="text-base font-semibold text-ink">
                  Approve Refund Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-bg border border-hairline rounded-xl p-3 text-xs space-y-1">
              <div>
                <span className="text-ink-muted">{t("owner.refundApprovals.amountLabel")} </span>
                <span className="font-bold text-ink">
                  {formatPaise(approvingReq.amount_paise)}
                </span>
              </div>
              <div>
                <span className="text-ink-muted">{t("owner.refundApprovals.reasonLabel")} </span>
                <span className="text-ink">&ldquo;{approvingReq.reason}&rdquo;</span>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-danger-tint border border-danger/30 rounded-xl text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleApprove} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Approval Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Verified bank slip with manager"
                  className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-ink text-xs"
                />
              </div>

              {needsStepUp && (
                <div>
                  <label className="block text-xs font-medium text-danger mb-1">
                    Authorization OTP *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={stepUpOtp}
                    onChange={(e) => setStepUpOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 bg-surface border border-danger rounded-xl text-ink font-mono text-center tracking-widest text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingReq(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-bg transition"
                >
                  {t("owner.refundApprovals.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-success text-white hover:bg-success-emphasis transition flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("owner.refundApprovals.approve")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-hairline w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-danger" />
                <h3 className="text-base font-semibold text-ink">
                  {t("owner.refundApprovals.rejectPromptTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-bg border border-hairline rounded-xl p-3 text-xs space-y-1">
              <div>
                <span className="text-ink-muted">{t("owner.refundApprovals.amountLabel")} </span>
                <span className="font-bold text-ink">
                  {formatPaise(rejectingReq.amount_paise)}
                </span>
              </div>
              <div>
                <span className="text-ink-muted">{t("owner.refundApprovals.reasonLabel")} </span>
                <span className="text-ink">&ldquo;{rejectingReq.reason}&rdquo;</span>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-danger-tint border border-danger/30 rounded-xl text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={200}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t("owner.refundApprovals.rejectReasonPlaceholder")}
                  className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-ink text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-bg transition"
                >
                  {t("owner.refundApprovals.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-danger text-white hover:bg-danger-emphasis transition flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("owner.refundApprovals.confirmReject")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
