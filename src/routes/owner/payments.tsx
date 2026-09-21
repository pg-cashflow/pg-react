import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPayments } from "@/api/payments";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate, formatMatchedBy } from "@/lib/utils";
import { Search, CheckCircle2 } from "lucide-react";

export const PaymentsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-ink-muted text-xs font-semibold uppercase border-b border-hairline">
                <tr>
                  <th className="px-6 py-3.5">Tenant</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Matched By</th>
                  <th className="px-6 py-3.5">UPI Ref</th>
                  <th className="px-6 py-3.5">Matched At</th>
                  <th className="px-6 py-3.5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-accent-tint transition">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>
    </div>
  );
};
