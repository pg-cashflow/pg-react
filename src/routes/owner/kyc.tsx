import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  Eye,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import {
  getOwnerKYCQueue,
  approveOwnerKYC,
  rejectOwnerKYC,
  getOwnerKYCDocumentBlob,
  getOwnerTenantKYCPhoto,
} from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n";
import type { OwnerKYCVerificationView } from "@pg/types";

export const OwnerKYCView: React.FC = () => {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [rejectingItem, setRejectingItem] = useState<OwnerKYCVerificationView | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<OwnerKYCVerificationView | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const revokeWithDelay = (url: string) => {
    // 60-second delay prevents 404 in newly opened external browser tabs
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore already revoked URLs
      }
    }, 60000);
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      revokeWithDelay(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewItem(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewContentType(null);
  };

  const handleOpenPreview = async (item: OwnerKYCVerificationView) => {
    if (previewBlobUrl) {
      revokeWithDelay(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewContentType(null);

    try {
      const blob = await getOwnerKYCDocumentBlob(item.id);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setPreviewContentType(blob.type);
    } catch {
      if (item.tenant_id) {
        try {
          const photoBlob = await getOwnerTenantKYCPhoto(item.tenant_id);
          const url = URL.createObjectURL(photoBlob);
          setPreviewBlobUrl(url);
          setPreviewContentType(photoBlob.type || "image/jpeg");
          return;
        } catch {
          // Both failed
        }
      }
      setPreviewError(t("kyc.previewUnavailableDesc"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const isPdf = Boolean(
    previewContentType?.includes("pdf") ||
    previewItem?.document_name?.toLowerCase().endsWith(".pdf") ||
    previewItem?.document_url?.toLowerCase().endsWith(".pdf")
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.ownerKYCQueue,
    queryFn: getOwnerKYCQueue,
    refetchInterval: 15000,
  });

  const queueItems = data?.items ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveOwnerKYC(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerKYCQueue });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : t("kyc.approvalFailed"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectOwnerKYC(id, reason),
    onSuccess: () => {
      setRejectingItem(null);
      setRejectReason("");
      setReasonError(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ownerKYCQueue });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
    },
    onError: (err: unknown) => {
      setReasonError(err instanceof Error ? err.message : t("kyc.rejectionFailed"));
    },
  });

  const handleApprove = (item: OwnerKYCVerificationView) => {
    setActionError(null);
    approveMutation.mutate(item.id);
  };

  const openRejectDialog = (item: OwnerKYCVerificationView) => {
    setRejectingItem(item);
    setRejectReason("");
    setReasonError(null);
    setActionError(null);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setReasonError(t("kyc.rejectionReasonMandatory"));
      return;
    }
    if (rejectingItem) {
      rejectMutation.mutate({ id: rejectingItem.id, reason: rejectReason.trim() });
    }
  };

  const filteredItems = queueItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    const name = (item.tenant_name ?? "").toLowerCase();
    const room = (item.room_number ?? "").toLowerCase();
    const masked = (item.masked_uid ?? "").toLowerCase();
    return name.includes(term) || room.includes(term) || masked.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Page Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="t-h1">{t("kyc.queueTitle")}</h1>
          <p className="t-body-sm text-ink-muted mt-0.5">
            {t("kyc.queueSubtitle")}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-hairline t-caption text-ink-muted shrink-0">
          <Clock className="w-4 h-4 text-warning" />
          <span>{t("kyc.pendingReviewCount", { count: queueItems.length })}</span>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3.5 rounded-[12px] bg-danger-tint/30 border border-danger/20 flex items-center justify-between gap-3 text-danger">
          <div className="flex items-center gap-2 t-body-sm font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 text-danger hover:opacity-70"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      {queueItems.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder={t("kyc.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-hairline rounded-xl text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {/* Queue List */}
      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error as Error | null}
          isEmpty={!isLoading && queueItems.length === 0}
          emptyMessage={t("kyc.emptyManualQueue")}
          onRetry={() => refetch()}
        >
          <div className="divide-y divide-hairline">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Details */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="t-body font-semibold text-ink">
                      {item.tenant_name || t("tenant.profile")}
                    </span>
                    {item.room_number && (
                      <span className="px-2 py-0.5 rounded-md bg-bg border border-hairline t-caption text-ink font-mono">
                        {t("tenant.room")} {item.room_number}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-tint text-warning t-caption font-semibold">
                      <Clock className="w-3 h-3" />
                      {t("kyc.pendingApproval")}
                    </span>
                    {item.duplicate_detected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-tint text-danger t-caption font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        {t("kyc.duplicateDetected")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 t-caption text-ink-muted">
                    <div>
                      <span className="text-ink-faint block">{t("kyc.submitted")}</span>
                      <span>{formatDate(item.created_at, locale)}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint block">{t("kyc.method")}</span>
                      <span className="uppercase font-medium">
                        {item.method === "ocr" ? t("kyc.methodManualOcr") : item.method}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-faint block">{t("kyc.document")}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(item)}
                        className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {item.document_name || t("kyc.viewDocument")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => handleApprove(item)}
                    className="h-10 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold flex items-center gap-1.5 hover:bg-accent/90 transition disabled:opacity-50"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {t("kyc.approve")}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openRejectDialog(item)}
                    className="h-10 px-3 rounded-[10px] border border-hairline text-danger t-caption font-semibold hover:bg-bg transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    {t("kyc.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </div>

      {/* Document Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl max-w-3xl w-full p-5 space-y-4 max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-hairline pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  <h3 className="t-h3">{t("kyc.modalTitle")}</h3>
                </div>
                <div className="flex items-center gap-2 mt-1 t-caption text-ink-muted flex-wrap">
                  <span className="font-medium text-ink">
                    {previewItem.tenant_name || t("tenant.profile")}
                  </span>
                  {previewItem.room_number && (
                    <span className="px-1.5 py-0.5 rounded bg-bg border border-hairline font-mono text-xs">
                      {t("tenant.room")} {previewItem.room_number}
                    </span>
                  )}
                  {previewItem.document_name && (
                    <span className="text-ink-faint truncate max-w-[200px]" title={previewItem.document_name}>
                      • {previewItem.document_name}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-bg transition"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto rounded-xl bg-bg border border-hairline flex items-center justify-center min-h-[380px] p-2">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-ink-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <span className="t-body-sm">{t("kyc.loadingPreview")}</span>
                </div>
              ) : previewError ? (
                <div className="max-w-md text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-warning-tint text-warning flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="t-body font-semibold text-ink">{t("kyc.previewUnavailable")}</h4>
                  <p className="t-caption text-ink-muted">{previewError}</p>
                </div>
              ) : previewBlobUrl ? (
                isPdf ? (
                  <iframe
                    src={previewBlobUrl}
                    sandbox=""
                    className="w-full h-[520px] rounded-lg border-0 bg-white"
                    title={previewItem.document_name || t("kyc.document")}
                  />
                ) : (
                  <img
                    src={previewBlobUrl}
                    alt={previewItem.document_name || t("kyc.document")}
                    className="max-h-[520px] w-auto max-w-full object-contain rounded-lg"
                  />
                )
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-hairline flex-wrap">
              <div>
                {previewBlobUrl && (
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-accent hover:underline t-caption font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("kyc.openNewTab")}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const itemToReject = previewItem;
                    handleClosePreview();
                    openRejectDialog(itemToReject);
                  }}
                  className="h-9 px-3 rounded-[10px] border border-hairline text-danger t-caption font-semibold hover:bg-bg transition flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {t("kyc.reject")}
                </button>
                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  onClick={() => {
                    handleApprove(previewItem);
                    handleClosePreview();
                  }}
                  className="h-9 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold flex items-center gap-1.5 hover:bg-accent/90 transition disabled:opacity-50"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {t("kyc.approve")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl p-6 max-w-md w-full space-y-4">
            <div>
              <h3 className="t-h3 text-danger">{t("kyc.rejectModalTitle")}</h3>
              <p className="t-caption text-ink-muted mt-1">
                {t("kyc.rejectModalSubtitle", { name: rejectingItem.tenant_name || t("tenant.profile") })}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="t-caption font-medium text-ink-muted block">
                {t("kyc.rejectReasonLabel")}
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setReasonError(null);
                }}
                placeholder={t("kyc.rejectReasonPlaceholder")}
                className="w-full p-3 rounded-[10px] border border-hairline bg-bg text-ink t-body-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {reasonError && <p className="t-caption text-danger">{reasonError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingItem(null);
                  setRejectReason("");
                  setReasonError(null);
                }}
                className="h-10 px-4 rounded-[10px] border border-hairline t-caption font-semibold hover:bg-bg transition"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={handleConfirmReject}
                className="h-10 px-4 rounded-[10px] bg-danger text-white t-caption font-semibold flex items-center gap-1.5 hover:bg-danger/90 transition disabled:opacity-50"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  t("kyc.confirmReject")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
