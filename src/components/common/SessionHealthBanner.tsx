import React from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useAuth } from "@/auth/context";
import { useLocale } from "@/i18n";

/**
 * Makes the existing degraded-session state visible across every authenticated portal.
 * The server remains authoritative; this banner only explains why actions may fail and
 * provides an explicit refresh-session retry without clearing a potentially valid cookie.
 */
export const SessionHealthBanner: React.FC = () => {
  const { isDegraded } = useAuth();
  const { t } = useLocale();

  if (!isDegraded) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-4 mt-3 flex flex-col gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning sm:mx-8 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("common.sessionUnstable")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("common.sessionDegradedDesc")}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("pg:session_changed"))}
        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-warning/30 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-warning/10 sm:self-center"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {t("common.retry")}
      </button>
    </div>
  );
};
