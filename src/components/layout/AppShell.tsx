import React, { useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ErrorBoundary } from "./ErrorBoundary";

const TITLES: Record<string, string> = {
  "/owner/joins": "Join requests",
  "/owner/reports": "UTR reports",
  "/owner/tenants": "Tenants",
  "/owner/dues": "Dues",
  "/owner/payments": "Payments",
  "/owner/reconciliation": "Reconciliation",
  "/owner/events": "Audit log",
  "/owner/facility": "Facility & Operations",
  "/owner/more": "More",
  "/owner/dashboard": "Dashboard",
};

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tab = path.replace("/owner/", "") || "joins";

  return (
    <div className="min-h-screen flex flex-col transition-colors">
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
          title={TITLES[path] || "PG Manager"}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          showPush={false}
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
