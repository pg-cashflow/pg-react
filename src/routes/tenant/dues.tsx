import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyDues, getMyProfile } from "@/api/tenant";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QueryState } from "@/components/shared/QueryState";
import { PayPanel } from "@/components/shared/PayPanel";
import { displayDueStatus, formatDate } from "@/lib/utils";

export const TenantDuesView: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const duesQuery = useQuery({
    queryKey: QUERY_KEYS.tenantDues,
    queryFn: getMyDues,
    refetchInterval: 30000,
  });

  const dues = duesQuery.data ?? [];
  const awaitingAllocation = profileQuery.data?.status === "pending_allocation";

  return (
    <div className="space-y-6">
      {awaitingAllocation && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm text-amber-200">
          Pay unlocks after your owner assigns room and rent.
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <QueryState
          isLoading={duesQuery.isLoading}
          isError={duesQuery.isError}
          error={duesQuery.error as Error | null}
          isEmpty={!duesQuery.isLoading && !duesQuery.isError && dues.length === 0}
          loadingMessage="Loading your dues..."
          emptyMessage={
            awaitingAllocation
              ? "No dues yet — waiting for room and rent assignment."
              : "No dues found."
          }
          onRetry={() => duesQuery.refetch()}
        >
          <div className="divide-y divide-slate-800">
            {dues.map((d) => {
              const canPay = d.status !== "paid" && d.status !== "waived" && d.amount > 0;
              return (
                <div key={d.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-slate-400">{d.due_code}</p>
                      <p className="text-xs text-slate-500">{formatDate(d.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AmountBadge amount={d.amount} />
                      <StatusPill status={displayDueStatus(d)} />
                    </div>
                  </div>
                  {canPay && (
                    <button
                      onClick={() => setOpenId(openId === d.id ? null : d.id)}
                      className="text-sm font-semibold text-primary"
                    >
                      {openId === d.id ? "Hide pay" : "Pay"}
                    </button>
                  )}
                  {openId === d.id && canPay && (
                    <PayPanel dueId={d.id} onDone={() => duesQuery.refetch()} />
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
