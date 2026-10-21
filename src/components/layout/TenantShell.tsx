import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TenantSidebar } from "./TenantSidebar";
import { TenantBottomNav } from "./TenantBottomNav";
import { TopBar } from "./TopBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { useLocale } from "@/i18n";
import type { MessageKey } from "@/i18n";

const TITLE_KEYS: Record<string, MessageKey> = {
  "/tenant": "nav.myDashboard",
  "/tenant/": "nav.myDashboard",
  "/tenant/dues": "nav.myDues",
  "/tenant/payments": "nav.passbook",
  "/tenant/rewards": "nav.perksStore",
  "/tenant/community": "nav.communityMeals",
  "/tenant/profile": "tenant.profile",
};

export const TenantShell: React.FC = () => {
  const { t } = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tab = path === "/tenant" || path === "/tenant/" ? "dashboard" : path.replace("/tenant/", "");

  useEffect(() => {
    document.documentElement.setAttribute("data-portal", "tenant");
    return () => {
      document.documentElement.removeAttribute("data-portal");
    };
  }, []);

  const pageTitle = TITLE_KEYS[path] ? t(TITLE_KEYS[path]) : t("tenant.portal");

  return (
    <div data-portal="tenant" className="min-h-screen flex flex-col bg-bg text-ink transition-colors">
      <TenantSidebar
        currentTab={tab}
        onSelectTab={(next) => {
          navigate({ to: next === "dashboard" ? "/tenant" : `/tenant/${next}` });
          setIsMobileMenuOpen(false);
        }}
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          title={pageTitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          showPush
          searchRole="tenant"
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <ErrorBoundary fallbackTitle={t("common.errorLoadingPage", { page: pageTitle })}>
            <React.Suspense fallback={<AppLoadingScreen />}>
              <Outlet />
            </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <TenantBottomNav
        currentTab={tab}
        onSelectTab={(next) => navigate({ to: next === "dashboard" ? "/tenant" : `/tenant/${next}` })}
      />
    </div>
  );
};
