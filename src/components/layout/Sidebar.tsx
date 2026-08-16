import React from "react";
import {
  Users,
  Receipt,
  CreditCard,
  Scale,
  Bell,
  LayoutDashboard,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/auth/context";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { logout } = useAuth();

  const navItems = [
    { id: "joins", label: "Join queue", icon: LayoutDashboard },
    { id: "reports", label: "UTR reports", icon: Receipt },
    { id: "tenants", label: "Tenants", icon: Users },
    { id: "dues", label: "Dues & Billing", icon: Scale },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "reconciliation", label: "Reconciliation", icon: Scale },
    { id: "events", label: "Audit & Events", icon: Bell },
    { id: "more", label: "More", icon: Building2 },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight">
              PG Manager
            </h1>
            <p className="text-[11px] text-slate-400">Cashflow & Billing</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-slate-950 shadow-md shadow-primary/20 font-semibold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-slate-950" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};
