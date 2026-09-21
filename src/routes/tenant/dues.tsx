import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyDues, getMyProfile } from "@/api/tenant";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QueryState } from "@/components/shared/QueryState";
import { PayPanel } from "@/components/shared/PayPanel";
import { DuePaymentTimeline } from "@/components/shared/DuePaymentTimeline";
import { displayDueStatus, formatDate } from "@/lib/utils";

export const TenantDuesView: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [utrIds, setUtrIds] = useState<Record<string, boolean>>({});

  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const duesQuery = useQuery({
    queryKey: QUERY_KEYS.tenantDues,
    queryFn: getMyDues,
    refetchInterval: 30000,
  });

  const dues = duesQuery.data ?? [];
  const awaitingAllocation = profileQuery.data?.status === "pending_allocation";

  return (
    <div className="space-y-4">
      {awaitingAllocation && (
        <div className="bg-accent-tint border border-accent/20 rounded-[14px] p-4 t-body-sm text-accent">
          Pay unlocks after your owner assigns room and rent.
        </div>
      )}
      <QueryState
        isLoading={duesQuery.isLoading}
        isError={duesQuery.isError}
        error={duesQuery.error as Error | null}
        isEmpty={!duesQuery.isLoading && !duesQuery.isError && dues.length === 0}
        emptyMessage={awaitingAllocation ? "No dues yet — waiting for room assignment." : "No dues on your passbook."}
        onRetry={() => duesQuery.refetch()}
        isFetching={duesQuery.isFetching}
      >
        <div className="space-y-2.5">
          {dues.map((d) => {
            const canPay = d.status !== "paid" && d.status !== "waived" && d.amount > 0;
            return (
              <div key={d.id} className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="t-code text-ink-muted">{d.due_code}</p>
                    <p className="t-date text-ink-muted">{formatDate(d.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AmountBadge amount={d.amount} />
                    <StatusPill status={displayDueStatus(d)} />
                  </div>
                </div>
                <DuePaymentTimeline due={d} utrSubmitted={utrIds[d.id]} />
                {canPay && (
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === d.id ? null : d.id)}
                    className={`w-full min-h-11 rounded-[10px] t-body font-semibold ${
                      openId === d.id
                        ? "border border-hairline text-ink"
                        : "bg-accent text-white"
                    }`}
                  >
                    {openId === d.id ? "Hide pay" : "Pay"}
                  </button>
                )}
                {openId === d.id && canPay && (
                  <PayPanel
                    dueId={d.id}
                    onDone={() => {
                      setUtrIds((s) => ({ ...s, [d.id]: true }));
                      duesQuery.refetch();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
};
