import React, { useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TenantSidebar } from "./TenantSidebar";
import { TenantBottomNav } from "./TenantBottomNav";
import { TopBar } from "./TopBar";
import { ErrorBoundary } from "./ErrorBoundary";

const TITLES: Record<string, string> = {
  "/tenant": "My Dashboard",
  "/tenant/": "My Dashboard",
  "/tenant/dues": "My Dues",
  "/tenant/payments": "My Payments",
};

export const TenantShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tab = path === "/tenant" || path === "/tenant/" ? "dashboard" : path.replace("/tenant/", "");

  return (
    <div className="min-h-screen flex flex-col transition-colors">
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
          title={TITLES[path] || "Tenant Portal"}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          showPush
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <ErrorBoundary fallbackTitle={`Error loading ${TITLES[path] || "page"}`}>
            <Outlet />
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
