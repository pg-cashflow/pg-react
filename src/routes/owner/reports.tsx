import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPaymentReport, getPaymentReports, rejectPaymentReport } from "@/api/reports";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { formatDate } from "@/lib/utils";

export const ReportsView: React.FC = () => {
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

  const tenantMap = new Map((tenantsQuery.data ?? []).map((t) => [t.id, t.name]));
  const rows = reportsQuery.data ?? [];

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
          const tenantName = tenantMap.get(selected.tenant_id) || "Student";
          if (window.confirm(`Confirm payment report for ${tenantName} (UTR: ${selected.upi_txn_id}) and verify payment status?`)) {
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
  }, [rows, selectedIndex, confirmMutation, tenantMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-ink-muted">Confirm a UTR only after you see it in the bank. Cash is a separate action on Dues.</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-xl text-xs text-ink-muted">
          <span className="font-semibold text-ink">Keyboard:</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">↓</kbd>
            <span>Navigate</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">Enter</kbd>
            <span>Verify</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-hairline bg-bg font-mono font-semibold text-ink">R</kbd>
            <span>Reject</span>
          </span>
        </div>
      </div>

      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
        <QueryState
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error as Error | null}
          isEmpty={!reportsQuery.isLoading && rows.length === 0}
          emptyMessage="No UTR reports waiting."
          onRetry={() => reportsQuery.refetch()}
        >
          <div className="divide-y divide-hairline">
            {rows.map((r, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={r.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
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
                        <p className="font-medium text-ink">{tenantMap.get(r.tenant_id) || "Student / Tenant"}</p>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent text-white">
                            Active · Press Enter to verify
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-ink-muted">UTR: {r.upi_txn_id}</p>
                      <p className="text-xs text-ink-muted">{formatDate(r.created_at)}</p>
                      {r.has_image && <p className="text-xs text-ink-muted">Screenshot attached</p>}
                    </div>
                    <AmountBadge amount={r.amount} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={confirmMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Confirm this UTR and match the due?")) confirmMutation.mutate(r.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>Confirm</span>
                      {isSelected && <span className="text-[10px] opacity-80 font-mono">(Enter)</span>}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejectId(r.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-surface border border-hairline text-danger text-sm hover:bg-danger-tint active:scale-95 transition"
                    >
                      Reject
                    </button>
                  </div>
                  {rejectId === r.id && (
                    <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={note}
                        autoFocus
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Reject note (optional)"
                        className="flex-1 px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger/50"
                      />
                      <button
                        onClick={() => rejectMutation.mutate({ id: r.id, n: note })}
                        className="px-3 py-2 rounded-xl bg-danger text-white text-sm font-semibold active:scale-95 transition"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => setRejectId(null)}
                        className="px-3 py-2 rounded-xl bg-surface border border-hairline text-ink text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </QueryState>
      </div>
    </div>
  );
};
