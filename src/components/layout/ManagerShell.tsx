import React, { useState } from "react";
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

  const navItems = [
    { id: "headcount", label: "Headcount", icon: UtensilsCrossed },
    { id: "inspections", label: "Inspections", icon: ClipboardCheck },
    { id: "meters", label: "Meters", icon: Gauge },
    { id: "hazards", label: "Hazards", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors">
      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar for Desktop & Drawer for Mobile */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight">Warden Portal</h1>
            <p className="text-[11px] text-slate-400">PG Daily Operations</p>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-amber-500/15 text-amber-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = path.includes(item.id) || (item.id === "headcount" && path === "/manager");
          return (
            <button
              key={item.id}
              onClick={() => navigate({ to: `/manager?tab=${item.id}` })}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition ${
                active ? "text-amber-400" : "text-slate-400 hover:text-slate-200"
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
