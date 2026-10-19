import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type FC,
} from "react";
import { flushSync } from "react-dom";
import type { SupportedTheme } from "@pg/types";
import { updateMyPreferences } from "@/api/preferences";
import { useAuth } from "@/auth/context";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/queryKeys";

export type Theme = SupportedTheme;
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pg_theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const TRANSITION_CLASS = "theme-transition";
const TRANSITION_FALLBACK_MS = 220;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyToDocument(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#15130F" : "#FAFAF7");
}

export interface ThemeChangeOrigin {
  x: number;
  y: number;
}

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme, opts?: { origin?: ThemeChangeOrigin; persistServer?: boolean }) => Promise<boolean>;
  cycleTheme: (origin?: ThemeChangeOrigin) => void;
  registerAuthUpdater: (updater: ((theme: Theme) => void) | null) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || "system"
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(theme));

  const activeTransitionRef = useRef<ReturnType<Document["startViewTransition"]> | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const pendingControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const authUpdaterRef = useRef<((theme: Theme) => void) | null>(null);

  const registerAuthUpdater = useCallback((updater: ((theme: Theme) => void) | null) => {
    authUpdaterRef.current = updater;
  }, []);

  const applyWithSingleAnimation = useCallback((apply: () => void, origin?: ThemeChangeOrigin) => {
    if (activeTransitionRef.current) {
      try {
        activeTransitionRef.current.skipTransition();
      } catch {
        // Ignored if settled
      }
      activeTransitionRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      document.documentElement.classList.remove(TRANSITION_CLASS);
      fallbackTimerRef.current = null;
    }

    const supportsViewTransitions = typeof document.startViewTransition === "function";

    if (!supportsViewTransitions || prefersReducedMotion()) {
      document.documentElement.classList.add(TRANSITION_CLASS);
      apply();
      fallbackTimerRef.current = window.setTimeout(() => {
        document.documentElement.classList.remove(TRANSITION_CLASS);
        fallbackTimerRef.current = null;
      }, TRANSITION_FALLBACK_MS);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(apply);
    });
    activeTransitionRef.current = transition;

    // Viewport-center fallback coordinates when origin is not provided
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    transition.ready
      .then(() => {
        document.documentElement.style.willChange = "clip-path";
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
      .catch(() => {});

    transition.finished
      .catch(() => {})
      .finally(() => {
        document.documentElement.style.willChange = "";
        if (activeTransitionRef.current === transition) {
          activeTransitionRef.current = null;
        }
      });
  }, []);

  const setTheme = useCallback(
    async (
      t: Theme,
      opts?: { origin?: ThemeChangeOrigin; persistServer?: boolean }
    ): Promise<boolean> => {
      const persistServer = opts?.persistServer ?? true;
      const seq = ++requestSeqRef.current;

      applyWithSingleAnimation(() => {
        localStorage.setItem(STORAGE_KEY, t);
        setThemeState(t);
      }, opts?.origin);

      if (!persistServer) {
        return true;
      }

      pendingControllerRef.current?.abort();
      const controller = new AbortController();
      pendingControllerRef.current = controller;

      try {
        const res = await updateMyPreferences({ theme: t }, controller.signal);
        if (seq === requestSeqRef.current) {
          queryClient.setQueryData(QUERY_KEYS.preferences, res);
          authUpdaterRef.current?.((res.theme as Theme) ?? "system");
        }
        return true;
      } catch (err: any) {
        if (!controller.signal.aborted && err?.name !== "AbortError") {
          console.warn("[theme] Failed to persist theme preference:", err);
        }
        return false;
      } finally {
        if (seq === requestSeqRef.current) {
          pendingControllerRef.current = null;
        }
      }
    },
    [applyWithSingleAnimation]
  );

  const cycleTheme = useCallback(
    (origin?: ThemeChangeOrigin) => {
      void setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length], { origin });
    },
    [theme, setTheme]
  );

  useEffect(() => {
    const r = resolve(theme);
    setResolvedTheme(r);
    applyToDocument(r);

    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = getSystemTheme();
      setResolvedTheme(next);
      applyToDocument(next);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme, registerAuthUpdater }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export const ThemeSync: FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme, registerAuthUpdater } = useTheme();
  const syncInProgressRef = useRef(false);
  const initialReconciledUserIdRef = useRef<string | null>(null);
  const lastConfirmedRef = useRef<{ userId: string; theme: SupportedTheme } | null>(null);

  const themeRef = useRef<SupportedTheme>(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    registerAuthUpdater((newTheme) => {
      updateUser({ theme: newTheme, has_saved_theme: true });
      if (user?.id) {
        lastConfirmedRef.current = { userId: user.id, theme: newTheme };
      }
    });
    return () => {
      registerAuthUpdater(null);
    };
  }, [registerAuthUpdater, updateUser, user?.id]);

  const attemptSync = useCallback(() => {
    const currentTheme = themeRef.current;
    if (!user?.id) {
      initialReconciledUserIdRef.current = null;
      lastConfirmedRef.current = null;
      syncInProgressRef.current = false;
      return;
    }

    if (syncInProgressRef.current) {
      return;
    }

    // 1. Initial Session Reconciliation
    if (initialReconciledUserIdRef.current !== user.id) {
      if (user.has_saved_theme && user.theme) {
        initialReconciledUserIdRef.current = user.id;
        lastConfirmedRef.current = { userId: user.id, theme: user.theme };
        if (user.theme !== currentTheme) {
          void setTheme(user.theme, { persistServer: false });
        }
        return;
      }

      // First-time or unmigrated user: push local client selection to server
      if (!user.has_saved_theme) {
        syncInProgressRef.current = true;
        setTheme(currentTheme, { persistServer: true })
          .then((ok) => {
            if (ok) {
              initialReconciledUserIdRef.current = user.id;
              lastConfirmedRef.current = { userId: user.id!, theme: currentTheme };
            }
          })
          .finally(() => {
            syncInProgressRef.current = false;
          });
        return;
      }
    }

    // 2. Uniform unconfirmed-change retry on reconnect / refocus
    const isAlreadyConfirmed =
      lastConfirmedRef.current?.userId === user.id && lastConfirmedRef.current.theme === currentTheme;

    if (!isAlreadyConfirmed) {
      syncInProgressRef.current = true;
      setTheme(currentTheme, { persistServer: true })
        .then((ok) => {
          if (ok) {
            initialReconciledUserIdRef.current = user.id;
            lastConfirmedRef.current = { userId: user.id!, theme: currentTheme };
          }
        })
        .finally(() => {
          syncInProgressRef.current = false;
        });
    }
  }, [user?.id, user?.theme, user?.has_saved_theme, setTheme]);

  useEffect(() => {
    attemptSync();

    const handleReconnect = () => {
      if (navigator.onLine) {
        attemptSync();
      }
    };

    window.addEventListener("online", handleReconnect);
    window.addEventListener("focus", handleReconnect);
    return () => {
      window.removeEventListener("online", handleReconnect);
      window.removeEventListener("focus", handleReconnect);
    };
  }, [attemptSync]);

  return null;
};
