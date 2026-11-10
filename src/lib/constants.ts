function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed === "http://localhost:8080" || trimmed === "http://127.0.0.1:8080") {
    return `${trimmed}/api`;
  }
  return trimmed || "/api";
}

/** pg-go data routes live under /api. Production embed and dev proxy use `/api`. */
export const API_BASE = normalizeApiBase(
  import.meta.env.VITE_API_BASE_URL || "/api"
);

/** Must match pg-go CASHFREE_ENV (sandbox | production). */
export const CASHFREE_ENV =
  import.meta.env.VITE_CASHFREE_ENV === "production" ? "production" : "sandbox";

/**
 * Refund window in days. Must equal pg-go REFUND_WINDOW_DAYS (1..120).
 * Falls back to 120, the backend default, when unset or invalid.
 */
const parsedRefundWindow = Number(import.meta.env.VITE_REFUND_WINDOW_DAYS);
export const REFUND_WINDOW_DAYS =
  Number.isInteger(parsedRefundWindow) && parsedRefundWindow >= 1 && parsedRefundWindow <= 120
    ? parsedRefundWindow
    : 120;

