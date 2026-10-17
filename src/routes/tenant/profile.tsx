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

export const TenantProfileView: React.FC = () => {
  const { logout } = useAuth();
  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const [msg, setMsg] = useState<string | null>(null);
  const profile = profileQuery.data;

  return (
    <QueryState
      isLoading={profileQuery.isLoading}
      isError={profileQuery.isError}
      error={profileQuery.error as Error | null}
      onRetry={() => profileQuery.refetch()}
    >
      <div className="space-y-4 pb-4">
        <h1 className="t-h1">Profile</h1>
        <section className="rounded-[14px] border border-hairline bg-surface p-4">
          <div className="t-h3">{profile?.name}</div>
          <div className="t-body-sm text-ink-muted mt-1">{profile?.phone}</div>
        </section>
        <section className="rounded-[14px] border border-hairline bg-surface divide-y divide-hairline">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="t-caption text-ink-faint">Room</span>
            <span className="t-body font-medium">{profile?.room_number ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="t-caption text-ink-faint">Rent due day</span>
            <span className="t-body font-medium">{profile?.due_day ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="t-caption text-ink-faint">KYC</span>
            <span className="t-body font-medium text-success flex items-center gap-1">
              <BadgeCheck className="h-4 w-4" />
              {profile?.aadhaar_last4 ? `****${profile.aadhaar_last4}` : "Not on file"}
            </span>
          </div>
        </section>

        <TenantKYCCard />

        <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
          <h2 className="t-h3">Reminders & Notifications</h2>
          <p className="t-caption text-ink-muted">
            Receive rent due notifications and UPI payment alerts on your device.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await subscribeToPush();
                setMsg("Push notifications enabled");
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Push registration failed");
              }
            }}
            className="h-11 px-4 rounded-[10px] border border-hairline bg-surface t-body font-semibold hover:bg-bg transition"
          >
            Enable rent reminders
          </button>
          {msg && <p className="t-caption text-ink-muted">{msg}</p>}
        </section>

        <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
          <h2 className="t-h3">Language / భాష / மொழி / ಭಾಷೆ</h2>
          <p className="t-caption text-ink-muted">Choose your preferred language</p>
          <LanguageSegmentedControl />
        </section>

        <ActiveSessionsCard />

        <button
          type="button"
          onClick={logout}
          className="w-full h-12 rounded-[10px] border border-hairline text-danger font-semibold"
        >
          Log out
        </button>
      </div>
    </QueryState>
  );
};
