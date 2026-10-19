import React from "react";
import { MapPinOff, ArrowLeft, Home } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { homeForRole } from "@/auth/roles";
import { useLocale } from "@/i18n";

export const NotFoundView: React.FC = () => {
  const { isAuthenticated, role, isPendingJoin } = useAuth();
  const { t } = useLocale();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const homeDest = isAuthenticated ? homeForRole(role, isPendingJoin) : "/";

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-accent-tint text-accent shadow-sm">
          <MapPinOff className="h-7 w-7" />
        </div>
        <div className="t-display-num text-ink-faint mt-6">404</div>
        <h1 className="t-h2 mt-2">{t("common.notFoundTitle")}</h1>
        <p className="t-body-sm text-ink-muted mt-2 max-w-sm mx-auto">
          {t("common.notFoundDescWithPath", { path })}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            to={homeDest}
            className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 font-semibold bg-accent text-white hover:bg-accent/90 transition shadow-sm"
          >
            <Home className="w-4 h-4" />
            {isAuthenticated ? t("common.goToDashboard") : t("common.goToHome")}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 font-semibold border border-hairline bg-surface text-ink hover:bg-bg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.goBack")}
          </button>
        </div>
      </div>
    </div>
  );
};
