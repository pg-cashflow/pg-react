import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getDues, markCashPaid, waiveDue, createDueToken, getDueQR, matchDue } from "@/api/dues";
import { getOwnerDuePay } from "@/api/pay";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QRModal } from "@/components/shared/QRModal";
import { QueryState } from "@/components/shared/QueryState";
import { displayDueStatus, downloadTextFile, formatDate, formatDaysOverdue, getDaysOverdue, isOverdue, paiseToRupeeInput, rupeesToPaise } from "@/lib/utils";
import { useLocale, type MessageKey } from "@/i18n";
import { getPayments } from "@/api/payments";
import { getProperties } from "@/api/properties";
import { buildLedgerCsv } from "@/lib/exportLedgerCsv";
import type { Due, Paise, PayIntent } from "@pg/types";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Slash, X, Loader2, IndianRupee, QrCode, Link2 } from "lucide-react";

interface DueTableRowProps {
  due: Due;
  isSelected: boolean;
  tenantName: string;
  locale: string;
  t: (key: MessageKey, values?: Record<string, any>) => string;
  onSelect: () => void;
  onShowQR: (due: Due) => void;
  onOpenPay: (due: Due) => void;
  onOpenMatch: (due: Due) => void;
  onOpenWaive: (due: Due) => void;
  rowRef: (el: HTMLTableRowElement | null) => void;
}

const DueTableRow = React.memo<DueTableRowProps>(function DueTableRow({
  due,
  isSelected,
  tenantName,
  locale,
  t,
  onSelect,
  onShowQR,
  onOpenPay,
  onOpenMatch,
  onOpenWaive,
  rowRef,
}) {
  const isPayable = due.status !== "paid" && due.status !== "waived";

  return (
    <tr
      ref={rowRef}
      onClick={onSelect}
      tabIndex={0}
      className={`transition cursor-pointer outline-none ${
        isSelected
          ? "bg-accent-tint/60 ring-2 ring-accent ring-inset"
          : "hover:bg-accent-tint/30"
      }`}
    >
      <td className="px-6 py-4 font-medium text-ink">
        <div className="flex items-center gap-2">
          <span>{tenantName}</span>
          {isSelected && (
            <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-accent text-white">
              Active
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 font-mono text-xs text-ink-muted">
        <Link to="/owner/events" className="underline decoration-hairline hover:text-accent">
          {due.due_code}
        </Link>
      </td>
      <td className="px-6 py-4 font-semibold">
        <AmountBadge amount={due.amount} />
      </td>
      <td className="px-6 py-4 text-xs text-ink-muted">
        <div>{formatDate(due.due_date, locale)}</div>
        {isOverdue(due) && (
          <div className="text-danger font-medium text-[11px] mt-0.5">
            {formatDaysOverdue(getDaysOverdue(due.due_date), t)}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <StatusPill status={displayDueStatus(due)} />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {isSelected && isPayable && (
            <span className="hidden sm:inline-flex items-center text-[11px] font-mono text-accent bg-surface border border-accent/40 px-1.5 py-0.5 rounded shadow-xs font-semibold mr-1">
              {t("owner.dues.keyEnterToPay")}
            </span>
          )}
          {isPayable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowQR(due);
              }}
              title={t("owner.dues.keyQR")}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface text-ink hover:text-white transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          {isPayable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPay(due);
              }}
              title={t("owner.dues.recordCashTitle")}
              className="p-1.5 rounded-lg bg-success-tint hover:bg-success/20 text-success transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {isPayable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMatch(due);
              }}
              title={t("owner.dues.matchTitle")}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface text-ink transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}
          {isPayable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenWaive(due);
              }}
              title={t("owner.dues.waiveTitle")}
              className="p-1.5 rounded-lg bg-surface hover:bg-danger-tint text-ink-muted hover:text-danger transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <Slash className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

export const DuesView: React.FC = () => {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  const [qrModal, setQrModal] = useState<{
    paymentUrl?: string;
    qrImageUrl?: string;
    waMe?: string;
    loading?: boolean;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (qrModal?.qrImageUrl) URL.revokeObjectURL(qrModal.qrImageUrl);
    };
  }, [qrModal?.qrImageUrl]);
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

  const handleShowQR = useCallback(async (due: Due) => {
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
  }, []);

  const closeQrModal = useCallback(() => {
    setQrModal((prev) => {
      if (prev?.qrImageUrl) URL.revokeObjectURL(prev.qrImageUrl);
      return null;
    });
  }, []);

  const handleOpenPay = useCallback((due: Due) => {
    setPayModalDue(due);
    setPayAmountRupees(paiseToRupeeInput(due.amount));
    setPayNotes("");
    setModalError(null);
  }, []);

  const handleOpenMatch = useCallback((due: Due) => {
    setMatchDueRow(due);
    setMatchUtr("");
    setModalError(null);
  }, []);

  const handleOpenWaive = useCallback((due: Due) => {
    setWaiveModalDue(due);
    setModalError(null);
  }, []);

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

  const tenantMap = useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const tableRowRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const filteredDues = useMemo(() => {
    return dues.filter((d) => {
      if (statusFilter === "overdue") return isOverdue(d);
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [dues, statusFilter]);

  const rowVirtualizer = useVirtualizer({
    count: filteredDues.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  // Clamp selected row index when filtered dues change
  React.useEffect(() => {
    if (filteredDues.length === 0) {
      setSelectedRowIndex(0);
    } else if (selectedRowIndex >= filteredDues.length) {
      setSelectedRowIndex(Math.max(0, filteredDues.length - 1));
    }
  }, [filteredDues.length, selectedRowIndex]);

  // Scroll active row into view
  React.useEffect(() => {
    if (tableRowRefs.current[selectedRowIndex]) {
      tableRowRefs.current[selectedRowIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedRowIndex]);

  // Global keyboard shortcuts for arrow navigation & Enter verification
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      
      const isModalOpen = payModalDue || waiveModalDue || matchDueRow || qrModal;
      if (isModalOpen || isInput) {
        if (e.key === "Escape") {
          setPayModalDue(null);
          setWaiveModalDue(null);
          setMatchDueRow(null);
          if (qrModal?.qrImageUrl) URL.revokeObjectURL(qrModal.qrImageUrl);
          setQrModal(null);
        }
        return;
      }

      if (filteredDues.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelectedRowIndex((prev) => Math.min(prev + 1, filteredDues.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedDue = filteredDues[selectedRowIndex];
        if (selectedDue && selectedDue.status !== "paid" && selectedDue.status !== "waived") {
          setPayModalDue(selectedDue);
          setPayAmountRupees(paiseToRupeeInput(selectedDue.amount));
          setPayNotes("");
          setModalError(null);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const selectedDue = filteredDues[selectedRowIndex];
        if (selectedDue && selectedDue.status !== "paid" && selectedDue.status !== "waived") {
          setMatchDueRow(selectedDue);
          setMatchUtr("");
          setModalError(null);
        }
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        const selectedDue = filteredDues[selectedRowIndex];
        if (selectedDue) {
          handleShowQR(selectedDue);
        }
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        const selectedDue = filteredDues[selectedRowIndex];
        if (selectedDue && selectedDue.status !== "paid" && selectedDue.status !== "waived") {
          setWaiveModalDue(selectedDue);
          setModalError(null);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredDues, selectedRowIndex, payModalDue, waiveModalDue, matchDueRow, qrModal, handleShowQR]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="all">{t("owner.dues.filterAllStatuses")}</option>
            <option value="pending">{t("owner.dues.filterPending")}</option>
            <option value="overdue">{t("owner.dues.filterOverdue")}</option>
            <option value="partial">{t("owner.dues.filterPartial")}</option>
            <option value="paid">{t("owner.dues.filterPaid")}</option>
            <option value="waived">{t("owner.dues.filterWaived")}</option>
          </select>

          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="px-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="all">{t("owner.dues.filterAllTenants")}</option>
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
            className="h-10 px-4 rounded-[10px] border border-hairline bg-surface t-body font-semibold hover:bg-surface/80 active:scale-95 transition"
          >
            {t("owner.dues.exportCsv")}
          </button>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-xl text-xs text-ink-muted">
          <span className="font-semibold text-ink">{t("owner.reports.keyboardTitle")}</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">↓</kbd>
            <span>{t("owner.dues.keyNavigate")}</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">Enter</kbd>
            <span>{t("owner.dues.keyVerifyCash")}</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">M</kbd>
            <span>{t("owner.dues.keyMatch")}</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">Q</kbd>
            <span>{t("owner.dues.keyQR")}</span>
          </span>
        </div>
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
          loadingMessage={t("owner.dues.loadingDues")}
          emptyMessage={t("owner.dues.emptyDues")}
          onRetry={() => {
            refetchDues();
            refetchTenants();
          }}
        >
          <div ref={parentRef} className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-hairline sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3.5">{t("owner.dues.thTenant")}</th>
                  <th className="px-6 py-3.5">{t("owner.dues.thDueCode")}</th>
                  <th className="px-6 py-3.5">{t("owner.dues.thAmount")}</th>
                  <th className="px-6 py-3.5">{t("owner.dues.thDueDate")}</th>
                  <th className="px-6 py-3.5">{t("owner.dues.thStatus")}</th>
                  <th className="px-6 py-3.5 text-right">{t("owner.dues.thActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} colSpan={6} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const d = filteredDues[virtualRow.index];
                  if (!d) return null;
                  return (
                    <DueTableRow
                      key={d.id}
                      due={d}
                      isSelected={selectedRowIndex === virtualRow.index}
                      tenantName={tenantMap.get(d.tenant_id) || "Student / Tenant"}
                      locale={locale}
                      t={t}
                      onSelect={() => setSelectedRowIndex(virtualRow.index)}
                      onShowQR={handleShowQR}
                      onOpenPay={handleOpenPay}
                      onOpenMatch={handleOpenMatch}
                      onOpenWaive={handleOpenWaive}
                      rowRef={(el) => {
                        tableRowRefs.current[virtualRow.index] = el;
                        if (el) rowVirtualizer.measureElement(el);
                      }}
                    />
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} colSpan={6} />
                  </tr>
                )}
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
            <h3 className="text-lg font-bold text-ink mb-4">{t("owner.dues.recordCashTitle")}</h3>
            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs">
                {modalError}
              </div>
            )}
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  {t("owner.dues.cashAmountLabel")}
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
                <label className="block text-xs font-medium text-ink mb-1">{t("owner.dues.noteOptional")}</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPayModalDue(null)} className="px-4 py-2 text-ink-muted">
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-success text-white font-semibold text-sm disabled:opacity-50"
                >
                  {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("owner.dues.confirmPayment")}
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
            <h3 className="text-lg font-bold text-ink mb-4">{t("owner.dues.waiveTitle")}</h3>
            <div className="text-xs text-ink-muted mb-4 flex items-center gap-1.5 flex-wrap">
              <span>{t("owner.dues.waiveTitle")}</span>
              <AmountBadge amount={waiveModalDue.amount} />
              <span>{tenantMap.get(waiveModalDue.tenant_id)}?</span>
            </div>
            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs">
                {modalError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setWaiveModalDue(null)} className="px-4 py-2 text-ink-muted">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(t("owner.dues.waiveConfirm"))) waiveMutation.mutate(waiveModalDue.id);
                }}
                disabled={waiveMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-danger text-white font-semibold text-sm disabled:opacity-50"
              >
                {waiveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("owner.dues.waiveTitle")}
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
                setModalError(t("owner.dues.utrRequired"));
                return;
              }
              if (!window.confirm(t("owner.dues.matchConfirm"))) return;
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
            <h3 className="text-lg font-bold text-ink">{t("owner.dues.matchTitle")}</h3>
            {modalError && <p className="text-xs text-danger">{modalError}</p>}
            <p className="text-xs text-ink-muted">{t("owner.dues.thAmount")}: ₹{paiseToRupeeInput(matchDueRow.amount)}</p>
            <input
              value={matchUtr}
              onChange={(e) => setMatchUtr(e.target.value)}
              placeholder={t("owner.dues.upiTxnPlaceholder")}
              className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMatchDueRow(null)} className="px-3 py-2 text-ink-muted">
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={matchMutation.isPending}
                className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-sm disabled:opacity-50"
              >
                {t("owner.dues.keyMatch")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
