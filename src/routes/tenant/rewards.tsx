import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTenantPoints, getTenantRewards, redeemTenantReward } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import {
  Award,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Ticket,
  DollarSign,
  ShieldAlert,
  Loader2,
  Gift,
} from "lucide-react";
import type { RewardsCatalogItem, Redemption } from "@pg/types";

export const TenantRewardsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [successRedemption, setSuccessRedemption] = useState<{
    item: RewardsCatalogItem;
    redemption: Redemption;
  } | null>(null);

  const pointsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantPoints,
    queryFn: getTenantPoints,
  });

  const rewardsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantRewards,
    queryFn: getTenantRewards,
  });

  const redeemMutation = useMutation({
    mutationFn: (item: RewardsCatalogItem) =>
      redeemTenantReward(item.id).then((res) => ({ item, redemption: res.redemption })),
    onSuccess: (data) => {
      setSuccessRedemption(data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantPoints });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantRewards });
    },
  });

  const points = pointsQuery.data;
  const balance = points?.balance ?? 0;
  const streak = points?.on_time_months ?? 0;
  const freezes = points?.freezes_left ?? 0;
  const expiring = points?.expiring_soon ?? 0;

  return (
    <div className="space-y-6">
      {/* Points & Streak Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-accent-tint via-surface to-surface border border-accent/20 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-tint border border-accent/30 text-accent text-xs font-medium">
              <Award className="w-3.5 h-3.5 text-accent" />
              Resident Rewards Club
            </div>
            <h1 className="t-h1 tracking-tight">Perks & Point Store</h1>
            <p className="text-xs text-ink-muted max-w-md leading-relaxed">
              Earn points for on-time rent, kitchen RSVPs, and maintaining clean rooms. Redeem for rent discounts, meal upgrades, and amenities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Balance pill */}
            <div className="bg-surface/80 border border-hairline/80 rounded-2xl px-4 py-3 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">Balance</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="t-display-num text-success">{balance}</span>
                <span className="text-xs font-semibold text-success">pts</span>
              </div>
            </div>

            {/* Streak flame */}
            <div className="bg-surface/80 border border-hairline/80 rounded-2xl px-4 py-3 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">On-Time Streak</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Flame className="w-5 h-5 text-accent fill-accent animate-pulse" />
                <span className="t-display-num text-ink">{streak}</span>
                <span className="text-xs font-semibold text-ink-muted">mo</span>
              </div>
            </div>

            {/* Freeze Tokens */}
            <div className="bg-surface/80 border border-hairline/80 rounded-2xl px-4 py-3 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">Freeze Tokens</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="t-display-num text-accent">{freezes}</span>
                <span className="t-caption font-semibold text-accent">left</span>
              </div>
            </div>
          </div>
        </div>

        {expiring > 0 && (
          <div className="mt-5 p-3 rounded-2xl bg-accent-tint border border-accent/20 text-accent text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent flex-shrink-0" />
            <span>
              <strong>{expiring} points</strong> will expire soon. Redeem before the 180-day cycle ends!
            </span>
          </div>
        )}
      </div>

      {/* Rewards Catalog Grid */}
      <QueryState
        isLoading={rewardsQuery.isLoading}
        isError={rewardsQuery.isError}
        error={rewardsQuery.error as Error | null}
        isEmpty={!rewardsQuery.isLoading && !rewardsQuery.isError && (rewardsQuery.data?.length ?? 0) === 0}
        loadingMessage="Loading rewards catalog..."
        emptyMessage="No reward perks currently available."
        onRetry={() => rewardsQuery.refetch()}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewardsQuery.data?.map((item) => {
            const canAfford = balance >= item.points_cost;
            const isEligible = item.eligible !== false;

            return (
              <div
                key={item.id}
                className="bg-surface border border-hairline hover:border-hairline/80 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="p-2.5 rounded-xl bg-surface border border-hairline/60 text-accent group-hover:scale-105 transition">
                      {item.category === "cash_credit" ? (
                        <DollarSign className="w-5 h-5 text-success" />
                      ) : item.category === "food_coupon" ? (
                        <Ticket className="w-5 h-5 text-accent" />
                      ) : (
                        <Gift className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-surface border border-hairline text-xs font-bold font-mono text-success">
                      {item.points_cost} Pts
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-accent transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">{item.description}</p>
                  </div>

                  {!isEligible && item.reason && (
                    <div className="p-2 rounded-lg bg-danger-tint border border-danger/20 text-danger text-[11px] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{item.reason}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-hairline">
                  <button
                    onClick={() => redeemMutation.mutate(item)}
                    disabled={redeemMutation.isPending || !canAfford || !isEligible}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      canAfford && isEligible
                        ? "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                        : "bg-surface text-ink-muted cursor-not-allowed border border-hairline/40"
                    }`}
                  >
                    {redeemMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {!canAfford ? `Need ${item.points_cost - balance} more pts` : "Claim Reward"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </QueryState>

      {/* Success Modal */}
      {successRedemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-hairline rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-success-tint border border-emerald-500/30 text-success mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-ink">Reward Claimed!</h3>
              <p className="text-xs text-ink-muted mt-1">{successRedemption.item.title}</p>
            </div>

            {successRedemption.redemption.coupon_code && (
              <div className="p-3 bg-surface/80 rounded-2xl border border-dashed border-hairline">
                <span className="text-[10px] uppercase font-bold text-ink-muted block mb-1">Coupon Code</span>
                <span className="font-mono text-lg font-bold text-accent tracking-wider">
                  {successRedemption.redemption.coupon_code}
                </span>
              </div>
            )}

            {successRedemption.item.category === "cash_credit" && (
              <p className="text-xs text-success bg-success-tint p-3 rounded-xl border border-success/20">
                Applied directly to your next rent billing cycle.
              </p>
            )}

            <button
              onClick={() => setSuccessRedemption(null)}
              className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface text-ink text-xs font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
