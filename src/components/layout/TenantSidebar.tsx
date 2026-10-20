import {
  Receipt,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Building2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "@/auth/context";
import { useLocale } from "@/i18n";

interface TenantSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const TenantSidebar: React.FC<TenantSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { logout } = useAuth();
  const { t } = useLocale();

  const navItems = [
    { id: "dashboard", label: t("nav.home"), icon: LayoutDashboard },
    { id: "dues", label: t("nav.myDues"), icon: Receipt },
    { id: "payments", label: t("nav.passbook"), icon: CreditCard },
    { id: "rewards", label: t("nav.perksAndPoints"), icon: Sparkles },
    { id: "community", label: t("nav.communityMeals"), icon: UtensilsCrossed },
    { id: "profile", label: t("tenant.profile"), icon: Building2 },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-surface border-r border-hairline flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-6 flex items-center gap-3 border-b border-hairline">
          <div className="p-2 rounded-xl bg-accent-tint text-accent">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-ink text-sm leading-tight">{t("tenant.portal")}</h1>
            <p className="text-[11px] text-ink-muted">{t("tenant.portalSubtitle")}</p>
          </div>
        </div>

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
                    ? "bg-accent text-white shadow-sm font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-accent-tint"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-ink-muted"}`} />
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
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
