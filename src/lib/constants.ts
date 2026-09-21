function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed === "http://localhost:8080" || trimmed === "http://127.0.0.1:8080") {
    return `${trimmed}/api`;
  }
  return trimmed || "http://localhost:8080/api";
}

/** pg-go data routes live under /api. Production embed uses `/api`. */
export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api");

/** Must match pg-go CASHFREE_ENV (sandbox | production). */
export const CASHFREE_ENV =
  import.meta.env.VITE_CASHFREE_ENV === "production" ? "production" : "sandbox";
