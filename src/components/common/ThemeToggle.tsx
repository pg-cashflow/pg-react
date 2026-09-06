import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, type Theme } from "@/theme/context";

export function ThemeToggle() {
  const { resolvedTheme, theme, cycleTheme } = useTheme();
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}. Tap to change.`}
      title={`Theme: ${theme} (resolved: ${resolvedTheme}). Tap to cycle.`}
      className="relative flex h-10 w-10 items-center justify-center rounded-[10px]
                 text-ink-muted hover:bg-accent-tint hover:text-accent
                 active:scale-95 transition-transform duration-100"
    >
      <Icon size={20} className="transition-opacity duration-150" />
      {theme === "system" && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
      )}
    </button>
  );
}

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "system", label: "System", icon: Laptop },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="flex items-center p-1 rounded-xl bg-surface border border-hairline gap-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-accent text-white shadow-sm"
                : "text-ink-muted hover:text-ink hover:bg-accent-tint"
            }`}
          >
            <Icon size={14} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
