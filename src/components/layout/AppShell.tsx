import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ErrorBoundary } from "./ErrorBoundary";
import { getProperties } from "@/api/properties";
import { getReconciliation } from "@/api/payments";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AddPropertyModal } from "@/components/owner/AddPropertyModal";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { useLocale } from "@/i18n";
import type { MessageKey } from "@/i18n/messages/en-IN";

const ROUTE_KEYS: Record<string, MessageKey> = {
  "/owner/joins": "nav.joins",
  "/owner/join-requests": "nav.joins",
  "/owner/kyc": "nav.kyc",
  "/owner/kyc-queue": "nav.kyc",
  "/owner/reports": "nav.reports",
  "/owner/payment-reports": "nav.reports",
  "/owner/tenants": "nav.tenants",
  "/owner/dues": "nav.dues",
  "/owner/billing": "nav.dues",
  "/owner/payments": "nav.payments",
  "/owner/payouts": "nav.payouts",
  "/owner/reconciliation": "nav.reconciliation",
  "/owner/finance": "nav.finance",
  "/owner/finance/expenses": "nav.finance",
  "/owner/finance/budgets": "nav.finance",
  "/owner/finance/capital": "nav.finance",
  "/owner/finance/statements": "nav.finance",
  "/owner/finance/reports": "nav.finance",
  "/owner/finance/close": "nav.finance",
  "/owner/finance/tie-out": "nav.finance",
  "/owner/tie-out": "nav.finance",
  "/owner/events": "nav.events",
  "/owner/audit": "nav.events",
  "/owner/facility": "nav.facility",
  "/owner/hazards": "nav.facility",
  "/owner/inspections": "nav.facility",
  "/owner/more": "nav.settings",
  "/owner/settings": "nav.settings",
  "/owner/dashboard": "nav.dashboard",
  "/owner/reminders": "nav.reminders",
};

function normalizeTab(pathname: string): string {
  const segment = pathname.replace("/owner/", "").split("/")[0] || "dashboard";
  if (segment === "join-requests") return "joins";
  if (segment === "payment-reports") return "reports";
  if (segment === "finance" || segment === "tie-out") return "finance";
  if (segment === "hazards" || segment === "inspections") return "facility";
  if (segment === "audit" || segment === "logs") return "events";
  if (segment === "billing") return "dues";
  if (segment === "settings") return "more";
  if (segment === "kyc-queue") return "kyc";
  return segment;
}

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("pg_sidebar_pinned");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleSidebarPinned = () => {
    setIsSidebarPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pg_sidebar_pinned", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tab = normalizeTab(path);
  const { t } = useLocale();
  const propsQuery = useQuery({ queryKey: QUERY_KEYS.properties, queryFn: getProperties });
  const reconQuery = useQuery({ queryKey: QUERY_KEYS.reconciliation(), queryFn: () => getReconciliation() });
  const propertyName = propsQuery.data?.[0]?.name;
  const period = reconQuery.data?.period;
  const periodText = period ? t("dashboard.period", { period }) : undefined;
  const subtitle = [propertyName || t("common.ownerLedger"), periodText].filter(Boolean).join(" · ");
  const routeKey = ROUTE_KEYS[path];
  const pageTitle = routeKey ? t(routeKey) : t("common.appName");

  useEffect(() => {
    document.documentElement.setAttribute("data-portal", "owner");
    return () => {
      document.documentElement.removeAttribute("data-portal");
    };
  }, []);

  return (
    <div data-portal="owner" className="min-h-screen flex flex-col bg-bg text-ink transition-colors">
      <Sidebar
        currentTab={tab}
        onSelectTab={(next) => {
          navigate({ to: `/owner/${next}` });
          setIsMobileMenuOpen(false);
        }}
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isPinned={isSidebarPinned}
        onTogglePin={handleToggleSidebarPinned}
      />

      <div
        className={`flex flex-col flex-1 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSidebarPinned ? "lg:pl-64" : "lg:pl-[68px]"
        }`}
      >
        <TopBar
          title={pageTitle}
          subtitle={subtitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          showPush={false}
          searchRole="owner"
          onAddProperty={() => setIsAddPropertyOpen(true)}
          isSidebarPinned={isSidebarPinned}
          onToggleSidebarPinned={handleToggleSidebarPinned}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <ErrorBoundary fallbackTitle={`Error loading ${pageTitle}`}>
            <React.Suspense fallback={<AppLoadingScreen />}>
              <Outlet />
            </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <BottomNav
        currentTab={tab}
        onSelectTab={(next) => navigate({ to: `/owner/${next}` })}
        onOpenMore={() => setIsMobileMenuOpen(true)}
      />

      <AddPropertyModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onPropertyCreated={() => {
          navigate({ to: "/owner/facility" });
        }}
      />
    </div>
  );
};
