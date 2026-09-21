import React from "react";
import { LayoutDashboard, Receipt, CreditCard, Sparkles, UtensilsCrossed } from "lucide-react";

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
    { id: "dues", label: "Dues", icon: Receipt },
    { id: "payments", label: "Passbook", icon: CreditCard },
    { id: "rewards", label: "Perks", icon: Sparkles },
    { id: "community", label: "Meals", icon: UtensilsCrossed },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-hairline pb-safe shadow-lg transition-colors">
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
                  ? "text-accent font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? "bg-accent-tint text-accent" : "text-ink-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
