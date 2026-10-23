import React, { useState } from "react";
import {
  Users,
  Receipt,
  CreditCard,
  Scale,
  Bell,
  LayoutDashboard,
  LogOut,
  Building2,
  Sliders,
  ShieldCheck,
  Send,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/auth/context";
import { useQuery } from "@tanstack/react-query";
import { getOwnerKYCQueue } from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useLocale } from "@/i18n";
import type { MessageKey } from "@/i18n/messages/en-IN";

export const SidebarToggleIcon: React.FC<{ className?: string; isPinned?: boolean }> = ({
  className = "w-4 h-4",
  isPinned = true,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    {isPinned ? (
      <path d="m14 9-3 3 3 3" />
    ) : (
      <path d="m13 15 3-3-3-3" />
    )}
  </svg>
);

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  isPinned = true,
  onTogglePin,
}) => {
  const { logout } = useAuth();
  const { t } = useLocale();
  const [isHovered, setIsHovered] = useState(false);

  const kycQueueQuery = useQuery({
    queryKey: QUERY_KEYS.ownerKYCQueue,
    queryFn: getOwnerKYCQueue,
    refetchInterval: 30000,
  });
  const pendingCount = kycQueueQuery.data?.items?.length ?? 0;

  // On mobile, isOpen controls visibility. On desktop, isExpanded is true if pinned OR hovered.
  const isExpanded = isOpen || isPinned || isHovered;

  const navItems: Array<{ id: string; key: MessageKey; icon: any; badge?: number }> = [
    { id: "dashboard", key: "nav.dashboard", icon: LayoutDashboard },
    { id: "joins", key: "nav.joins", icon: Users },
    { id: "kyc", key: "nav.kyc", icon: ShieldCheck, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: "reports", key: "nav.reports", icon: Receipt },
    { id: "tenants", key: "nav.tenants", icon: Users },
    { id: "dues", key: "nav.dues", icon: Scale },
    { id: "payments", key: "nav.payments", icon: CreditCard },
    { id: "payouts", key: "nav.payouts", icon: Send },
    { id: "reconciliation", key: "nav.reconciliation", icon: Scale },
    { id: "finance", key: "nav.finance", icon: BarChart3 },
    { id: "reminders", key: "nav.reminders", icon: Bell },
    { id: "facility", key: "nav.facility", icon: Sliders },
    { id: "events", key: "nav.events", icon: Bell },
    { id: "more", key: "nav.settings", icon: Building2 },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar container */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 bottom-0 left-0 bg-surface/95 backdrop-blur-xl border-r border-hairline flex flex-col transition-[width,transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0 w-64 shadow-2xl z-50" : "-translate-x-full lg:translate-x-0 z-40"
        } ${
          isExpanded
            ? "lg:w-64" + (!isPinned && isHovered ? " shadow-2xl shadow-black/25 z-50 border-r border-hairline/80" : "")
            : "lg:w-[68px]"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-3.5 flex items-center justify-between border-b border-hairline shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-tint text-accent shrink-0 shadow-sm flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div
              className={`transition-all duration-200 overflow-hidden ${
                isExpanded ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0 pointer-events-none hidden"
              }`}
            >
              <h1 className="font-bold text-ink text-sm leading-tight truncate">
                {t("common.appName")}
              </h1>
              <p className="text-[11px] text-ink-muted truncate">{t("common.ownerLedger")}</p>
            </div>
          </div>

          {/* ChatGPT-style pin/collapse toggle button */}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-accent-tint transition-all active:scale-95 shrink-0 ${
                isExpanded ? "opacity-100 inline-flex" : "opacity-0 pointer-events-none hidden"
              }`}
              title={isPinned ? "Collapse sidebar (expand on hover)" : "Pin sidebar open"}
              aria-label={isPinned ? "Collapse sidebar" : "Pin sidebar"}
            >
              <SidebarToggleIcon className="w-4 h-4" isPinned={isPinned} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
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
                title={t(item.key)}
                className={`w-full group relative flex items-center rounded-xl text-sm font-medium transition-all min-h-[42px] ${
                  isExpanded ? "px-3 gap-3 justify-start" : "px-0 justify-center"
                } ${
                  active
                    ? "bg-accent text-white shadow-sm font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-accent-tint"
                }`}
              >
                {/* Icon wrapper */}
                <div className="relative shrink-0 flex items-center justify-center w-6 h-6">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      active ? "text-white" : "text-ink-muted group-hover:text-ink"
                    }`}
                  />
                  {/* Collapsed dot badge */}
                  {!isExpanded && item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-surface animate-pulse" />
                  )}
                </div>

                {/* Label & Expanded badge */}
                {isExpanded && (
                  <>
                    <span className="flex-1 text-left truncate transition-opacity duration-200">
                      {t(item.key)}
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                          active
                            ? "bg-white text-accent"
                            : "bg-warning-tint text-warning border border-warning/20"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div className="p-3 border-t border-hairline shrink-0">
          <button
            onClick={logout}
            title={t("common.logout")}
            className={`w-full flex items-center rounded-xl text-sm font-medium text-danger hover:bg-danger-tint transition active:scale-95 min-h-[42px] ${
              isExpanded ? "justify-center gap-2 px-3 py-2" : "justify-center px-0"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isExpanded && <span>{t("common.logout")}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
