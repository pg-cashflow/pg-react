import React, { useState } from "react";
import {
  Send,
  Plus,
  FileCheck2,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  UserCheck,
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
import type { PayoutBatch } from "@pg/types";

export const PayoutsView: React.FC = () => {
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
            Money Out & Payroll
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Manage staff salaries, vendor expenses, and deposit refunds with dual-control step-up authorization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCreatePayeeOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-hairline text-ink hover:bg-surface font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Payee
          </button>
          {unbatchedItems.length > 0 && (
            <button
              onClick={handleCreateBatch}
              disabled={createBatchMutation.isPending}
              className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 flex items-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Generate Batch ({unbatchedItems.length})
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
          Payout Batches
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
          Pending Items
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
          Registered Payees
          {payees.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-xs bg-bg text-ink-muted">
              {payees.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Payout Batches */}
      {activeTab === "batches" && (
        <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
          <QueryState
            isLoading={isBatchesLoading}
            isError={isBatchesError}
            error={batchesError as Error | null}
            isEmpty={!isBatchesLoading && !isBatchesError && batches.length === 0}
            loadingMessage="Loading payout batches..."
            emptyMessage="No payout batches created yet. Generate one from pending items."
            onRetry={() => refetchBatches()}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                  <tr>
                    <th className="px-6 py-3.5">Batch Details</th>
                    <th className="px-6 py-3.5">Count</th>
                    <th className="px-6 py-3.5">Total Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
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
                              : b.status === "failed"
                              ? "bg-danger/10 text-danger"
                              : "bg-bg text-ink-muted border border-hairline"
                          }`}
                        >
                          {b.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {b.status === "approved" && <FileCheck2 className="w-3.5 h-3.5" />}
                          {b.status === "processing" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          {b.status.replace("_", " ")}
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
                              className="px-3 py-1.5 rounded-xl bg-accent text-white font-semibold text-xs hover:opacity-90 transition shadow-sm"
                            >
                              Review & Approve
                            </button>
                          )}

                          {b.status === "approved" && (
                            <>
                              <button
                                onClick={() => handleDispatchBatch(b.id)}
                                disabled={dispatchBatchMutation.isPending}
                                className="px-3 py-1.5 rounded-xl bg-success text-white font-semibold text-xs hover:opacity-90 transition shadow-sm disabled:opacity-50"
                              >
                                {dispatchBatchMutation.isPending ? "Dispatching..." : "Dispatch Transfer"}
                              </button>
                              <button
                                onClick={() => handleExportCSV(b)}
                                disabled={exportingBatchId === b.id}
                                className="px-3 py-1.5 rounded-xl border border-hairline text-ink hover:bg-bg font-medium text-xs inline-flex items-center gap-1.5 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {exportingBatchId === b.id ? "Exporting..." : "CSV"}
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
                              Export
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
      )}

      {/* Tab 2: Pending Unbatched Items */}
      {activeTab === "unbatched" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-warning-tint/30 border border-warning/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">
                  {unbatchedItems.length} pending items ready for batching
                </p>
                <p className="text-xs text-ink-muted">
                  Total disbursement volume: {formatPaise(unbatchedTotalPaise)}
                </p>
              </div>
            </div>
            {unbatchedItems.length > 0 && (
              <button
                onClick={handleCreateBatch}
                disabled={createBatchMutation.isPending}
                className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition shadow-sm"
              >
                Create Batch
              </button>
            )}
          </div>

          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <QueryState
              isLoading={isUnbatchedLoading}
              isError={isUnbatchedError}
              error={unbatchedError as Error | null}
              isEmpty={!isUnbatchedLoading && !isUnbatchedError && unbatchedItems.length === 0}
              loadingMessage="Loading pending payout items..."
              emptyMessage="No pending payout items to batch."
              onRetry={() => refetchUnbatched()}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                    <tr>
                      <th className="px-6 py-3.5">Payee</th>
                      <th className="px-6 py-3.5">Purpose / Label</th>
                      <th className="px-6 py-3.5">Reference Number</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Date Created</th>
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
                              <span className="text-xs text-ink-muted capitalize">
                                {payee.payee_type.replace("_", " ")}
                              </span>
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
            loadingMessage="Loading registered payees..."
            emptyMessage="No payees registered yet. Add staff or vendor bank accounts."
            onRetry={() => refetchPayees()}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                  <tr>
                    <th className="px-6 py-3.5">Payee Name</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Payment Details</th>
                    <th className="px-6 py-3.5">Verification</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
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
                          </div>
                        ) : p.upi_vpa ? (
                          <div className="font-mono text-ink">UPI: {p.upi_vpa}</div>
                        ) : (
                          "No payment info"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {p.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-tint text-warning">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Verification
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!p.is_verified && (
                          <button
                            onClick={() => handleVerifyPayee(p.id)}
                            disabled={verifyPayeeMutation.isPending}
                            className="px-3 py-1.5 rounded-xl border border-hairline text-ink hover:bg-bg font-medium text-xs transition"
                          >
                            Verify Payee
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
