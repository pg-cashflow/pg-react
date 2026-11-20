import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyDues, getMyProfile } from "@/api/tenant";
import { getTenantKYCStatus } from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QueryState } from "@/components/shared/QueryState";
import { PayPanel } from "@/components/shared/PayPanel";
import { DuePaymentTimeline } from "@/components/shared/DuePaymentTimeline";
import { TenantKYCCard } from "@/components/shared/TenantKYCCard";
import { displayDueStatus, formatDate, formatDaysOverdue, getDaysOverdue, isOverdue } from "@/lib/utils";
import { useLocale } from "@/i18n";
import { ShieldCheck, Clock, ArrowRight } from "lucide-react";

export const TenantDuesView: React.FC = () => {
  const { t, locale } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const [utrIds, setUtrIds] = useState<Record<string, boolean>>({});
  const [showKycModal, setShowKycModal] = useState(false);

  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const duesQuery = useQuery({
    queryKey: QUERY_KEYS.tenantDues,
    queryFn: getMyDues,
    refetchInterval: 30000,
  });
  const kycQuery = useQuery({ queryKey: QUERY_KEYS.tenantKYCStatus, queryFn: getTenantKYCStatus });

  const dues = duesQuery.data ?? [];
  const awaitingAllocation = profileQuery.data?.status === "pending_allocation";
  const kyc = kycQuery.data?.verification;
  const isKycVerified = kyc?.status === "verified";
  const isKycPendingReview = kyc?.status === "pending_manual_review";

  return (
    <div className="space-y-4">
      {/* KYC Status Reminder Banner */}
      {!isKycVerified && (
        <div
          onClick={() => setShowKycModal(true)}
          className={`p-4 rounded-[14px] border flex items-center justify-between cursor-pointer transition ${
            isKycPendingReview
              ? "bg-warning-tint/30 border-warning/20 text-warning"
              : "bg-accent-tint border-accent/20 text-accent hover:border-accent/40"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {isKycPendingReview ? (
              <Clock className="w-5 h-5 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="t-body font-semibold">
                {isKycPendingReview
                  ? t("tenant.dashboard.kycReviewTitle")
                  : t("tenant.dashboard.kycRequiredTitle")}
              </p>
              <p className="t-caption text-ink-muted mt-0.5 truncate">
                {isKycPendingReview
                  ? t("tenant.dashboard.kycReviewDesc")
                  : t("tenant.dashboard.kycRequiredDesc")}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 text-ink-muted" />
        </div>
      )}

      {showKycModal && (
        <TenantKYCCard
          isModal
          onClose={() => setShowKycModal(false)}
          onSuccess={() => {
            setShowKycModal(false);
            kycQuery.refetch();
            duesQuery.refetch();
          }}
        />
      )}

      {awaitingAllocation && (
        <div className="bg-accent-tint border border-accent/20 rounded-[14px] p-4 t-body-sm text-accent">
          {t("tenant.dues.awaitingRoomRent")}
        </div>
      )}
      <QueryState
        isLoading={duesQuery.isLoading}
        isError={duesQuery.isError}
        error={duesQuery.error as Error | null}
        isEmpty={!duesQuery.isLoading && !duesQuery.isError && dues.length === 0}
        emptyMessage={awaitingAllocation ? t("tenant.dues.emptyWaiting") : t("tenant.dues.emptyPassbook")}
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
                    <p className="t-date text-ink-muted">{formatDate(d.due_date, locale)}</p>
                    {isOverdue(d) && (
                      <p className="text-danger t-micro font-medium mt-0.5">
                        {formatDaysOverdue(getDaysOverdue(d.due_date), t)}
                      </p>
                    )}
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
                        : "bg-accent text-accent-contrast"
                    }`}
                  >
                    {openId === d.id ? t("tenant.dues.hidePay") : t("tenant.dues.pay")}
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
