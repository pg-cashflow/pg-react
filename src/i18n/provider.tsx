import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode, type FC } from "react";
import { IntlProvider, useIntl } from "react-intl";
import type { SupportedLocale } from "@pg/types";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale, type LocaleOption } from "./config";
import { getStoredLocale, setStoredLocale } from "@/auth/storage";
import { getAccessToken } from "@/auth/tokenStore";
import { updateMyPreferences } from "@/api/preferences";
import { useAuth } from "@/auth/context";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { enIN, type MessageKey } from "./messages/en-IN";

const localeLoaders: Record<SupportedLocale, () => Promise<Record<string, string>>> = {
  "en-IN": async () => enIN,
  "te-IN": async () => {
    const mod = await import("./messages/te-IN");
    return { ...enIN, ...mod.teIN };
  },
  "ta-IN": async () => {
    const mod = await import("./messages/ta-IN");
    return { ...enIN, ...mod.taIN };
  },
  "kn-IN": async () => {
    const mod = await import("./messages/kn-IN");
    return { ...enIN, ...mod.knIN };
  },
};

const loadedMessages: Partial<Record<SupportedLocale, Record<string, string>>> = {
  "en-IN": enIN,
};

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale, persistServer?: boolean) => Promise<boolean>;
  locales: LocaleOption[];
  t: (key: MessageKey, values?: Record<string, any>) => string;
  registerAuthUpdater: (updater: ((locale: SupportedLocale) => void) | null, isAuthenticated?: boolean) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  children: ReactNode;
}

const PENDING_LOCALE_KEY = "pg_locale_pending";

export const LocaleProvider: FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const cached = getStoredLocale();
    return isSupportedLocale(cached) ? cached : DEFAULT_LOCALE;
  });

  const pendingControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const authUpdaterRef = useRef<((locale: SupportedLocale) => void) | null>(null);
  const isAuthenticatedRef = useRef<boolean>(false);

  const registerAuthUpdater = useCallback((updater: ((locale: SupportedLocale) => void) | null, isAuth?: boolean) => {
    authUpdaterRef.current = updater;
    if (isAuth !== undefined) {
      isAuthenticatedRef.current = isAuth;
    }
  }, []);

  const setLocale = useCallback(
    async (newLocale: SupportedLocale, persistServer = true): Promise<boolean> => {
      if (!isSupportedLocale(newLocale)) return false;

      const seq = ++requestSeqRef.current;
      setLocaleState(newLocale);
      setStoredLocale(newLocale);

      // Local-only reconcile (e.g. returning user's saved DB pref winning over local cache)
      // must NEVER abort an in-flight server persist.
      const hasAuth =
        authUpdaterRef.current === null ||
        isAuthenticatedRef.current ||
        Boolean(getAccessToken());
      if (!persistServer || !hasAuth) {
        return true;
      }

      // Abort previous in-flight persist request before issuing a new one
      pendingControllerRef.current?.abort();
      const controller = new AbortController();
      pendingControllerRef.current = controller;

      try {
        const res = await updateMyPreferences({ locale: newLocale }, controller.signal);

        // Discard result if superseded by a newer call while in-flight
        if (seq === requestSeqRef.current) {
          try {
            localStorage.removeItem(PENDING_LOCALE_KEY);
          } catch {
            // ignore
          }
          queryClient.setQueryData(QUERY_KEYS.preferences, res);
          authUpdaterRef.current?.(res.locale);
          return true;
        }
        return false;
      } catch (err: any) {
        // Silently ignore aborted requests; warn only on genuine network/server errors
        if (!controller.signal.aborted && err?.name !== "AbortError") {
          const is401 =
            err?.status === 401 ||
            err?.statusCode === 401 ||
            err?.message?.includes("unauthorized") ||
            err?.message?.includes("Session expired");

          if (is401) {
            try {
              localStorage.removeItem(PENDING_LOCALE_KEY);
            } catch {
              // ignore
            }
            return false;
          }

          console.warn("[i18n] Failed to persist locale preference:", err);
          try {
            localStorage.setItem(PENDING_LOCALE_KEY, newLocale);
          } catch {
            // ignore
          }
        }
        return false;
      } finally {
        if (seq === requestSeqRef.current) {
          pendingControllerRef.current = null;
        }
      }
    },
    []
  );

  const [messages, setMessages] = useState<Record<string, string>>(
    () => loadedMessages[locale] || enIN
  );

  useEffect(() => {
    if (loadedMessages[locale]) {
      setMessages(loadedMessages[locale]!);
      return;
    }
    let isMounted = true;
    const loader = localeLoaders[locale] || localeLoaders[DEFAULT_LOCALE];
    loader()
      .then((msgs) => {
        loadedMessages[locale] = msgs;
        if (isMounted) {
          setMessages(msgs);
        }
      })
      .catch((err) => {
        console.warn(`[i18n] Failed to load messages for ${locale}:`, err);
        if (isMounted) {
          setMessages(enIN);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [locale]);

  // Keep the document language in step with the UI language.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider
      locale={locale}
      defaultLocale={DEFAULT_LOCALE}
      messages={messages}
      onError={(err) => {
        // Suppress missing translation errors in production and fall back seamlessly
        if (import.meta.env.DEV) {
          console.warn("[i18n]", err.message);
        }
      }}
    >
      <LocaleInternalProvider
        locale={locale}
        setLocale={setLocale}
        locales={SUPPORTED_LOCALES}
        registerAuthUpdater={registerAuthUpdater}
      >
        {children}
      </LocaleInternalProvider>
    </IntlProvider>
  );
};

const LocaleInternalProvider: FC<{
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale, persistServer?: boolean) => Promise<boolean>;
  locales: LocaleOption[];
  registerAuthUpdater: (updater: ((locale: SupportedLocale) => void) | null) => void;
  children: ReactNode;
}> = ({ locale, setLocale, locales, registerAuthUpdater, children }) => {
  const intl = useIntl();

  const t = useCallback(
    (key: MessageKey, values?: Record<string, any>): string => {
      try {
        return intl.formatMessage({ id: key }, values);
      } catch {
        return enIN[key] || key;
      }
    },
    [intl]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      locales,
      t,
      registerAuthUpdater,
    }),
    [locale, setLocale, locales, t, registerAuthUpdater]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

const defaultFallbackContext: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: async () => false,
  locales: SUPPORTED_LOCALES,
  t: (key: MessageKey, values?: Record<string, any>) => {
    let msg = enIN[key] || key;
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        msg = msg.replace(new RegExp(`\\{${k}[^}]*\\}`, "g"), String(v));
      });
    }
    return msg;
  },
  registerAuthUpdater: () => {},
};

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  return ctx || defaultFallbackContext;
}

/**
 * LocaleSync component mounted inside AuthProvider.
 * Observes user authentication and syncs server locale with the client:
 * - On session mount: If returning user has an explicit saved preference in DB, server preference wins.
 * - If user has NO saved preference (first-time login): pre-login selection is preserved, pushed to server.
 * - Tracks lastConfirmedRef to ensure ANY unpersisted change (initial push OR failed in-session change)
 *   automatically retries on network reconnect (online event) or tab/PWA refocus (focus event).
 */
export const LocaleSync: FC = () => {
  const { user, updateUser, isAuthenticated, isLoading } = useAuth();
  const { locale, setLocale, registerAuthUpdater } = useLocale();
  const syncInProgressRef = useRef<boolean>(false);
  const initialReconciledUserIdRef = useRef<string | null>(null);
  const lastConfirmedRef = useRef<{ userId: string; locale: SupportedLocale } | null>(null);

  // Keep latest locale in ref so attemptSync can read current value without re-triggering on user clicks
  const localeRef = useRef<SupportedLocale>(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  // Wire auth updateUser to the provider's write path
  useEffect(() => {
    registerAuthUpdater((newLocale) => {
      try {
        localStorage.removeItem(PENDING_LOCALE_KEY);
      } catch {
        // ignore
      }
      updateUser({ locale: newLocale, has_saved_preference: true });
      if (user?.id) {
        lastConfirmedRef.current = { userId: user.id, locale: newLocale };
      }
    }, isAuthenticated);
    return () => {
      registerAuthUpdater(null, false);
    };
  }, [registerAuthUpdater, updateUser, user?.id, isAuthenticated]);

  const attemptSync = useCallback(() => {
    const currentLocale = localeRef.current;
    if (isLoading || !isAuthenticated || !user?.id) {
      if (!isLoading && !isAuthenticated) {
        initialReconciledUserIdRef.current = null;
        lastConfirmedRef.current = null;
        syncInProgressRef.current = false;
      }
      return;
    }

    if (syncInProgressRef.current) {
      return;
    }

    // 1. Initial Session Reconciliation (runs once per user login / mount)
    if (initialReconciledUserIdRef.current !== user.id) {
      let pendingLocale: string | null = null;
      try {
        pendingLocale = localStorage.getItem(PENDING_LOCALE_KEY);
      } catch {
        // ignore
      }

      if (pendingLocale && isSupportedLocale(pendingLocale)) {
        // User has an unconfirmed local pick: do NOT overwrite with server value.
        // Instead, push local choice to server.
        initialReconciledUserIdRef.current = user.id;
        syncInProgressRef.current = true;
        setLocale(pendingLocale as SupportedLocale, true)
          .then((ok) => {
            if (ok) {
              try {
                localStorage.removeItem(PENDING_LOCALE_KEY);
              } catch {
                // ignore
              }
              lastConfirmedRef.current = { userId: user.id!, locale: pendingLocale as SupportedLocale };
            }
          })
          .finally(() => {
            syncInProgressRef.current = false;
          });
        return;
      }

      if (user.has_saved_preference && user.locale && isSupportedLocale(user.locale)) {
        // Returning user: saved DB preference is authoritative over device's anonymous cache
        initialReconciledUserIdRef.current = user.id;
        lastConfirmedRef.current = { userId: user.id, locale: user.locale as SupportedLocale };
        if (user.locale !== currentLocale) {
          setLocale(user.locale as SupportedLocale, false);
        }
        return;
      }

      if (!user.has_saved_preference) {
        // First-time user: push client pre-login pick to server
        syncInProgressRef.current = true;
        setLocale(currentLocale, true)
          .then((ok) => {
            if (ok) {
              try {
                localStorage.removeItem(PENDING_LOCALE_KEY);
              } catch {
                // ignore
              }
              initialReconciledUserIdRef.current = user.id;
              lastConfirmedRef.current = { userId: user.id!, locale: currentLocale };
            }
          })
          .finally(() => {
            syncInProgressRef.current = false;
          });
        return;
      }
    }

    // 2. Uniform unconfirmed-change retry for both initial and in-session modifications
    const isAlreadyConfirmed =
      lastConfirmedRef.current?.userId === user.id && lastConfirmedRef.current.locale === currentLocale;

    if (!isAlreadyConfirmed) {
      syncInProgressRef.current = true;
      setLocale(currentLocale, true)
        .then((ok) => {
          if (ok) {
            try {
              localStorage.removeItem(PENDING_LOCALE_KEY);
            } catch {
              // ignore
            }
            initialReconciledUserIdRef.current = user.id;
            lastConfirmedRef.current = { userId: user.id!, locale: currentLocale };
          }
        })
        .finally(() => {
          syncInProgressRef.current = false;
        });
    }
  }, [user?.id, user?.locale, user?.has_saved_preference, setLocale, isAuthenticated, isLoading]);

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

