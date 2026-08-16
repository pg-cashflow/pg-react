import { CASHFREE_ENV } from "@/lib/constants";

declare global {
  interface Window {
    Cashfree?: (opts: { mode: string }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<unknown>;
    };
  }
}

function loadSdk(): Promise<void> {
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

export async function startCashfreeCheckout(paymentSessionId: string): Promise<void> {
  if (!paymentSessionId) throw new Error("Missing payment session");
  await loadSdk();
  if (!window.Cashfree) throw new Error("Cashfree checkout is unavailable");
  const mode = CASHFREE_ENV === "production" ? "production" : "sandbox";
  const cashfree = window.Cashfree({ mode });
  await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}
