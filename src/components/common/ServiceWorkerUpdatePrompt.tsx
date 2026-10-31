import React, { useEffect, useState } from "react";
import { useLocale } from "@/i18n";
import { RefreshCw } from "lucide-react";

export const ServiceWorkerUpdatePrompt: React.FC = () => {
  const { t } = useLocale();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  if (!waitingWorker || dismissed) {
    return null;
  }

  return (
    <div
      data-testid="sw-update-prompt"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 p-4 bg-surface border border-hairline rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-accent animate-spin-reverse" />
        </div>
        <p className="text-sm font-medium text-ink">
          {t("pwa.updateAvailable")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink transition"
        >
          {t("pwa.updateDismiss")}
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          className="px-3 py-1.5 bg-accent text-accent-contrast rounded-xl text-xs font-semibold hover:bg-accent/90 transition shadow-sm"
        >
          {t("pwa.updateNow")}
        </button>
      </div>
    </div>
  );
};

