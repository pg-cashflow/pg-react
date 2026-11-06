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
  | { kind: "error"; error?: CashfreeError }
  | { kind: "ambiguous" };

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
let sdkPromise: Promise<void> | null = null;

export function _resetCashfreeInstanceForTests(): void {
  cachedCashfreeInstance = null;
  cachedCashfreeMode = null;
  sdkPromise = null;
}

export function preloadCashfreeSdk(): Promise<void> {
  return loadSdk();
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pg-cashfree]");
    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      clearTimeout(timeout);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const fail = (message: string) => {
      cleanup();
      // A failed script never fires load again. Remove it so the next user
      // action can make a fresh request rather than wait on a dead element.
      script.remove();
      sdkPromise = null;
      reject(new Error(message));
    };
    const onLoad = () => {
      if (!window.Cashfree) {
        fail("Cashfree SDK did not initialize");
        return;
      }
      cleanup();
      resolve();
    };
    const onError = () => fail("Cashfree SDK failed to load");
    const timeout = setTimeout(() => fail("Cashfree SDK failed to load (timeout)"), 10000);
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.dataset.pgCashfree = "1";
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
}

export function getCashfreeInstance(runtimeMode?: "production" | "sandbox"): CashfreeInstance {
  const mode = (runtimeMode || CASHFREE_ENV) === "production" ? "production" : "sandbox";
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

export interface StartCashfreeCheckoutOptions {
  runtimeMode?: "production" | "sandbox";
  redirectTarget?: "_modal" | "_self" | "_top";
}

/**
 * Initiates Cashfree checkout via modal with precedence evaluation:
 * 1. paymentDetails -> completed (check ledger / verify)
 * 2. redirect       -> redirected (fallback for restrictive WebViews)
 * 3. error          -> error / user closed popup (check ledger before dismiss)
 */
export async function startCashfreeCheckout(
  paymentSessionId: string,
  runtimeModeOrOptions?: "production" | "sandbox" | StartCashfreeCheckoutOptions
): Promise<CashfreeCheckoutResult> {
  if (!paymentSessionId) throw new Error("Missing payment session");
  await loadSdk();

  const options: StartCashfreeCheckoutOptions =
    typeof runtimeModeOrOptions === "object"
      ? runtimeModeOrOptions
      : { runtimeMode: runtimeModeOrOptions };

  const cashfree = getCashfreeInstance(options.runtimeMode);
  const redirectTarget = options.redirectTarget || "_modal";
  const res = await cashfree.checkout({ paymentSessionId, redirectTarget });

  if (res?.paymentDetails) {
    return { kind: "completed", details: res.paymentDetails };
  }
  if (res?.redirect) {
    return { kind: "redirect" };
  }
  if (res?.error) {
    return { kind: "error", error: res.error };
  }

  return { kind: "ambiguous" };
}
