import React from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/lib/usePwaInstall";

export const PwaInstallPrompt: React.FC<{ className?: string }> = ({ className }) => {
  const { canInstall, isIOS, showIosSheet, setShowIosSheet, promptInstall } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <>
      <div
        className={className ?? "rounded-[14px] border border-hairline bg-surface p-4 flex items-center justify-between gap-3 shadow-sm"}
        data-testid="pwa-install-banner"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-accent-tint text-accent flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="t-h3">Install PG Cashflow</h4>
            <p className="t-caption text-ink-muted">Quick access from your home screen. No app store needed.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="h-10 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold flex items-center gap-1.5 shrink-0 hover:bg-accent-pressed active:scale-95 transition"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
      </div>

      {/* iOS Safari manual instructions bottom sheet */}
      {showIosSheet && isIOS && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-step-in"
        >
          <div
            className="w-full max-w-md bg-surface border border-hairline rounded-t-[24px] sm:rounded-[14px] p-6 pb-safe space-y-4 shadow-xl"
            data-testid="ios-install-sheet"
          >
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <h3 className="t-h2">Add to Home Screen</h3>
              <button
                type="button"
                onClick={() => setShowIosSheet(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-bg transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="t-body-sm text-ink-muted">
              Install PG Cashflow to your iPhone or iPad in two steps:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-[10px] bg-bg border border-hairline">
                <div className="w-8 h-8 rounded-lg bg-surface border border-hairline flex items-center justify-center shrink-0 text-accent">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <div className="t-body font-semibold">1. Tap the Share button</div>
                  <div className="t-caption text-ink-muted">In the Safari toolbar at the bottom of the screen.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-[10px] bg-bg border border-hairline">
                <div className="w-8 h-8 rounded-lg bg-surface border border-hairline flex items-center justify-center shrink-0 text-accent">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="t-body font-semibold">2. Tap "Add to Home Screen"</div>
                  <div className="t-caption text-ink-muted">Scroll down in the share sheet and tap Add.</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosSheet(false)}
              className="w-full h-11 rounded-[10px] bg-accent text-white t-body font-semibold hover:bg-accent-pressed transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
