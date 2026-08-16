import React, { useState, useEffect } from "react";
import { Menu, Bell, CheckCircle2, AlertCircle, Sun, Moon, Smartphone } from "lucide-react";
import { subscribeToPush } from "@/push/subscribe";
import { useTheme } from "@/theme/context";

interface TopBarProps {
  title: string;
  onOpenMobileMenu: () => void;
  showPush?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onOpenMobileMenu, showPush = false }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "subscribed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(checkStandalone);
  }, []);

  const handleEnablePush = async () => {
    try {
      setPushStatus("loading");
      setErrorMessage(null);
      await subscribeToPush();
      setPushStatus("subscribed");
    } catch (err: any) {
      console.error("Push subscribe error:", err);
      setPushStatus("error");
      setErrorMessage(err.message || "Failed to subscribe");
    }
  };

  return (
    <header className="h-16 px-4 lg:px-8 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30 pt-safe">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-100">{title}</h2>
          {isStandalone && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
              <Smartphone className="w-3 h-3" /> PWA
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-slate-700/50 transition active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center"
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Push Notification Button */}
        {showPush &&
          (pushStatus === "subscribed" ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Push Active</span>
          </span>
        ) : pushStatus === "error" ? (
          <button
            onClick={handleEnablePush}
            title={errorMessage || "Error enabling push"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition active:scale-95"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retry</span>
          </button>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={pushStatus === "loading"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">
              {pushStatus === "loading" ? "Enabling..." : "Enable Push"}
            </span>
          </button>
        ))}
      </div>
    </header>
  );
};
