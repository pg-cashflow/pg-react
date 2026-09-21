import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode, type FC } from "react";
import { IntlProvider, useIntl } from "react-intl";
import type { SupportedLocale } from "@pg/types";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale, type LocaleOption } from "./config";
import { getStoredLocale, setStoredLocale } from "@/auth/storage";
import { updateMyPreferences } from "@/api/preferences";
import { useAuth } from "@/auth/context";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { enIN, type MessageKey } from "./messages/en-IN";
import { teIN } from "./messages/te-IN";
import { taIN } from "./messages/ta-IN";
import { knIN } from "./messages/kn-IN";

const messagesMap: Record<SupportedLocale, Record<string, string>> = {
  "en-IN": enIN,
  "te-IN": { ...enIN, ...teIN },
  "ta-IN": { ...enIN, ...taIN },
  "kn-IN": { ...enIN, ...knIN },
};

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale, persistServer?: boolean) => Promise<boolean>;
  locales: LocaleOption[];
  t: (key: MessageKey, values?: Record<string, any>) => string;
  registerAuthUpdater: (updater: ((locale: SupportedLocale) => void) | null) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const cached = getStoredLocale();
    return isSupportedLocale(cached) ? cached : DEFAULT_LOCALE;
  });

  const pendingControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const authUpdaterRef = useRef<((locale: SupportedLocale) => void) | null>(null);

  const registerAuthUpdater = useCallback((updater: ((locale: SupportedLocale) => void) | null) => {
    authUpdaterRef.current = updater;
  }, []);

  const setLocale = useCallback(
    async (newLocale: SupportedLocale, persistServer = true): Promise<boolean> => {
      if (!isSupportedLocale(newLocale)) return false;

      const seq = ++requestSeqRef.current;
      setLocaleState(newLocale);
      setStoredLocale(newLocale);

      // Local-only reconcile (e.g. returning user's saved DB pref winning over local cache)
      // must NEVER abort an in-flight server persist.
      if (!persistServer) {
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
          queryClient.setQueryData(QUERY_KEYS.preferences, res);
          authUpdaterRef.current?.(res.locale);
        }
        return true;
      } catch (err: any) {
        // Silently ignore aborted requests; warn only on genuine network/server errors
        if (!controller.signal.aborted && err?.name !== "AbortError") {
          console.warn("[i18n] Failed to persist locale preference:", err);
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

  const messages = useMemo(() => messagesMap[locale] || messagesMap[DEFAULT_LOCALE], [locale]);

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

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
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
  const { user, updateUser } = useAuth();
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
      updateUser({ locale: newLocale, has_saved_preference: true });
      if (user?.id) {
        lastConfirmedRef.current = { userId: user.id, locale: newLocale };
      }
    });
    return () => {
      registerAuthUpdater(null);
    };
  }, [registerAuthUpdater, updateUser, user?.id]);

  const attemptSync = useCallback(() => {
    const currentLocale = localeRef.current;
    if (!user?.id) {
      initialReconciledUserIdRef.current = null;
      lastConfirmedRef.current = null;
      syncInProgressRef.current = false;
      return;
    }

    if (syncInProgressRef.current) {
      return;
    }

    // 1. Initial Session Reconciliation (runs once per user login / mount)
    if (initialReconciledUserIdRef.current !== user.id) {
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
            initialReconciledUserIdRef.current = user.id;
            lastConfirmedRef.current = { userId: user.id!, locale: currentLocale };
          }
        })
        .finally(() => {
          syncInProgressRef.current = false;
        });
    }
  }, [user?.id, user?.locale, user?.has_saved_preference, setLocale]);

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

