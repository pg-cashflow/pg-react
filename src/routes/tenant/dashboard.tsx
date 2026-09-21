import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyDues, getMyPayments, getMyProfile } from "@/api/tenant";
import { getTenantPoints } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QueryState } from "@/components/shared/QueryState";
import StreakFlame from "@/components/shared/StreakFlame";
import { countOverdueDues, displayDueStatus, formatDate, formatDueSentence, sumOutstandingFromDues } from "@/lib/utils";
import { Flame, ShieldCheck } from "lucide-react";

interface TenantDashboardProps {
  onNavigate: (tab: string) => void;
}

export const TenantDashboardView: React.FC<TenantDashboardProps> = ({ onNavigate }) => {
  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const duesQuery = useQuery({
    queryKey: QUERY_KEYS.tenantDues,
    queryFn: getMyDues,
    refetchInterval: 30000,
  });
  const paymentsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantPayments,
    queryFn: getMyPayments,
    refetchInterval: 30000,
  });
  const pointsQuery = useQuery({ queryKey: QUERY_KEYS.tenantPoints, queryFn: getTenantPoints });

  const profile = profileQuery.data;
  const dues = duesQuery.data ?? profile?.active_dues ?? [];
  const points = pointsQuery.data;
  const outstanding = sumOutstandingFromDues(dues);
  const overdueCount = countOverdueDues(dues);
  const current = [...dues]
    .filter((d) => d.status === "pending" || d.status === "partial")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
  const recent = [...dues].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).slice(0, 5);

  return (
    <QueryState
      isLoading={profileQuery.isLoading || duesQuery.isLoading || paymentsQuery.isLoading}
      isError={Boolean(profileQuery.isError || duesQuery.isError || paymentsQuery.isError)}
      error={(profileQuery.error || duesQuery.error || paymentsQuery.error) as Error | null}
      onRetry={() => {
        profileQuery.refetch();
        duesQuery.refetch();
        paymentsQuery.refetch();
        pointsQuery.refetch();
      }}
      isFetching={duesQuery.isFetching}
    >
      <div className="space-y-6 pb-4">
        <div>
          <div className="t-body-sm text-ink-muted">Passbook</div>
          <div className="t-h1">{profile?.name ?? "Tenant"}</div>
          {profile?.room_number && (
            <div className="t-body-sm text-ink-muted mt-1">
              <div>Room {profile.room_number}</div>
            </div>
          )}
        </div>

        <section className="rounded-[14px] bg-accent-tint border border-accent-tint overflow-hidden">
          <div className="flex items-center gap-4 px-5 pt-5">
            <StreakFlame streak={points?.on_time_months ?? 0} maxStreak={24} size={84} />
            <div className="min-w-0">
              <div className="t-caption text-accent font-semibold flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                On-time streak
              </div>
              <div className="t-h1 text-accent mt-0.5">{points?.on_time_months ?? 0} months on time</div>
              <div className="t-body-sm text-ink-muted mt-0.5 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                {points?.balance ?? 0} pts · passbook
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-3">
            <button
              type="button"
              onClick={() => onNavigate("dues")}
              className="w-full h-12 rounded-[10px] t-body font-semibold bg-accent text-white"
            >
              {current ? `Pay current rent (${formatDueSentence(current)})` : "Open passbook"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[14px] border border-hairline bg-surface p-4">
            <div className="t-caption text-ink-muted">Outstanding</div>
            <AmountBadge amount={outstanding} variant="warning" className="t-amount-lg block mt-1" />
          </div>
          <div className="rounded-[14px] border border-hairline bg-surface p-4">
            <div className="t-caption text-ink-muted">Overdue</div>
            <div className="t-display-num text-danger mt-1">{overdueCount}</div>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="t-h2">Your passbook</h2>
            <button type="button" onClick={() => onNavigate("dues")} className="t-caption text-accent font-semibold">
              History
            </button>
          </div>
          <div className="space-y-2.5">
            {recent.length === 0 && <p className="t-body-sm text-ink-muted">No dues yet.</p>}
            {recent.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onNavigate("dues")}
                className="w-full flex items-center gap-3 rounded-[14px] border border-hairline bg-surface px-4 py-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="t-h3">{d.kind}</div>
                  <div className="t-code text-ink-muted mt-0.5">{d.due_code}</div>
                  <div className="t-date text-ink-muted mt-0.5">{formatDate(d.due_date)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <AmountBadge amount={d.amount} />
                  <StatusPill status={displayDueStatus(d)} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </QueryState>
  );
};
