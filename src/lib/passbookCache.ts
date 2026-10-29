import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";

export const PASSBOOK_STORAGE_KEY = "pg_passbook_cache";

const PASSBOOK_QUERY_PREFIXES = new Set(["dues", "payments", "me", "points"]);

/**
 * Checks if a query key belongs to the tenant passbook domain.
 */
function isPassbookKey(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;
  return queryKey[0] === "tenant" && typeof queryKey[1] === "string" && PASSBOOK_QUERY_PREFIXES.has(queryKey[1]);
}

/**
 * Dehydrates passbook queries and persists them to localStorage for instant offline cold-boot.
 */
export function savePassbookCache(client: QueryClient): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const dehydrated = dehydrate(client, {
      shouldDehydrateQuery: (query) => {
        return query.state.status === "success" && isPassbookKey(query.queryKey);
      },
    });

    if (dehydrated.queries.length > 0) {
      localStorage.setItem(PASSBOOK_STORAGE_KEY, JSON.stringify(dehydrated));
    }
  } catch {
    // QuotaExceededError or private browsing restriction: fail safe
  }
}

/**
 * Restores passbook queries from localStorage into the QueryClient cache.
 */
export function restorePassbookCache(client: QueryClient): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(PASSBOOK_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    hydrate(client, parsed);
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
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
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

