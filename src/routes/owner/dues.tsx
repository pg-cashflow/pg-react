import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDues, markCashPaid, waiveDue, createDueToken, getDueQR, matchDue } from "@/api/dues";
import { getOwnerDuePay } from "@/api/pay";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QRModal } from "@/components/shared/QRModal";
import { QueryState } from "@/components/shared/QueryState";
import { displayDueStatus, downloadTextFile, formatDate, isOverdue, paiseToRupeeInput, rupeesToPaise } from "@/lib/utils";
import { getPayments } from "@/api/payments";
import { getProperties } from "@/api/properties";
import { buildLedgerCsv } from "@/lib/exportLedgerCsv";
import type { Due, Paise, PayIntent } from "@pg/types";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Slash, X, Loader2, IndianRupee, QrCode, Link2 } from "lucide-react";

export const DuesView: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  const [qrModal, setQrModal] = useState<{
    paymentUrl?: string;
    qrImageUrl?: string;
    waMe?: string;
    loading?: boolean;
  } | null>(null);
  const [payModalDue, setPayModalDue] = useState<Due | null>(null);
  const [waiveModalDue, setWaiveModalDue] = useState<Due | null>(null);
  const [matchDueRow, setMatchDueRow] = useState<Due | null>(null);
  const [matchUtr, setMatchUtr] = useState("");
  const [payAmountRupees, setPayAmountRupees] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const { data: tenants = [], isError: tenantsError, refetch: refetchTenants } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
  });

  const { data: properties = [] } = useQuery({ queryKey: QUERY_KEYS.properties, queryFn: getProperties });
  const { data: payments = [] } = useQuery({ queryKey: QUERY_KEYS.payments(), queryFn: () => getPayments() });

  const {
    data: dues = [],
    isLoading,
    isError: duesError,
    error: duesQueryError,
    refetch: refetchDues,
  } = useQuery({
    queryKey: QUERY_KEYS.dues(tenantFilter !== "all" ? tenantFilter : undefined),
    queryFn: () => getDues(tenantFilter !== "all" ? tenantFilter : undefined),
    refetchInterval: 30000,
  });

  const invalidateFinancialLedgers = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dues() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reconciliation() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
  };

  const payMutation = useMutation({
    mutationFn: ({ dueId, amount, note }: { dueId: string; amount: Paise; note?: string }) =>
      markCashPaid(dueId, amount, note),
    onSuccess: () => {
      invalidateFinancialLedgers();
      setPayModalDue(null);
      setPayAmountRupees("");
      setPayNotes("");
    },
    onError: (err: Error) => {
      setModalError(err.message || "Failed to record payment");
    },
  });

  const waiveMutation = useMutation({
    mutationFn: (dueId: string) => waiveDue(dueId),
    onSuccess: () => {
      invalidateFinancialLedgers();
      setWaiveModalDue(null);
    },
    onError: (err: Error) => {
      setModalError(err.message || "Failed to waive due");
    },
  });

  const matchMutation = useMutation({
    mutationFn: ({ dueId, amount, utr }: { dueId: string; amount: Paise; utr: string }) =>
      matchDue(dueId, amount, utr),
    onSuccess: () => {
      invalidateFinancialLedgers();
      setMatchDueRow(null);
      setMatchUtr("");
    },
    onError: (err: Error) => setModalError(err.message || "Match failed"),
  });

  const handleShowQR = async (due: Due) => {
    setQrModal({ loading: true });
    setModalError(null);
    try {
      const pay: PayIntent = await getOwnerDuePay(due.id);
      if (!pay.payable) {
        setQrModal(null);
        setModalError("This due is already paid or waived.");
        return;
      }
      if (pay.mode === "cashfree") {
        const tokenRes = await createDueToken(due.id);
        setQrModal({
          paymentUrl: tokenRes.url,
          waMe: tokenRes.wa_me,
          loading: false,
        });
        return;
      }
      const [tokenRes, qrBlob] = await Promise.all([createDueToken(due.id), getDueQR(due.id)]);
      setQrModal({
        paymentUrl: tokenRes.url,
        waMe: tokenRes.wa_me,
        qrImageUrl: URL.createObjectURL(qrBlob),
        loading: false,
      });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to load payment QR");
      setQrModal(null);
    }
  };

  const closeQrModal = () => {
    if (qrModal?.qrImageUrl) URL.revokeObjectURL(qrModal.qrImageUrl);
    setQrModal(null);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalDue) return;
    setModalError(null);
    const amountNum = rupeesToPaise(payAmountRupees);
    if (amountNum !== payModalDue.amount) {
      setModalError("Cash must equal the remaining due (no partial cash).");
      return;
    }
    if (!window.confirm("Record cash for the full remaining amount?")) return;
    payMutation.mutate({
      dueId: payModalDue.id,
      amount: amountNum,
      note: payNotes.trim() || undefined,
    });
  };

  const tenantMap = React.useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const filteredDues = dues.filter((d) => {
    if (statusFilter === "overdue") return isOverdue(d);
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>

        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="px-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="all">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              `pg-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
              buildLedgerCsv(filteredDues, tenants, properties[0], payments)
            )
          }
          className="h-10 px-4 rounded-[10px] border border-hairline bg-surface t-body font-semibold"
        >
          Export CSV
        </button>
        <p className="t-caption text-ink-muted w-full sm:w-auto">
          Filtered rows, including matched UTR when present.
        </p>
      </div>

      {modalError && !payModalDue && !waiveModalDue && (
        <div className="p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs">
          {modalError}
        </div>
      )}

      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
        <QueryState
          isLoading={isLoading}
          isError={duesError || tenantsError}
          error={(duesQueryError as Error | null) ?? null}
          isEmpty={!isLoading && !duesError && filteredDues.length === 0}
          loadingMessage="Loading dues..."
          emptyMessage="No dues match criteria. Dues are created automatically when tenants are onboarded and billing runs."
          onRetry={() => {
            refetchDues();
            refetchTenants();
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-hairline">
                <tr>
                  <th className="px-6 py-3.5">Tenant</th>
                  <th className="px-6 py-3.5">Due Code</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {filteredDues.map((d) => (
                  <tr key={d.id} className="hover:bg-accent-tint transition">
                    <td className="px-6 py-4 font-medium text-ink">
                      {tenantMap.get(d.tenant_id) || "Tenant"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-ink-muted">
                      <Link to="/owner/events" className="underline decoration-hairline hover:text-accent">
                        {d.due_code}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      <AmountBadge amount={d.amount} />
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-muted">{formatDate(d.due_date)}</td>
                    <td className="px-6 py-4">
                      <StatusPill status={displayDueStatus(d)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {d.status !== "paid" && d.status !== "waived" && (
                          <button
                            onClick={() => handleShowQR(d)}
                            title="Show Payment QR / Link"
                            className="p-1.5 rounded-lg bg-surface hover:bg-surface text-ink hover:text-white transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        {d.status !== "paid" && d.status !== "waived" && (
                          <button
                            onClick={() => {
                              setPayModalDue(d);
                              setPayAmountRupees(paiseToRupeeInput(d.amount));
                              setPayNotes("");
                              setModalError(null);
                            }}
                            title="Record Cash Payment"
                            className="p-1.5 rounded-lg bg-success-tint hover:bg-success/20 text-success transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {d.status !== "paid" && d.status !== "waived" && (
                          <button
                            onClick={() => {
                              setMatchDueRow(d);
                              setMatchUtr("");
                              setModalError(null);
                            }}
                            title="Match UTR"
                            className="p-1.5 rounded-lg bg-surface hover:bg-surface text-ink transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                        )}
                        {d.status !== "paid" && d.status !== "waived" && (
                          <button
                            onClick={() => {
                              setWaiveModalDue(d);
                              setModalError(null);
                            }}
                            title="Waive Due"
                            className="p-1.5 rounded-lg bg-surface hover:bg-danger-tint text-ink-muted hover:text-danger transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Slash className="w-4 h-4" />
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

      <QRModal
        isOpen={!!qrModal}
        paymentUrl={qrModal?.paymentUrl}
        qrImageUrl={qrModal?.qrImageUrl}
        waMe={qrModal?.waMe}
        isLoading={qrModal?.loading}
        onClose={closeQrModal}
      />

      {payModalDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setPayModalDue(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-accent-tint transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-ink mb-4">Record Cash Payment</h3>
            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs">
                {modalError}
              </div>
            )}
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Cash Amount (₹) — locked to remaining due (all-or-nothing)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="number"
                    readOnly
                    value={payAmountRupees}
                    className="w-full pl-9 pr-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPayModalDue(null)} className="px-4 py-2 text-ink-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-success text-white font-semibold text-sm disabled:opacity-50"
                >
                  {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {waiveModalDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setWaiveModalDue(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-accent-tint transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-ink mb-4">Waive Due</h3>
            <p className="text-xs text-ink-muted mb-4">
              Waive <AmountBadge amount={waiveModalDue.amount} /> for{" "}
              {tenantMap.get(waiveModalDue.tenant_id)}?
            </p>
            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs">
                {modalError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setWaiveModalDue(null)} className="px-4 py-2 text-ink-muted">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Waive this due?")) waiveMutation.mutate(waiveModalDue.id);
                }}
                disabled={waiveMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-danger text-white font-semibold text-sm disabled:opacity-50"
              >
                {waiveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Waive Due
              </button>
            </div>
          </div>
        </div>
      )}
      {matchDueRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!matchUtr.trim()) {
                setModalError("UTR is required");
                return;
              }
              if (!window.confirm("Match this UTR to the due?")) return;
              matchMutation.mutate({
                dueId: matchDueRow.id,
                amount: matchDueRow.amount,
                utr: matchUtr.trim(),
              });
            }}
            className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 space-y-3 relative"
          >
            <button type="button" onClick={() => setMatchDueRow(null)} className="absolute top-4 right-4 text-ink-muted">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-ink">Match UTR</h3>
            {modalError && <p className="text-xs text-danger">{modalError}</p>}
            <p className="text-xs text-ink-muted">Amount {paiseToRupeeInput(matchDueRow.amount)} (remaining)</p>
            <input
              value={matchUtr}
              onChange={(e) => setMatchUtr(e.target.value)}
              placeholder="UPI transaction ID"
              className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMatchDueRow(null)} className="px-3 py-2 text-ink-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={matchMutation.isPending}
                className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-50"
              >
                Match
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
