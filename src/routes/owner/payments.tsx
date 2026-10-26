import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPayments } from "@/api/payments";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate, formatMatchedBy } from "@/lib/utils";
import { Search, CheckCircle2, RotateCcw } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RefundModal } from "@/components/owner/RefundModal";
import type { Payment } from "@pg/types";

export const PaymentsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<Payment | null>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
  });

  const { data: payments = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.payments(),
    queryFn: () => getPayments(),
    refetchInterval: 30000,
  });

  const tenantMap = React.useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const filteredPayments = payments.filter((p) => {
    const tenantName = tenantMap.get(p.tenant_id) || "";
    return (
      tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.upi_txn_id && p.upi_txn_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.raw_note && p.raw_note.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredPayments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 57,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search by tenant, UPI ref, or note..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface border border-hairline rounded-xl text-ink text-sm"
        />
      </div>

      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error as Error | null}
          isEmpty={!isLoading && !isError && filteredPayments.length === 0}
          loadingMessage="Loading payments..."
          emptyMessage="No payments recorded"
          onRetry={() => refetch()}
        >
          <div ref={parentRef} className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3.5">Tenant</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Matched By</th>
                  <th className="px-6 py-3.5">UPI Ref</th>
                  <th className="px-6 py-3.5">Matched At</th>
                  <th className="px-6 py-3.5">Note</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} colSpan={7} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const p = filteredPayments[virtualRow.index];
                  if (!p) return null;
                  const isCashfree = p.matched_by === "cashfree";
                  return (
                    <tr
                      key={p.id}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="hover:bg-accent-tint transition"
                    >
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        {tenantMap.get(p.tenant_id) || "Tenant"}
                      </td>
                      <td className="px-6 py-4">
                        <AmountBadge amount={p.amount} variant="success" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs uppercase bg-surface text-ink border border-hairline">
                          {formatMatchedBy(p.matched_by)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-ink-muted">{p.upi_txn_id || "—"}</td>
                      <td className="px-6 py-4 text-xs text-ink-muted">{formatDate(p.matched_at)}</td>
                      <td className="px-6 py-4 text-xs text-ink-muted">{p.raw_note || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        {isCashfree ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentForRefund(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-hairline rounded-lg text-xs font-medium text-ink hover:text-danger hover:border-danger/30 transition shadow-xs"
                            title="Initiate gateway refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Refund
                          </button>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} colSpan={7} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>

      <RefundModal
        isOpen={Boolean(selectedPaymentForRefund)}
        payment={selectedPaymentForRefund}
        tenantName={selectedPaymentForRefund ? tenantMap.get(selectedPaymentForRefund.tenant_id) || "Tenant" : ""}
        onClose={() => setSelectedPaymentForRefund(null)}
        onRefundComplete={() => {
          refetch();
        }}
      />
    </div>
  );
};
