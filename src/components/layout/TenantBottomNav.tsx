import React from "react";
import { LayoutDashboard, Receipt, CreditCard, MoreHorizontal } from "lucide-react";

interface TenantBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const TenantBottomNav: React.FC<TenantBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "dues", label: "My Dues", icon: Receipt },
    { id: "payments", label: "Payments", icon: CreditCard },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 pb-safe shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-transform active:scale-95 ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-slate-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
        <div className="flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] text-slate-600">
          <div className="p-1 rounded-xl">
            <MoreHorizontal className="w-5 h-5 opacity-0" />
          </div>
        </div>
      </div>
    </nav>
  );
};
