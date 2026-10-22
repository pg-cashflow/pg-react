import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { getTenantDuePay, verifyTenantDuePay } from "@/api/pay";
import { getMyDues } from "@/api/tenant";
import { startCashfreeCheckout } from "@/lib/cashfree";
import type { Due, PayIntent } from "@pg/types";

export type PayDueState =
  | "READY"
  | "OPENING"
  | "CHECKOUT_OPEN"
  | "CHECKING"
  | "CONFIRMING"
  | "PAID"
  | "STILL_PENDING"
  | "REDIRECTING";

interface UsePayDueOptions {
  onPaid?: () => void;
  onRedirect?: () => void;
}

export function usePayDue(dueId: string, options: UsePayDueOptions = {}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PayDueState>("READY");
  const [intent, setIntent] = useState<PayIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef<UsePayDueOptions>(options);
  optionsRef.current = options;

  const stateRef = useRef<PayDueState>(state);
  stateRef.current = state;

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number>(0);

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

  // Check if target due is paid from server via verify endpoint or query client cache
  const checkDueStatus = useCallback(async (): Promise<boolean> => {
    try {
      const verifyRes = await verifyTenantDuePay(dueId);
      if (verifyRes.paid) {
        markPaid();
        return true;
      }
    } catch {
      // transient network blip or manual mode intent; fall through to query dues
    }

    try {
      const data = await queryClient.fetchQuery<Due[]>({
        queryKey: QUERY_KEYS.tenantDues,
        queryFn: getMyDues,
        staleTime: 0,
      });
      const dues = Array.isArray(data) ? data : ((data as any)?.dues || []);
      const match = dues.find((d: Due) => d.id === dueId);
      if (match && (match.status === "paid" || match.status === "waived")) {
        markPaid();
        return true;
      }
    } catch {
      // transient network blip; keep trying
    }
    return false;
  }, [dueId, markPaid, queryClient]);


  // Poll loop: polls checkDueStatus every intervalMs until deadline is reached
  const startPolling = useCallback(
    (durationMs: number, onTimeoutState: PayDueState) => {
      clearTimer();
      deadlineRef.current = Date.now() + durationMs;

      const tick = async () => {
        const isPaid = await checkDueStatus();
        if (isPaid) return;

        if (Date.now() >= deadlineRef.current) {
          clearTimer();
          setState(onTimeoutState);
          return;
        }

        pollTimerRef.current = setTimeout(tick, 2000);
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
      if (verifyRes.paid) {
        markPaid();
        return;
      }
    } catch {
      // 404 or transient error: gracefully fall back to dues polling
    }

    // 2. Backstop polling: 60s
    startPolling(60 * 1000, "STILL_PENDING");
  }, [dueId, markPaid, startPolling]);

  // Transition to CHECKING (after modal dismissal/error): poll for ~10s
  const enterChecking = useCallback(() => {
    setState("CHECKING");
    setError(null);
    startPolling(10 * 1000, "READY");
  }, [startPolling]);

  // Start payment flow: fetch intent, check payable, launch Cashfree modal
  const startPayment = useCallback(async () => {
    if (stateRef.current === "OPENING" || stateRef.current === "CHECKOUT_OPEN") return;

    setState("OPENING");
    setError(null);

    try {
      const p = await getTenantDuePay(dueId);
      setIntent(p);

      if (!p.payable) {
        // Due is already paid or waived
        markPaid();
        return;
      }

      if (p.mode !== "cashfree" || !p.payment_session_id) {
        throw new Error("Cashfree session not available for this due");
      }

      setState("CHECKOUT_OPEN");
      const result = await startCashfreeCheckout(p.payment_session_id);

      // Precedence order per ADR-017 & Cashfree docs:
      if (result.kind === "completed") {
        await enterConfirming();
      } else if (result.kind === "redirect") {
        clearTimer();
        setState("REDIRECTING");
        optionsRef.current.onRedirect?.();
      } else if (result.kind === "error") {
        enterChecking();
      }
    } catch (err: unknown) {
      clearTimer();
      setState("READY");
      setError(err instanceof Error ? err.message : "Payment initialization failed");
    }
  }, [clearTimer, dueId, enterChecking, enterConfirming, markPaid]);

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
