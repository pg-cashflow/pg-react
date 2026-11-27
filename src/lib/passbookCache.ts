import { QueryClient } from "@tanstack/react-query";
import { getStoredUser } from "@/auth/storage";

export const PASSBOOK_STORAGE_KEY = "pg_passbook_cache";
export const PASSBOOK_OPT_IN_STORAGE_KEY = "pg_passbook_offline_enabled";
export const PASSBOOK_OPT_OUT_STORAGE_KEY = "pg_passbook_offline_disabled";

/**
 * Maximum time aggregate summary remains in offline browser storage.
 * Invariant: Financial data retention is capped at 1 hour to limit local exposure.
 */
export const PASSBOOK_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

const PASSBOOK_QUERY_PREFIXES = new Set(["dues", "payments", "points"]);

export interface OfflinePassbookSummary {
  outstanding_total: number;
  pending_due_count: number;
  next_due_date: string | null;
  next_due_amount: number | null;
  total_paid: number;
  saved_at: number;
}

interface StoredPassbookEnvelope {
  version: 2;
  userId: string;
  savedAt: number;
  summary: Omit<OfflinePassbookSummary, "saved_at">;
}

function isPassbookKey(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;
  return queryKey[0] === "tenant" && typeof queryKey[1] === "string" && PASSBOOK_QUERY_PREFIXES.has(queryKey[1]);
}

export function isPassbookOfflineEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PASSBOOK_OPT_IN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isPassbookOfflineDisabled(): boolean {
  return !isPassbookOfflineEnabled();
}

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

export function setPassbookOfflineDisabled(disabled: boolean): void {
  setPassbookOfflineEnabled(!disabled);
}

function readValidEnvelope(): StoredPassbookEnvelope | null {
  try {
    if (typeof window === "undefined") return null;
    if (!isPassbookOfflineEnabled()) {
      clearPassbookCache();
      return null;
    }
    const raw = localStorage.getItem(PASSBOOK_STORAGE_KEY);
    if (!raw) return null;
    if (raw.length > 16_384) {
      clearPassbookCache();
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredPassbookEnvelope>;
    const user = getStoredUser();
    const now = Date.now();
    if (
      parsed.version !== 2 ||
      user?.role !== "tenant" ||
      parsed.userId !== user.id ||
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt) ||
      now - parsed.savedAt > PASSBOOK_MAX_AGE_MS ||
      parsed.savedAt > now ||
      !parsed.summary ||
      typeof parsed.summary.outstanding_total !== "number" ||
      typeof parsed.summary.pending_due_count !== "number" ||
      typeof parsed.summary.total_paid !== "number"
    ) {
      clearPassbookCache();
      return null;
    }
    return parsed as StoredPassbookEnvelope;
  } catch {
    clearPassbookCache();
    return null;
  }
}

export function getPassbookLastSync(): number | null {
  const env = readValidEnvelope();
  return env ? env.savedAt : null;
}

export function getOfflinePassbookSummary(): OfflinePassbookSummary | null {
  const env = readValidEnvelope();
  if (!env) return null;
  return {
    outstanding_total: env.summary.outstanding_total,
    pending_due_count: env.summary.pending_due_count,
    next_due_date: env.summary.next_due_date ?? null,
    next_due_amount: env.summary.next_due_amount ?? null,
    total_paid: env.summary.total_paid,
    saved_at: env.savedAt,
  };
}

/**
 * Computes and persists an allowlisted aggregate-only summary DTO to localStorage
 * when the user has explicitly opted in. Never stores individual due/payment records,
 * internal IDs, or transaction references.
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

    const duesData = client.getQueryData<Array<Record<string, unknown>>>(["tenant", "dues"]);
    const paymentsData = client.getQueryData<Array<Record<string, unknown>>>(["tenant", "payments"]);

    if (!Array.isArray(duesData) && !Array.isArray(paymentsData)) {
      localStorage.removeItem(PASSBOOK_STORAGE_KEY);
      return;
    }

    let outstandingTotal = 0;
    let pendingDueCount = 0;
    let nextDueDate: string | null = null;
    let nextDueAmount: number | null = null;

    if (Array.isArray(duesData)) {
      const openDues = duesData
        .filter((d) => (d.status === "pending" || d.status === "partial") && typeof d.amount === "number" && d.amount > 0)
        .sort((a, b) => String(a.due_date ?? "").localeCompare(String(b.due_date ?? "")));
      pendingDueCount = openDues.length;
      for (const d of openDues) {
        outstandingTotal += Number(d.amount);
      }
      if (openDues.length > 0) {
        nextDueDate = typeof openDues[0].due_date === "string" ? openDues[0].due_date : null;
        nextDueAmount = typeof openDues[0].amount === "number" ? openDues[0].amount : null;
      }
    }

    let totalPaid = 0;
    if (Array.isArray(paymentsData)) {
      for (const p of paymentsData) {
        if (typeof p.amount === "number" && p.amount > 0 && (p.status === undefined || p.status === "paid" || p.status === "success")) {
          totalPaid += p.amount;
        }
      }
    }

    const envelope: StoredPassbookEnvelope = {
      version: 2,
      userId: user.id,
      savedAt: Date.now(),
      summary: {
        outstanding_total: outstandingTotal,
        pending_due_count: pendingDueCount,
        next_due_date: nextDueDate,
        next_due_amount: nextDueAmount,
        total_paid: totalPaid,
      },
    };
    localStorage.setItem(PASSBOOK_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // QuotaExceededError or private browsing restriction: fail safe
  }
}

/**
 * Validates any stored offline summary on cold boot (enforcing user isolation and 1h TTL)
 * without hydrating individual financial records into TanStack Query.
 */
export function restorePassbookCache(_client: QueryClient): void {
  readValidEnvelope();
}

export function clearPassbookCache(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PASSBOOK_STORAGE_KEY);
  } catch {}
}

export function setupPassbookCache(client: QueryClient): () => void {
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
