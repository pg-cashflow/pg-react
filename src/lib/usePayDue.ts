import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { createTenantDuePay, verifyTenantDuePay } from "@/api/pay";
import { getMyDues } from "@/api/tenant";
import { startCashfreeCheckout, preloadCashfreeSdk } from "@/lib/cashfree";
import type { Due, PayIntent } from "@pg/types";

export type PayDueState =
  | "READY"
  | "OPENING"
  | "CHECKOUT_OPEN"
  | "CHECKING"
  | "CONFIRMING"
  | "PAID"
  | "WAIVED"
  | "STILL_PENDING"
  | "REDIRECTING";

interface UsePayDueOptions {
  onPaid?: () => void;
  onWaived?: () => void;
  onRedirect?: () => void;
  paymentMode?: "cashfree" | "manual";
  environment?: "production" | "sandbox";
}

export function usePayDue(dueId: string, options: UsePayDueOptions = {}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PayDueState>("READY");
  const [intent, setIntent] = useState<PayIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.paymentMode === "cashfree") {
      preloadCashfreeSdk().catch(() => {});
    }
  }, [options.paymentMode]);

  const optionsRef = useRef<UsePayDueOptions>(options);
  optionsRef.current = options;

  const stateRef = useRef<PayDueState>(state);
  stateRef.current = state;

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number>(0);
  const isCheckingRef = useRef(false);
  const paymentInFlightRef = useRef(false);
  const lastConfirmedRef = useRef(false);
  const lastRetryableRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const markPaid = useCallback(() => {
    clearTimer();
    setState("PAID");
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantPayments });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantProfile });
    optionsRef.current.onPaid?.();
  }, [clearTimer, queryClient]);

  const markWaived = useCallback(() => {
    clearTimer();
    setState("WAIVED");
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
    optionsRef.current.onWaived?.();
  }, [clearTimer, queryClient]);

  // Check if target due is paid/waived or explicitly retryable from server
  const checkDueStatus = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return false;
    isCheckingRef.current = true;
    let serverQueried = false;
    let serverRetryable = false;

    try {
      try {
        const verifyRes = await verifyTenantDuePay(dueId);
        serverQueried = true;
        if (verifyRes.paid || verifyRes.status === "PAID") {
          lastConfirmedRef.current = true;
          lastRetryableRef.current = false;
          markPaid();
          return true;
        }
        if (verifyRes.status === "WAIVED") {
          lastConfirmedRef.current = true;
          lastRetryableRef.current = false;
          markWaived();
          return true;
        }
        serverRetryable = verifyRes.status === "RETRYABLE" || verifyRes.status === "EXPIRED";
      } catch {
        // transient network blip or manual mode intent; fall through to query dues
      }

      try {
        const data = await queryClient.fetchQuery<Due[]>({
          queryKey: QUERY_KEYS.tenantDues,
          queryFn: getMyDues,
          staleTime: 0,
        });
        serverQueried = true;
        const dues = Array.isArray(data) ? data : ((data as any)?.dues || []);
        const match = dues.find((d: Due) => d.id === dueId);
        if (match) {
          if (match.status === "paid") {
            lastConfirmedRef.current = true;
            lastRetryableRef.current = false;
            markPaid();
            return true;
          }
          if (match.status === "waived") {
            lastConfirmedRef.current = true;
            lastRetryableRef.current = false;
            markWaived();
            return true;
          }
        }
      } catch {
        // transient network blip; keep trying
      }
      lastConfirmedRef.current = serverQueried;
      lastRetryableRef.current = serverRetryable;
      return false;
    } finally {
      isCheckingRef.current = false;
    }
  }, [dueId, markPaid, markWaived, queryClient]);


  // Poll loop: polls checkDueStatus with backoff until deadline is reached
  const startPolling = useCallback(
    (durationMs: number, onTimeoutState: PayDueState) => {
      clearTimer();
      deadlineRef.current = Date.now() + durationMs;
      const baseDelays = [2000, 2000, 3000, 4000, 5000];
      let attempt = 0;

      const tick = async () => {
        const isSettled = await checkDueStatus();
        if (isSettled) return;

        const now = Date.now();
        if (now >= deadlineRef.current) {
          clearTimer();
          // Never transition to READY on timeout unless the server explicitly classified
          // all attempts as terminal (RETRYABLE / EXPIRED). Pending stays STILL_PENDING.
          if (onTimeoutState === "READY" && lastConfirmedRef.current && lastRetryableRef.current) {
            setState("READY");
          } else {
            setState("STILL_PENDING");
          }
          return;
        }

        const plannedDelay = baseDelays[attempt] ?? 5000;
        attempt++;
        const remaining = deadlineRef.current - now;
        const delay = Math.min(plannedDelay, Math.max(500, remaining));
        pollTimerRef.current = setTimeout(tick, delay);
      };

      // Initial tick after 1s
      pollTimerRef.current = setTimeout(tick, 1000);
    },
    [checkDueStatus, clearTimer]
  );

  // Transition to CONFIRMING: immediate verify call, with polling backstop
  const enterConfirming = useCallback(async () => {
    setState("CONFIRMING");
    setError(null);

    // 1. Immediate synchronous verify call
    try {
      const verifyRes = await verifyTenantDuePay(dueId);
      if (verifyRes.paid || verifyRes.status === "PAID") {
        markPaid();
        return;
      }
      if (verifyRes.status === "WAIVED") {
        markWaived();
        return;
      }
    } catch {
      // 404 or transient error: gracefully fall back to dues polling
    }

    // 2. Backstop polling: 60s
    startPolling(60 * 1000, "STILL_PENDING");
  }, [dueId, markPaid, markWaived, startPolling]);

  // Transition to CHECKING: polls for verification. For user-initiated modal dismiss,
  // falls back to READY after short poll; for ambiguous/crash outcomes, holds unresolved STILL_PENDING (PAY-UI-01).
  const enterChecking = useCallback((onTimeoutState: PayDueState = "READY") => {
    setState("CHECKING");
    setError(null);
    startPolling(10 * 1000, onTimeoutState);
  }, [startPolling]);

  // Start payment flow: fetch intent, check payable, launch Cashfree modal
  const startPayment = useCallback(async () => {
    if (paymentInFlightRef.current || stateRef.current === "OPENING" || stateRef.current === "CHECKOUT_OPEN") return;
    paymentInFlightRef.current = true;

    setState("OPENING");
    setError(null);
    let checkoutLaunched = false;

    try {
      const p = await createTenantDuePay(dueId);
      setIntent(p);

      if (!p.payable) {
        // Non-payable can also mean an onboarding/policy restriction. Confirm
        // ledger state before showing a successful payment.
        if (!(await checkDueStatus())) {
          setState("READY");
          setError("Payment is not available for this due. Check its current status.");
        }
        return;
      }

      if (p.mode !== "cashfree" || !p.payment_session_id) {
        throw new Error("Cashfree session not available for this due");
      }

      setState("CHECKOUT_OPEN");
      checkoutLaunched = true;
      const result = await startCashfreeCheckout(p.payment_session_id, optionsRef.current.environment);

      // Precedence order per ADR-017 & Cashfree docs:
      if (result.kind === "completed") {
        await enterConfirming();
      } else if (result.kind === "redirect") {
        clearTimer();
        setState("REDIRECTING");
        optionsRef.current.onRedirect?.();
      } else if (result.kind === "ambiguous") {
        // PAY-UI-01: Ambiguous gateway state must remain in an unresolved state (STILL_PENDING)
        // rather than resetting to READY where a user could duplicate payment.
        enterChecking("STILL_PENDING");
      } else if (result.kind === "error") {
        enterChecking("READY");
      }
    } catch (err: unknown) {
      clearTimer();
      if (checkoutLaunched) {
        // PAY-UI-01 / Defect F-10: If the Cashfree SDK bridge threw or crashed after checkout launched,
        // outcome is ambiguous: do NOT reset to READY; keep unresolved state (STILL_PENDING).
        enterChecking("STILL_PENDING");
      } else {
        setState("READY");
        setError(err instanceof Error ? err.message : "Payment initialization failed");
      }
    } finally {
      paymentInFlightRef.current = false;
    }
  }, [checkDueStatus, clearTimer, dueId, enterChecking, enterConfirming]);

  // Explicit re-verify triggered from STILL_PENDING ("Check again")
  const checkAgain = useCallback(async () => {
    await enterConfirming();
  }, [enterConfirming]);

  // Handle visibilitychange: when user switches back from UPI app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const s = stateRef.current;
        if (s === "CONFIRMING" || s === "CHECKING" || s === "CHECKOUT_OPEN") {
          checkDueStatus();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkDueStatus]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    state,
    intent,
    error,
    startPayment,
    checkAgain,
    reset: () => {
      clearTimer();
      setState("READY");
      setError(null);
    },
  };
}
