import { CASHFREE_ENV } from "@/lib/constants";

export interface CashfreePaymentDetails {
  paymentMessage?: string;
  orderId?: string;
  paymentStatus?: string;
  [key: string]: unknown;
}

export interface CashfreeError {
  message?: string;
  code?: string;
  type?: string;
  [key: string]: unknown;
}

export interface CashfreeCheckoutRawResponse {
  paymentDetails?: CashfreePaymentDetails;
  redirect?: boolean;
  error?: CashfreeError;
}

export type CashfreeCheckoutResult =
  | { kind: "completed"; details: CashfreePaymentDetails }
  | { kind: "redirect" }
  | { kind: "error"; error?: CashfreeError };

interface CashfreeInstance {
  checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<CashfreeCheckoutRawResponse>;
}

declare global {
  interface Window {
    Cashfree?: (opts: { mode: string }) => CashfreeInstance;
  }
}

let cachedCashfreeInstance: CashfreeInstance | null = null;
let cachedCashfreeMode: string | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-pg-cashfree]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.async = true;
    s.dataset.pgCashfree = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Cashfree SDK failed to load"));
    document.head.appendChild(s);
  });
}

function getCashfreeInstance(): CashfreeInstance {
  const mode = CASHFREE_ENV === "production" ? "production" : "sandbox";
  if (cachedCashfreeInstance && cachedCashfreeMode === mode) {
    return cachedCashfreeInstance;
  }
  if (!window.Cashfree) {
    throw new Error("Cashfree SDK not initialized");
  }
  cachedCashfreeInstance = window.Cashfree({ mode });
  cachedCashfreeMode = mode;
  return cachedCashfreeInstance;
}

/**
 * Initiates Cashfree checkout via modal with precedence evaluation:
 * 1. paymentDetails -> completed (check ledger / verify)
 * 2. redirect       -> redirected (fallback for restrictive WebViews)
 * 3. error          -> error / user closed popup (check ledger before dismiss)
 */
export async function startCashfreeCheckout(paymentSessionId: string): Promise<CashfreeCheckoutResult> {
  if (!paymentSessionId) throw new Error("Missing payment session");
  await loadSdk();

  const cashfree = getCashfreeInstance();
  const res = await cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" });

  if (res?.paymentDetails) {
    return { kind: "completed", details: res.paymentDetails };
  }
  if (res?.redirect) {
    return { kind: "redirect" };
  }
  if (res?.error) {
    return { kind: "error", error: res.error };
  }

  return { kind: "completed", details: {} };
}
