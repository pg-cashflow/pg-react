import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/api/tenant";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { useAuth } from "@/auth/context";
import { subscribeToPush } from "@/push/subscribe";
import { BadgeCheck } from "lucide-react";
import { LanguageSegmentedControl } from "@/components/common/LanguageSelector";
import { ActiveSessionsCard } from "@/components/shared/ActiveSessionsCard";
import { TenantKYCCard } from "@/components/shared/TenantKYCCard";

import { getTenantKYCStatus } from "@/api/kyc";
import { useLocale } from "@/i18n";

export const TenantProfileView: React.FC = () => {
  const { t } = useLocale();
  const { logout } = useAuth();
  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const kycQuery = useQuery({ queryKey: QUERY_KEYS.tenantKYCStatus, queryFn: getTenantKYCStatus });
  const [msg, setMsg] = useState<string | null>(null);
  const profile = profileQuery.data;
  const isVerified = kycQuery.data?.verification?.status === "verified";
  const isPendingReview = kycQuery.data?.verification?.status === "pending_manual_review";

  return (
    <QueryState
      isLoading={profileQuery.isLoading}
      isError={profileQuery.isError}
      error={profileQuery.error as Error | null}
      onRetry={() => {
        profileQuery.refetch();
        kycQuery.refetch();
      }}
    >
      <div className="space-y-4 pb-4">
        <h1 className="t-h1">{t("tenant.profile")}</h1>
        <section className="rounded-[14px] border border-hairline bg-surface p-4">
          <div className="t-h3">{profile?.name}</div>
          <div className="t-body-sm text-ink-muted mt-1">{profile?.phone}</div>
        </section>
        <section className="rounded-[14px] border border-hairline bg-surface divide-y divide-hairline">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="t-caption text-ink-faint">{t("tenant.room")}</span>
            <span className="t-body font-medium">{profile?.room_number ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="t-caption text-ink-faint">{t("tenant.rentDueDay")}</span>
            <span className="t-body font-medium">{profile?.due_day ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="t-caption text-ink-faint">{t("tenant.kyc")}</span>
            <span
              className={`t-body font-medium flex items-center gap-1 ${
                isVerified
                  ? "text-success"
                  : isPendingReview
                  ? "text-warning"
                  : "text-warning"
              }`}
            >
              <BadgeCheck className="h-4 w-4" />
              {isVerified
                ? t("tenant.kycVerified", { last4: profile?.aadhaar_last4 || "" })
                : isPendingReview
                ? t("tenant.kycUnderReview")
                : t("tenant.kycRequired")}
            </span>
          </div>
        </section>

        <TenantKYCCard />

        <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
          <h2 className="t-h3">{t("tenant.remindersTitle")}</h2>
          <p className="t-caption text-ink-muted">
            {t("tenant.remindersDesc")}
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await subscribeToPush();
                setMsg(t("tenant.pushEnabled"));
              } catch (err) {
                setMsg(err instanceof Error ? err.message : t("tenant.pushFailed"));
              }
            }}
            className="h-11 px-4 rounded-[10px] border border-hairline bg-surface t-body font-semibold hover:bg-bg transition"
          >
            {t("tenant.enableReminders")}
          </button>
          {msg && <p className="t-caption text-ink-muted">{msg}</p>}
        </section>

        <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
          <h2 className="t-h3">{t("tenant.languageTitle")}</h2>
          <p className="t-caption text-ink-muted">{t("tenant.languageDesc")}</p>
          <LanguageSegmentedControl />
        </section>

        <ActiveSessionsCard />

        <button
          type="button"
          onClick={logout}
          className="w-full h-12 rounded-[10px] border border-hairline text-danger font-semibold"
        >
          {t("common.logout")}
        </button>
      </div>
    </QueryState>
  );
};
