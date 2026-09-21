import React, { createContext, useContext, useEffect, useState } from "react";
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
  User,
  ArrowLeft,
} from "lucide-react";

export type ManagerAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  busyLabel?: string;
} | null;

const ActionCtx = createContext<(a: ManagerAction) => void>(() => {});
export const useManagerAction = () => useContext(ActionCtx);

const TITLES: Record<string, string> = {
  "/manager": "Kitchen headcount",
  "/manager/kitchen": "Kitchen headcount",
  "/manager/inspections": "Inspections",
  "/manager/inspections/new": "New inspection",
  "/manager/meters": "Meter readings",
  "/manager/hazards": "Hazard reports",
  "/manager/profile": "Profile",
  "/manager/violations": "Violations",
};

export const ManagerShell: React.FC = () => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [action, setAction] = useState<ManagerAction>(null);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isInspectionSub = /^\/manager\/inspections\/(new|[^/]+)$/.test(path);

  useEffect(() => {
    document.documentElement.setAttribute("data-portal", "manager");
    return () => document.documentElement.removeAttribute("data-portal");
  }, []);

  const navItems = [
    { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed, to: "/manager/kitchen" },
    { id: "inspections", label: "Inspections", icon: ClipboardCheck, to: "/manager/inspections" },
    { id: "meters", label: "Meters", icon: Gauge, to: "/manager/meters" },
    { id: "hazards", label: "Hazards", icon: AlertTriangle, to: "/manager/hazards" },
    { id: "violations", label: "Violations", icon: AlertTriangle, to: "/manager/violations" },
    { id: "profile", label: "Profile", icon: User, to: "/manager/profile" },
  ];

  return (
    <div data-portal="manager" className="min-h-screen flex flex-col bg-bg text-ink">
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-surface border-r border-hairline flex flex-col transition-transform lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-6 flex items-center gap-3 border-b border-hairline">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <div>
            <h1 className="t-h3">PG Cashflow</h1>
            <p className="t-caption text-ink-muted">Warden portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path === item.to || (item.id === "inspections" && path.startsWith("/manager/inspections"));
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate({ to: item.to });
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] t-body ${
                  active ? "bg-accent text-white font-semibold" : "text-ink-muted hover:bg-accent-tint"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-hairline">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] t-body font-medium text-danger"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          title={TITLES[path] || (path.startsWith("/manager/inspections/") ? "Inspection" : "Warden")}
          subtitle="Daily ops"
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          searchRole="manager"
          leading={
            isInspectionSub ? (
              <button
                type="button"
                aria-label="Back"
                onClick={() => navigate({ to: "/manager/inspections" })}
                className="grid h-10 w-10 place-items-center rounded-[10px] hover:bg-accent-tint lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : undefined
          }
        />
        <main className="flex-1 p-4 lg:p-8 max-w-[720px] w-full mx-auto pb-28 lg:pb-8">
          <ErrorBoundary fallbackTitle="Error loading warden portal">
            <ActionCtx.Provider value={setAction}>
              <Outlet />
            </ActionCtx.Provider>
          </ErrorBoundary>
        </main>
      </div>

      {action && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-hairline bg-surface px-4 pt-3 pb-safe">
          {action.to ? (
            <button
              type="button"
              onClick={() => navigate({ to: action.to! })}
              className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold"
            >
              {action.label}
            </button>
          ) : (
            <button
              type="button"
              disabled={action.busy || action.disabled}
              onClick={action.onClick}
              className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold disabled:opacity-40"
            >
              {action.busy ? action.busyLabel || "Working…" : action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
