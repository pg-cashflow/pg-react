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

const TITLES: Record<string, string> = {
  "/owner/joins": "Join requests",
  "/owner/reports": "UTR reports",
  "/owner/tenants": "Tenants",
  "/owner/dues": "Dues",
  "/owner/payments": "Payments",
  "/owner/reconciliation": "Reconciliation",
  "/owner/events": "Audit log",
  "/owner/facility": "Facility & Operations",
  "/owner/more": "Settings",
  "/owner/dashboard": "Dashboard",
  "/owner/reminders": "Reminders",
};

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tab = path.replace("/owner/", "") || "joins";
  const propsQuery = useQuery({ queryKey: QUERY_KEYS.properties, queryFn: getProperties });
  const reconQuery = useQuery({ queryKey: QUERY_KEYS.reconciliation(), queryFn: () => getReconciliation() });
  const propertyName = propsQuery.data?.[0]?.name;
  const period = reconQuery.data?.period;
  const subtitle = [propertyName || "Owner ledger", period].filter(Boolean).join(" · ");

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
      />

      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          title={TITLES[path] || "PG Cashflow"}
          subtitle={subtitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          showPush={false}
          searchRole="owner"
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <ErrorBoundary fallbackTitle={`Error loading ${TITLES[path] || "page"}`}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <BottomNav
        currentTab={tab}
        onSelectTab={(next) => navigate({ to: `/owner/${next}` })}
        onOpenMore={() => setIsMobileMenuOpen(true)}
      />
    </div>
  );
};
