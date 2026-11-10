import React, { useState } from "react";
import {
  Send,
  Plus,
  FileCheck2,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  UserCheck,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  usePayoutBatches,
  useUnbatchedPayoutItems,
  usePayees,
  useCreatePayoutBatch,
  useDispatchPayoutBatch,
  useVerifyPayee,
} from "@/lib/usePayouts";
import { exportPayoutBatchCSV } from "@/api/payouts";
import { formatPaise, formatDate } from "@/lib/utils";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { BatchApprovalModal } from "@/components/owner/BatchApprovalModal";
import { CreatePayeeModal } from "@/components/owner/CreatePayeeModal";
import { useLocale } from "@/i18n";
import type { PayoutBatch } from "@pg/types";

const getCoolingOffRemainingHours = (createdAt?: string): number => {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60);
  if (elapsedHours < 24) {
    return Math.max(1, Math.ceil(24 - elapsedHours));
  }
  return 0;
};

export const PayoutsView: React.FC = () => {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<"batches" | "unbatched" | "payees">("batches");
  const [selectedBatchForApproval, setSelectedBatchForApproval] = useState<PayoutBatch | null>(null);
  const [isCreatePayeeOpen, setIsCreatePayeeOpen] = useState(false);
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: batches = [],
    isLoading: isBatchesLoading,
    isError: isBatchesError,
    error: batchesError,
    refetch: refetchBatches,
  } = usePayoutBatches();

  const {
    data: unbatchedItems = [],
    isLoading: isUnbatchedLoading,
    isError: isUnbatchedError,
    error: unbatchedError,
    refetch: refetchUnbatched,
  } = useUnbatchedPayoutItems();

  const {
    data: payees = [],
    isLoading: isPayeesLoading,
    isError: isPayeesError,
    error: payeesError,
    refetch: refetchPayees,
  } = usePayees();

  const createBatchMutation = useCreatePayoutBatch();
  const dispatchBatchMutation = useDispatchPayoutBatch();
  const verifyPayeeMutation = useVerifyPayee();

  const payeeMap = React.useMemo(
    () => new Map(payees.map((p) => [p.id, p])),
    [payees]
  );

  const coolingOffItemsCount = React.useMemo(() => {
    return unbatchedItems.filter((it) => {
      const p = payeeMap.get(it.payee_id);
      return getCoolingOffRemainingHours(p?.created_at) > 0;
    }).length;
  }, [unbatchedItems, payeeMap]);

  const handleCreateBatch = () => {
    setActionError(null);
    createBatchMutation.mutate(undefined, {
      onSuccess: () => {
        refetchBatches();
        refetchUnbatched();
        setActiveTab("batches");
      },
      onError: (err: any) => {
        setActionError(err.message || "Failed to create payout batch.");
      },
    });
  };

  const handleDispatchBatch = (batchId: string) => {
    setActionError(null);
    dispatchBatchMutation.mutate(batchId, {
      onSuccess: () => {
        refetchBatches();
      },
      onError: (err: any) => {
        setActionError(err.message || "Failed to dispatch batch.");
      },
    });
  };

  const handleExportCSV = async (batch: PayoutBatch) => {
    try {
      setExportingBatchId(batch.id);
      setActionError(null);
      const blob = await exportPayoutBatchCSV(batch.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout_${batch.batch_number}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(err.message || "Failed to export payout batch CSV.");
    } finally {
      setExportingBatchId(null);
    }
  };

  const handleVerifyPayee = (payeeId: string) => {
    setActionError(null);
    verifyPayeeMutation.mutate(payeeId, {
      onSuccess: () => {
        refetchPayees();
      },
      onError: (err: any) => {
        setActionError(err.message || "Failed to verify payee.");
      },
    });
  };

  const unbatchedTotalPaise = unbatchedItems.reduce((acc, it) => acc + it.amount_paise, 0);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t-h1 text-ink tracking-tight flex items-center gap-2.5">
            <Send className="w-5 h-5 text-accent" />
            {t("owner.payouts.title")}
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {t("owner.payouts.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCreatePayeeOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-hairline text-ink hover:bg-surface font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("owner.payouts.addPayee")}
          </button>
          {unbatchedItems.length > 0 && (
            <button
              onClick={handleCreateBatch}
              disabled={createBatchMutation.isPending}
              className="px-4 py-2 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 flex items-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("owner.payouts.generating")}
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  {t("owner.payouts.generateBatch", { count: unbatchedItems.length })}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-hairline">
        <button
          onClick={() => setActiveTab("batches")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "batches"
              ? "border-accent text-accent"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Layers className="w-4 h-4" />
          {t("owner.payouts.tabBatches")}
          {batches.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-xs bg-accent-tint text-accent">
              {batches.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("unbatched")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "unbatched"
              ? "border-accent text-accent"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Clock className="w-4 h-4" />
          {t("owner.payouts.tabUnbatched")}
          {unbatchedItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-xs bg-warning-tint text-warning font-bold">
              {unbatchedItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("payees")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "payees"
              ? "border-accent text-accent"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          {t("owner.payouts.tabPayees")}
          {payees.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-xs bg-bg text-ink-muted">
              {payees.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Payout Batches */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          {batches.some((b) => b.status === "dispatch_unknown") && (
            <div className="p-4 rounded-2xl bg-warning-tint border border-warning/30 text-ink text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">Reconciliation Polling In Progress</p> {/* lint-allow-i18n */}
                <p className="text-xs text-ink-muted mt-0.5"> {/* lint-allow-i18n */}
                  One or more payout batches have an ambiguous dispatch status. The system is actively querying Cashfree to verify whether transfers settled. Do not re-initiate or duplicate instructions while reconciliation is running.
                </p>
              </div>
            </div>
          )}
          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
          <QueryState
            isLoading={isBatchesLoading}
            isError={isBatchesError}
            error={batchesError as Error | null}
            isEmpty={!isBatchesLoading && !isBatchesError && batches.length === 0}
            loadingMessage={t("owner.payouts.loadingBatches")}
            emptyMessage={t("owner.payouts.emptyBatches")}
            onRetry={() => refetchBatches()}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                  <tr>
                    <th className="px-6 py-3.5">{t("owner.payouts.thBatchDetails")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thCount")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thTotalAmount")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thStatus")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thCreatedDate")}</th>
                    <th className="px-6 py-3.5 text-right">{t("owner.payouts.thActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-accent-tint/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{b.batch_number}</div>
                        {b.notes && <p className="text-xs text-ink-muted mt-0.5">{b.notes}</p>}
                      </td>
                      <td className="px-6 py-4 font-mono">{b.item_count} items</td>
                      <td className="px-6 py-4">
                        <AmountBadge amount={b.total_amount_paise} variant="warning" />
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            b.status === "completed"
                              ? "bg-success/10 text-success"
                              : b.status === "approved"
                              ? "bg-accent-tint text-accent"
                              : b.status === "processing"
                              ? "bg-warning-tint text-warning"
                              : b.status === "dispatch_unknown"
                              ? "bg-warning-tint text-warning border border-warning/30"
                              : b.status === "failed"
                              ? "bg-danger/10 text-danger"
                              : "bg-bg text-ink-muted border border-hairline"
                          }`}
                        >
                          {b.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {b.status === "approved" && <FileCheck2 className="w-3.5 h-3.5" />}
                          {b.status === "processing" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          {b.status === "dispatch_unknown" && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                          {b.status === "dispatch_unknown" ? "Polling Gateway" : b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-ink-muted font-medium">
                        {formatDate(b.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {b.status === "draft" && (
                            <button
                              onClick={() => setSelectedBatchForApproval(b)}
                              className="px-3 py-1.5 rounded-xl bg-accent text-accent-contrast font-semibold text-xs hover:opacity-90 transition shadow-sm"
                            >
                              {t("owner.payouts.reviewApprove")}
                            </button>
                          )}

                          {b.status === "approved" && (
                            <>
                              <button
                                onClick={() => handleDispatchBatch(b.id)}
                                disabled={dispatchBatchMutation.isPending}
                                className="px-3 py-1.5 rounded-xl bg-success text-white font-semibold text-xs hover:opacity-90 transition shadow-sm disabled:opacity-50"
                              >
                                {dispatchBatchMutation.isPending ? t("owner.payouts.dispatching") : t("owner.payouts.dispatchTransfer")}
                              </button>
                              <button
                                onClick={() => handleExportCSV(b)}
                                disabled={exportingBatchId === b.id}
                                className="px-3 py-1.5 rounded-xl border border-hairline text-ink hover:bg-bg font-medium text-xs inline-flex items-center gap-1.5 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {exportingBatchId === b.id ? t("owner.payouts.exporting") : "CSV"}
                              </button>
                            </>
                          )}

                          {b.status !== "draft" && b.status !== "approved" && (
                            <button
                              onClick={() => handleExportCSV(b)}
                              disabled={exportingBatchId === b.id}
                              className="px-3 py-1.5 rounded-xl border border-hairline text-ink-muted hover:text-ink hover:bg-bg font-medium text-xs inline-flex items-center gap-1.5 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {exportingBatchId === b.id ? t("owner.payouts.exporting") : t("owner.payouts.export")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </div>
        </div>
      )}

      {/* Tab 2: Pending Unbatched Items */}
      {activeTab === "unbatched" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-warning-tint/30 border border-warning/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">
                  {t("owner.payouts.pendingBanner", { count: unbatchedItems.length })}
                </p>
                <p className="text-xs text-ink-muted">
                  {t("owner.payouts.pendingVolume", { amount: formatPaise(unbatchedTotalPaise) })}
                </p>
              </div>
            </div>
            {unbatchedItems.length > 0 && (
              <button
                onClick={handleCreateBatch}
                disabled={createBatchMutation.isPending || coolingOffItemsCount > 0}
                className="px-4 py-2 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 transition shadow-sm disabled:opacity-50"
                title={coolingOffItemsCount > 0 ? "Blocked: one or more payees are in 24-hour cooling-off" : undefined}
              >
                {t("owner.payouts.createBatch")}
              </button>
            )}
          </div>

          {coolingOffItemsCount > 0 && (
            <div className="p-3.5 rounded-xl bg-warning-tint border border-warning/30 text-ink text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-warning">Cooling-Off Period Active:</span>{" "}
                {coolingOffItemsCount} unbatched item(s) are linked to payees registered within the last 24 hours. Batch generation will unlock once the mandatory 24-hour security window finishes.
              </div>
            </div>
          )}

          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <QueryState
              isLoading={isUnbatchedLoading}
              isError={isUnbatchedError}
              error={unbatchedError as Error | null}
              isEmpty={!isUnbatchedLoading && !isUnbatchedError && unbatchedItems.length === 0}
              loadingMessage={t("owner.payouts.loadingUnbatched")}
              emptyMessage={t("owner.payouts.emptyUnbatched")}
              onRetry={() => refetchUnbatched()}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                    <tr>
                      <th className="px-6 py-3.5">{t("owner.payouts.thPayee")}</th>
                      <th className="px-6 py-3.5">{t("owner.payouts.thPurpose")}</th>
                      <th className="px-6 py-3.5">{t("owner.payouts.thReference")}</th>
                      <th className="px-6 py-3.5">{t("owner.payouts.thAmount")}</th>
                      <th className="px-6 py-3.5">{t("owner.payouts.thDateCreated")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink">
                    {unbatchedItems.map((item) => {
                      const payee = payeeMap.get(item.payee_id);
                      return (
                        <tr key={item.id} className="hover:bg-accent-tint/40 transition">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-ink">{payee?.name || item.payee_id}</div>
                            {payee && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-ink-muted capitalize">
                                  {payee.payee_type.replace("_", " ")}
                                </span>
                                {getCoolingOffRemainingHours(payee.created_at) > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-micro font-medium bg-warning-tint text-warning border border-warning/30">
                                    <Clock className="w-2.5 h-2.5" />
                                    {getCoolingOffRemainingHours(payee.created_at)}h cooling-off
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-ink capitalize">{item.purpose}</span>
                            {item.period_label && (
                              <span className="text-xs text-ink-muted block mt-0.5">
                                Period: {item.period_label}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-ink-muted">
                            {item.reference_number}
                          </td>
                          <td className="px-6 py-4">
                            <AmountBadge amount={item.amount_paise} variant="warning" />
                          </td>
                          <td className="px-6 py-4 text-xs text-ink-muted">
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </QueryState>
          </div>
        </div>
      )}

      {/* Tab 3: Registered Payees */}
      {activeTab === "payees" && (
        <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
          <QueryState
            isLoading={isPayeesLoading}
            isError={isPayeesError}
            error={payeesError as Error | null}
            isEmpty={!isPayeesLoading && !isPayeesError && payees.length === 0}
            loadingMessage={t("owner.payouts.loadingPayees")}
            emptyMessage={t("owner.payouts.emptyPayees")}
            onRetry={() => refetchPayees()}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                  <tr>
                    <th className="px-6 py-3.5">{t("owner.payouts.thPayeeName")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thType")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thPaymentDetails")}</th>
                    <th className="px-6 py-3.5">{t("owner.payouts.thVerification")}</th>
                    <th className="px-6 py-3.5 text-right">{t("owner.payouts.thActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink">
                  {payees.map((p) => (
                    <tr key={p.id} className="hover:bg-accent-tint/40 transition">
                      <td className="px-6 py-4 font-medium text-ink">
                        <div>{p.name}</div>
                        {p.phone && <div className="text-xs text-ink-muted">{p.phone}</div>}
                      </td>
                      <td className="px-6 py-4 capitalize text-ink-muted font-medium text-xs">
                        <span className="px-2 py-0.5 rounded-lg bg-bg border border-hairline">
                          {p.payee_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-ink-muted">
                        {p.account_number_last4 ? (
                          <div>
                            <span className="font-semibold text-ink">A/C: •••• {p.account_number_last4}</span>
                            {p.ifsc && <span> • IFSC: {p.ifsc}</span>}
                            {p.bank_name && <div>{p.bank_name}</div>}
                            {p.name_at_bank && (
                              <div className="t-micro text-accent mt-0.5">
                                Bank Registered Name: {p.name_at_bank}
                              </div>
                            )}
                          </div>
                        ) : p.upi_vpa ? (
                          <div>
                            <div className="font-mono text-ink">UPI: {p.upi_vpa}</div>
                            {p.name_at_bank && (
                              <div className="t-micro text-accent mt-0.5">
                                Bank Registered Name: {p.name_at_bank}
                              </div>
                            )}
                          </div>
                        ) : (
                          t("owner.payouts.noPaymentInfo")
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {p.verification_status === "provider_verified" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Bank Verified
                          </span>
                        ) : p.verification_status === "owner_attested" || (p.is_verified && !p.verification_status) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-tint text-accent border border-accent/20">
                            <UserCheck className="w-3.5 h-3.5" />
                            Owner Attested
                          </span>
                        ) : p.verification_status === "provider_failed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/10 text-danger">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Verification Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-tint text-warning">
                            <Clock className="w-3.5 h-3.5" />
                            {t("owner.payouts.pendingVerification")}
                          </span>
                        )}
                        {getCoolingOffRemainingHours(p.created_at) > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-tint text-warning font-medium t-micro border border-warning/30">
                              <Clock className="w-3 h-3" />
                              Cooling off ({getCoolingOffRemainingHours(p.created_at)}h left)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!p.is_verified && (
                          <button
                            onClick={() => handleVerifyPayee(p.id)}
                            disabled={verifyPayeeMutation.isPending}
                            className="px-3 py-1.5 rounded-xl border border-hairline text-ink hover:bg-bg font-medium text-xs transition"
                          >
                            {t("owner.payouts.verifyPayeeAction")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </div>
      )}

      {/* Modals */}
      {selectedBatchForApproval && (
        <BatchApprovalModal
          batch={selectedBatchForApproval}
          isOpen={Boolean(selectedBatchForApproval)}
          onClose={() => setSelectedBatchForApproval(null)}
          onApproved={() => refetchBatches()}
        />
      )}

      <CreatePayeeModal
        isOpen={isCreatePayeeOpen}
        onClose={() => setIsCreatePayeeOpen(false)}
        onCreated={() => refetchPayees()}
      />
    </div>
  );
};
