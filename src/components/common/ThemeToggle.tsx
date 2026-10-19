import React, { useRef, useState, useLayoutEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, type Theme } from "@/theme/context";

export function ThemeToggle() {
  const { resolvedTheme, theme, cycleTheme } = useTheme();
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      // If View Transitions API is unavailable or user requested reduced motion, fall back to pure CSS crossfade
      if (
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        cycleTheme();
        return;
      }

      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        flushSync(() => {
          cycleTheme();
        });
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 360,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {
          // Graceful fallback if clipPath animation throws
        });
    },
    [cycleTheme]
  );

  return (
    <button
      type="button"
      onClick={handleToggle}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<Theme, HTMLButtonElement | null>>({
    system: null,
    light: null,
    dark: null,
  });

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current[theme];
    if (container && activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
        ready: true,
      });
    }
  }, [theme]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useLayoutEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "system", label: "System", icon: Laptop },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Theme selection"
      className="relative flex items-center p-1 rounded-xl bg-surface border border-hairline gap-1 select-none"
    >
      {/* Sliding Active Indicator Pill */}
      <div
        aria-hidden="true"
        className={`absolute top-1 bottom-1 rounded-lg bg-accent shadow-sm pointer-events-none transition-[left,width] duration-200 ease-out ${
          indicatorStyle.ready ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />

      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[opt.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              active
                ? "text-white font-semibold"
                : "text-ink-muted hover:text-ink"
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
