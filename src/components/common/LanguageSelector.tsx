import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useLocale } from "@/i18n";
import type { SupportedLocale } from "@pg/types";

export function LanguageToggle() {
  const { locale, setLocale, locales } = useLocale();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const activeOption = locales.find((l) => l.code === locale);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Language: ${activeOption?.nativeName || "English"}. Tap to change.`}
        title={`Language: ${activeOption?.nativeName || "English"}`}
        className="flex h-10 items-center gap-1.5 px-2.5 rounded-[10px]
                   text-ink-muted hover:bg-accent-tint hover:text-accent
                   active:scale-95 transition-transform duration-100 border border-hairline bg-surface"
      >
        <Languages size={18} className="text-accent" />
        <span className="text-xs font-semibold text-ink hidden sm:inline">
          {activeOption?.nativeName || "English"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-hairline shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider border-b border-hairline mb-1">
            Language / భాష / மொழி / ಭಾಷೆ
          </div>
          {locales.map((opt) => {
            const isSelected = locale === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={async () => {
                  await setLocale(opt.code as SupportedLocale);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-accent-tint text-accent font-semibold"
                    : "text-ink hover:bg-surface-sunken"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>{opt.nativeName}</span>
                  <span className="text-[10px] text-ink-muted">{opt.name}</span>
                </div>
                {isSelected && <Check size={14} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LanguageSegmentedControl() {
  const { locale, setLocale, locales } = useLocale();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 p-1 rounded-xl bg-surface border border-hairline gap-1.5">
      {locales.map((opt) => {
        const active = locale === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLocale(opt.code as SupportedLocale)}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-accent text-white shadow-sm font-semibold"
                : "text-ink-muted hover:text-ink hover:bg-accent-tint"
            }`}
          >
            <span className="text-sm">{opt.nativeName}</span>
            <span className={`text-[10px] ${active ? "text-white/80" : "text-ink-muted"}`}>
              {opt.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
