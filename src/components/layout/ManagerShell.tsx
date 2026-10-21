import React, { createContext, useContext, useEffect, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TopBar } from "./TopBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { useAuth } from "@/auth/context";
import { useLocale } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { LanguageSegmentedControl } from "@/components/common/LanguageSelector";
import {
  UtensilsCrossed,
  ClipboardCheck,
  Gauge,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  User,
  ArrowLeft,
  Languages,
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

const TITLE_KEYS: Record<string, MessageKey> = {
  "/manager": "manager.titleKitchen",
  "/manager/kitchen": "manager.titleKitchen",
  "/manager/inspections": "manager.titleInspections",
  "/manager/inspections/new": "manager.titleNewInspection",
  "/manager/meters": "manager.titleMeters",
  "/manager/hazards": "manager.titleHazards",
  "/manager/profile": "tenant.profile",
  "/manager/violations": "manager.titleViolations",
};

export const ManagerShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [action, setAction] = useState<ManagerAction>(null);
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isInspectionSub = /^\/manager\/inspections\/(new|[^/]+)$/.test(path);

  useEffect(() => {
    document.documentElement.setAttribute("data-portal", "manager");
    return () => document.documentElement.removeAttribute("data-portal");
  }, []);

  // Manager first-access language preference prompt
  useEffect(() => {
    try {
      const alreadyPrompted = sessionStorage.getItem("pg_manager_lang_prompt_seen") === "true";
      if (!alreadyPrompted && !user?.has_saved_preference) {
        setShowLanguagePrompt(true);
      }
    } catch {
      // ignore storage access errors
    }
  }, [user?.has_saved_preference]);

  const handleDismissLangPrompt = async () => {
    try {
      sessionStorage.setItem("pg_manager_lang_prompt_seen", "true");
    } catch {
      // ignore
    }
    await setLocale(locale, true);
    setShowLanguagePrompt(false);
  };

  const navItems = [
    { id: "kitchen", label: t("manager.navKitchen"), icon: UtensilsCrossed, to: "/manager/kitchen" },
    { id: "inspections", label: t("manager.navInspections"), icon: ClipboardCheck, to: "/manager/inspections" },
    { id: "meters", label: t("manager.navMeters"), icon: Gauge, to: "/manager/meters" },
    { id: "hazards", label: t("manager.navHazards"), icon: AlertTriangle, to: "/manager/hazards" },
    { id: "violations", label: t("manager.navViolations"), icon: AlertTriangle, to: "/manager/violations" },
    { id: "profile", label: t("tenant.profile"), icon: User, to: "/manager/profile" },
  ];

  const pageTitle = TITLE_KEYS[path]
    ? t(TITLE_KEYS[path])
    : path.startsWith("/manager/inspections/")
    ? t("manager.titleInspectionSingle")
    : t("manager.titleWarden");

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
            <h1 className="t-h3">{t("common.appName")}</h1>
            <p className="t-caption text-ink-muted">{t("manager.portalSubtitle")}</p>
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
            <LogOut className="w-4 h-4" /> {t("common.logout")}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          title={pageTitle}
          subtitle={t("manager.subtitleOps")}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          searchRole="manager"
          leading={
            isInspectionSub ? (
              <button
                type="button"
                aria-label={t("common.back")}
                onClick={() => navigate({ to: "/manager/inspections" })}
                className="grid h-10 w-10 place-items-center rounded-[10px] hover:bg-accent-tint lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : undefined
          }
        />
        <main className="flex-1 p-4 lg:p-8 max-w-[720px] w-full mx-auto pb-28 lg:pb-8">
          <ErrorBoundary fallbackTitle={t("manager.errorLoading")}>
            <ActionCtx.Provider value={setAction}>
              <React.Suspense fallback={<AppLoadingScreen />}>
                <Outlet />
              </React.Suspense>
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
              {action.busy ? action.busyLabel || t("common.working") : action.label}
            </button>
          )}
        </div>
      )}

      {/* Manager First-Access Language Preference Prompt */}
      {showLanguagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-hairline p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-tint text-accent">
                <Languages className="w-6 h-6" />
              </div>
              <div>
                <h3 className="t-h3">{t("manager.langPromptTitle")}</h3>
                <p className="t-caption text-ink-muted mt-0.5">{t("manager.langPromptSubtitle")}</p>
              </div>
            </div>

            <div className="pt-2">
              <LanguageSegmentedControl />
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleDismissLangPrompt}
                className="w-full h-11 rounded-[10px] bg-accent text-white t-body-sm font-semibold transition hover:bg-accent/90"
              >
                {t("common.continue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
