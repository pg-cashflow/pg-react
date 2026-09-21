import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReconciliation } from "@/api/payments";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { formatMatchedBy } from "@/lib/utils";
import { Scale } from "lucide-react";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const ReconciliationView: React.FC = () => {
  const [period, setPeriod] = useState(currentPeriod);
  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.reconciliation(period),
    queryFn: () => getReconciliation(period),
    refetchInterval: 30000,
  });

  const channels = summary ? Object.entries(summary.by_channel) : [];
  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-surface/60 border border-hairline rounded-2xl p-4 flex items-center gap-3 text-xs text-ink-muted">
        <Scale className="w-5 h-5 text-accent flex-shrink-0" />
        <span>
          Monthly collections digest for period {summary?.period ?? "current month"}. Outstanding
          reflects pending and partial rent dues.
        </span>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={!isLoading && !isError && !summary}
        loadingMessage="Loading reconciliation summary..."
        emptyMessage="No reconciliation data available"
        onRetry={() => refetch()}
      >
        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard label="Rent Collected" amount={summary.rent_collected_paise} variant="success" />
              <MetricCard label="Outstanding Rent" amount={summary.outstanding_paise} variant="warning" />
              <MetricCard label="Credits Held" amount={summary.credits_held_paise} />
              <MetricCard label="Deposits Held" amount={summary.deposits_held_paise} />
              <MetricCard label="Deposits Refunded" amount={summary.deposits_refunded_paise} />
            </div>

            <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-hairline">
                <h3 className="text-sm font-bold text-ink">Collected by Channel</h3>
              </div>
              {channels.length === 0 ? (
                <p className="p-6 text-xs text-ink-muted">No payments recorded this period.</p>
              ) : (
                <div className="divide-y divide-hairline">
                  {channels.map(([channel, amount]) => (
                    <div key={channel} className="px-6 py-4 flex items-center justify-between">
                      <span className="text-sm text-ink capitalize">{formatMatchedBy(channel)}</span>
                      <AmountBadge amount={amount} variant="success" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
};

function MetricCard({
  label,
  amount,
  variant = "default",
}: {
  label: string;
  amount: number;
  variant?: "default" | "success" | "warning";
}) {
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-5">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">{label}</p>
      <AmountBadge amount={amount} variant={variant} />
    </div>
  );
}
