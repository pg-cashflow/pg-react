import React, { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPaymentReport, getPaymentReports, rejectPaymentReport } from "@/api/reports";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n";

export const ReportsView: React.FC = () => {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const tenantsQuery = useQuery({ queryKey: QUERY_KEYS.tenants, queryFn: getTenants });
  const reportsQuery = useQuery({
    queryKey: QUERY_KEYS.paymentReports,
    queryFn: () => getPaymentReports("pending_review"),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentReports });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dues() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
  };

  const confirmMutation = useMutation({
    mutationFn: confirmPaymentReport,
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, n }: { id: string; n?: string }) => rejectPaymentReport(id, n),
    onSuccess: () => {
      invalidate();
      setRejectId(null);
      setNote("");
    },
  });

  const tenantMap = React.useMemo(
    () => new Map((tenantsQuery.data ?? []).map((t) => [t.id, t.name])),
    [tenantsQuery.data]
  );
  const rows = React.useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  // Clamp selected index when rows list changes
  React.useEffect(() => {
    if (rows.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= rows.length) {
      setSelectedIndex(Math.max(0, rows.length - 1));
    }
  }, [rows.length, selectedIndex]);

  // Smooth scroll active card into view
  React.useEffect(() => {
    if (cardRefs.current[selectedIndex]) {
      cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Global keyboard shortcuts for arrow navigation & Enter verification
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      if (isInput) {
        if (e.key === "Escape") {
          setRejectId(null);
          (target as HTMLElement).blur();
        }
        return;
      }

      if (rows.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, rows.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = rows[selectedIndex];
        if (selected && !confirmMutation.isPending) {
          const tenantName = tenantMap.get(selected.tenant_id) || t("owner.reports.tenantFallback");
          if (window.confirm(t("owner.reports.confirmTitle", { tenant: tenantName, utr: selected.upi_txn_id }))) {
            confirmMutation.mutate(selected.id);
          }
        }
      } else if (e.key === "r" || e.key === "R") {
        const selected = rows[selectedIndex];
        if (selected) {
          e.preventDefault();
          setRejectId(selected.id);
        }
      } else if (e.key === "Escape") {
        setRejectId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, selectedIndex, confirmMutation, tenantMap, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-ink-muted">{t("owner.reports.guidance")}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-xl text-xs text-ink-muted">
          <span className="font-semibold text-ink">{t("owner.reports.keyboardTitle")}</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">↓</kbd>
            <span>{t("owner.reports.keyNavigate")}</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">Enter</kbd>
            <span>{t("owner.reports.keyVerify")}</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">R</kbd>
            <span>{t("owner.reports.keyReject")}</span>
          </span>
        </div>
      </div>

      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
        <QueryState
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error as Error | null}
          isEmpty={!reportsQuery.isLoading && rows.length === 0}
          emptyMessage={t("owner.reports.empty")}
          onRetry={() => reportsQuery.refetch()}
        >
          <div ref={parentRef} className="divide-y divide-hairline max-h-[75vh] overflow-y-auto">
            {paddingTop > 0 && <div style={{ height: `${paddingTop}px` }} />}
            {virtualItems.map((virtualRow) => {
              const r = rows[virtualRow.index];
              if (!r) return null;
              const idx = virtualRow.index;
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={r.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                    if (el) rowVirtualizer.measureElement(el);
                  }}
                  tabIndex={0}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-4 space-y-2 transition cursor-pointer outline-none ${
                    isSelected
                      ? "bg-accent-tint/60 ring-2 ring-accent ring-inset"
                      : "hover:bg-accent-tint/30"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink">{tenantMap.get(r.tenant_id) || t("owner.reports.tenantFallback")}</p>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent text-white">
                            {t("owner.reports.activeHint")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-ink-muted">UTR: {r.upi_txn_id}</p>
                      <p className="text-xs text-ink-muted">{formatDate(r.created_at)}</p>
                      {r.has_image && <p className="text-xs text-ink-muted">{t("owner.reports.screenshotAttached")}</p>}
                    </div>
                    <AmountBadge amount={r.amount} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={confirmMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t("owner.reports.confirmMatchDue"))) confirmMutation.mutate(r.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>{t("common.confirm")}</span>
                      {isSelected && <span className="text-[10px] opacity-80 font-mono">(Enter)</span>}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejectId(r.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-surface border border-hairline text-danger text-sm hover:bg-danger-tint active:scale-95 transition"
                    >
                      {t("common.reject")}
                    </button>
                  </div>
                  {rejectId === r.id && (
                    <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={note}
                        autoFocus
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("owner.reports.rejectNotePlaceholder")}
                        className="flex-1 px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger/50"
                      />
                      <button
                        onClick={() => rejectMutation.mutate({ id: r.id, n: note })}
                        className="px-3 py-2 rounded-xl bg-danger text-white text-sm font-semibold active:scale-95 transition"
                      >
                        {t("common.send")}
                      </button>
                      <button
                        onClick={() => setRejectId(null)}
                        className="px-3 py-2 rounded-xl bg-surface border border-hairline text-ink text-sm"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {paddingBottom > 0 && <div style={{ height: `${paddingBottom}px` }} />}
          </div>
        </QueryState>
      </div>
    </div>
  );
};
