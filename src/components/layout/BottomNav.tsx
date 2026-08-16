import React from "react";
import { LayoutDashboard, Receipt, CreditCard, Users, MoreHorizontal } from "lucide-react";

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMore,
}) => {
  const tabs = [
    { id: "joins", label: "Home", icon: LayoutDashboard },
    { id: "dues", label: "Dues", icon: Receipt },
    { id: "reports", label: "UTRs", icon: CreditCard },
    { id: "tenants", label: "Tenants", icon: Users },
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

        {/* More / Menu trigger */}
        <button
          onClick={onOpenMore}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-transform active:scale-95 ${
            ["reconciliation", "events", "more", "payments"].includes(currentTab)
              ? "text-primary font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-colors ${
              ["reconciliation", "events", "more", "payments"].includes(currentTab)
                ? "bg-primary/10 text-primary"
                : "text-slate-400"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
