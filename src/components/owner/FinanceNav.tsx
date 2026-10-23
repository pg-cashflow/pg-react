import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  FileSpreadsheet,
  Lock,
  PieChart,
  Receipt,
} from "lucide-react";

interface TabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  exact?: boolean;
}

const TABS: TabItem[] = [
  { to: "/owner/finance", label: "Overview", icon: BarChart3, exact: true },
  { to: "/owner/finance/expenses", label: "Expenses", icon: Receipt },
  { to: "/owner/finance/budgets", label: "Budgets", icon: PieChart },
  { to: "/owner/finance/capital", label: "Capital", icon: DollarSign },
  { to: "/owner/finance/statements", label: "Statements", icon: FileSpreadsheet },
  { to: "/owner/finance/reports", label: "Integrity Reports", icon: BookOpen },
  { to: "/owner/finance/close", label: "Month Close", icon: Lock },
];

export const FinanceNav: React.FC = () => {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-hairline no-scrollbar">
      {TABS.map((tab) => {
        const isActive = tab.exact
          ? currentPath === tab.to
          : currentPath === tab.to || currentPath.startsWith(`${tab.to}/`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? "bg-ink text-surface shadow-sm"
                : "text-ink-muted hover:text-ink hover:bg-surface border border-transparent"
            }`}
          >
            <Icon size={14} className={isActive ? "text-surface" : "text-ink-muted"} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
