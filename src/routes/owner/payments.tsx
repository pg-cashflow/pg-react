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
  const [searchTerm, setSearchTerm] = useState("");

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
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by tenant, UPI ref, or note..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
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
              <thead className="bg-slate-800/50 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Tenant</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Matched By</th>
                  <th className="px-6 py-3.5">UPI Ref</th>
                  <th className="px-6 py-3.5">Matched At</th>
                  <th className="px-6 py-3.5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {tenantMap.get(p.tenant_id) || "Tenant"}
                    </td>
                    <td className="px-6 py-4">
                      <AmountBadge amount={p.amount} variant="success" />
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {formatMatchedBy(p.matched_by)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.upi_txn_id || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{formatDate(p.matched_at)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{p.raw_note || "—"}</td>
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
