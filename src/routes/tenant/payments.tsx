import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyPayments } from "@/api/tenant";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate, formatMatchedBy } from "@/lib/utils";

export const TenantPaymentsView: React.FC = () => {
  const { data: payments = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.tenantPayments,
    queryFn: getMyPayments,
    refetchInterval: 30000,
  });

  const sorted = [...payments].sort(
    (a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime()
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={!isLoading && !isError && sorted.length === 0}
        loadingMessage="Loading payments..."
        emptyMessage="No payments yet."
        onRetry={() => refetch()}
      >
        <div className="divide-y divide-slate-800/60">
          {sorted.map((p) => (
            <div key={p.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">{formatMatchedBy(p.matched_by)}</p>
                <p className="text-xs text-slate-500">{formatDate(p.matched_at)}</p>
              </div>
              <AmountBadge amount={p.amount} variant="success" />
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
};
