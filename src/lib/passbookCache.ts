import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { getStoredUser } from "@/auth/storage";

export const PASSBOOK_STORAGE_KEY = "pg_passbook_cache";
export const PASSBOOK_OPT_IN_STORAGE_KEY = "pg_passbook_offline_enabled";
export const PASSBOOK_OPT_OUT_STORAGE_KEY = "pg_passbook_offline_disabled";

/**
 * Maximum time financial records remain in offline browser storage.
 * Invariant: Financial data retention is capped at 1 hour (down from 24h) to limit local exposure.
 */
export const PASSBOOK_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

const PASSBOOK_QUERY_PREFIXES = new Set(["dues", "payments", "points"]);

/**
 * Checks if a query key belongs to the tenant passbook domain.
 */
function isPassbookKey(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;
  return queryKey[0] === "tenant" && typeof queryKey[1] === "string" && PASSBOOK_QUERY_PREFIXES.has(queryKey[1]);
}

/**
 * Returns true if the user has explicitly opted into offline passbook storage in localStorage.
 * Default is FALSE (TanStack Query in-memory caching only, zero localStorage exposure by default).
 */
export function isPassbookOfflineEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PASSBOOK_OPT_IN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Returns true if offline passbook storage is disabled.
 * In-memory by default, so offline localStorage is disabled unless opted in.
 */
export function isPassbookOfflineDisabled(): boolean {
  return !isPassbookOfflineEnabled();
}

/**
 * Sets user preference for offline passbook storage.
 * If enabling, sets opt-in key. If disabling, removes key and purges cached passbook data.
 */
export function setPassbookOfflineEnabled(enabled: boolean): void {
  try {
    if (typeof window === "undefined") return;
    if (enabled) {
      localStorage.setItem(PASSBOOK_OPT_IN_STORAGE_KEY, "true");
      localStorage.removeItem(PASSBOOK_OPT_OUT_STORAGE_KEY);
    } else {
      localStorage.removeItem(PASSBOOK_OPT_IN_STORAGE_KEY);
      localStorage.setItem(PASSBOOK_OPT_OUT_STORAGE_KEY, "true");
      clearPassbookCache();
    }
  } catch {}
}

/**
 * Sets user preference for offline passbook storage (disabled = !enabled).
 */
export function setPassbookOfflineDisabled(disabled: boolean): void {
  setPassbookOfflineEnabled(!disabled);
}

/**
 * Returns the timestamp when passbook data was last saved to offline storage, or null if empty.
 */
export function getPassbookLastSync(): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(PASSBOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed.savedAt === "number" ? parsed.savedAt : null;
  } catch {
    return null;
  }
}

/**
 * Dehydrates passbook queries and persists them to localStorage for instant offline cold-boot.
 */
export function savePassbookCache(client: QueryClient): void {
  try {
    if (typeof window === "undefined") return;
    if (!isPassbookOfflineEnabled()) {
      localStorage.removeItem(PASSBOOK_STORAGE_KEY);
      return;
    }

    const user = getStoredUser();
    if (!user?.id || user.role !== "tenant") return;
    const dehydrated = dehydrate(client, {
      shouldDehydrateQuery: (query) => {
        return query.state.status === "success" && isPassbookKey(query.queryKey);
      },
    });

    if (dehydrated.queries.length > 0) {
      const raw = JSON.stringify({ version: 1, userId: user.id, savedAt: Date.now(), state: dehydrated });
      // Bound synchronous storage work on the main thread.
      if (raw.length <= 500_000) localStorage.setItem(PASSBOOK_STORAGE_KEY, raw);
      else localStorage.removeItem(PASSBOOK_STORAGE_KEY);
    } else {
      localStorage.removeItem(PASSBOOK_STORAGE_KEY);
    }
  } catch {
    // QuotaExceededError or private browsing restriction: fail safe
  }
}

/**
 * Restores passbook queries from localStorage into the QueryClient cache.
 */
export function restorePassbookCache(client: QueryClient): void {
  try {
    if (typeof window === "undefined") return;
    if (!isPassbookOfflineEnabled()) {
      clearPassbookCache();
      return;
    }

    const raw = localStorage.getItem(PASSBOOK_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const user = getStoredUser();
    if (
      raw.length > 500_000 ||
      parsed.version !== 1 ||
      user?.role !== "tenant" ||
      parsed.userId !== user.id ||
      !Number.isFinite(parsed.savedAt) ||
      Date.now() - parsed.savedAt > PASSBOOK_MAX_AGE_MS ||
      parsed.savedAt > Date.now() ||
      !Array.isArray(parsed.state?.queries)
    ) {
      clearPassbookCache();
      return;
    }
    hydrate(client, {
      mutations: [],
      queries: parsed.state.queries.filter((query: { queryKey: readonly unknown[] }) => isPassbookKey(query.queryKey)),
    });
  } catch {
    // Malformed JSON or outdated structure: purge corrupt key
    try {
      localStorage.removeItem(PASSBOOK_STORAGE_KEY);
    } catch {}
  }
}

/**
 * Purges the offline passbook cache from localStorage on user logout.
 */
export function clearPassbookCache(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PASSBOOK_STORAGE_KEY);
  } catch {}
}

/**
 * Subscribes to QueryClient mutations and updates the passbook cache with debouncing.
 */
export function setupPassbookCache(client: QueryClient): () => void {
  // Rehydrate on bootstrap
  restorePassbookCache(client);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      savePassbookCache(client);
      saveTimer = null;
    }, 300);
  };

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (
      event.type === "updated" &&
      event.action.type === "success" &&
      isPassbookKey(event.query.queryKey)
    ) {
      debouncedSave();
    }
  });

  return () => {
    if (saveTimer) clearTimeout(saveTimer);
    unsubscribe();
  };
}
