import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TopBar } from "./TopBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAuth } from "@/auth/context";
import {
  UtensilsCrossed,
  ClipboardCheck,
  Gauge,
  AlertTriangle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export const ManagerShell: React.FC = () => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    document.documentElement.setAttribute("data-portal", "manager");
    return () => {
      document.documentElement.removeAttribute("data-portal");
    };
  }, []);

  const navItems = [
    { id: "headcount", label: "Headcount", icon: UtensilsCrossed },
    { id: "inspections", label: "Inspections", icon: ClipboardCheck },
    { id: "meters", label: "Meters", icon: Gauge },
    { id: "hazards", label: "Hazards", icon: AlertTriangle },
  ];

  return (
    <div data-portal="manager" className="min-h-screen flex flex-col bg-bg text-ink transition-colors">
      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar for Desktop & Drawer for Mobile */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-surface border-r border-hairline flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-6 flex items-center gap-3 border-b border-hairline">
          <div className="p-2 rounded-xl bg-accent-tint text-accent">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-ink text-sm leading-tight">Warden Portal</h1>
            <p className="text-[11px] text-ink-muted">PG Daily Operations</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path.includes(item.id) || (item.id === "headcount" && path === "/manager");
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate({ to: `/manager?tab=${item.id}` });
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-white shadow-sm font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-accent-tint"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-ink-muted"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-hairline">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-tint transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          title="Warden & Operations"
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          showPush={false}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <ErrorBoundary fallbackTitle="Error loading Warden Portal">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-hairline px-2 py-2 flex items-center justify-around pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = path.includes(item.id) || (item.id === "headcount" && path === "/manager");
          return (
            <button
              key={item.id}
              onClick={() => navigate({ to: `/manager?tab=${item.id}` })}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition ${
                active ? "text-accent font-semibold" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
