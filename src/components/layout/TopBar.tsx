import React, { useState, useEffect } from "react";
import { Menu, Bell, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import { subscribeToPush } from "@/push/subscribe";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface TopBarProps {
  title: string;
  onOpenMobileMenu: () => void;
  showPush?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onOpenMobileMenu, showPush = false }) => {
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
    <header className="h-16 px-4 lg:px-8 bg-surface/90 backdrop-blur-md border-b border-hairline flex items-center justify-between sticky top-0 z-30 pt-safe transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-xl text-ink-muted hover:text-ink hover:bg-accent-tint transition lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">{title}</h2>
          {isStandalone && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-tint text-accent text-[10px] font-medium border border-accent/20">
              <Smartphone className="w-3 h-3" /> PWA
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Center */}
        <NotificationCenter />

        {/* Theme Toggle Button (Cycle System -> Light -> Dark) */}
        <ThemeToggle />

        {/* Push Notification Button */}
        {showPush &&
          (pushStatus === "subscribed" ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-tint border border-success/30 text-xs font-medium text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Push Active</span>
          </span>
        ) : pushStatus === "error" ? (
          <button
            onClick={handleEnablePush}
            title={errorMessage || "Error enabling push"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger-tint border border-danger/30 text-xs font-medium text-danger hover:bg-danger-tint/80 transition active:scale-95"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retry</span>
          </button>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={pushStatus === "loading"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-hairline text-xs font-medium text-ink-muted hover:text-ink hover:bg-accent-tint transition active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">
              {pushStatus === "loading" ? "Enabling..." : "Enable Push"}
            </span>
          </button>
        ))}
      </div>
    </header>
  );
};
