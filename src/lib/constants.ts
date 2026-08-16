export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/** Must match pg-go CASHFREE_ENV (sandbox | production). */
export const CASHFREE_ENV =
  import.meta.env.VITE_CASHFREE_ENV === "production" ? "production" : "sandbox";
