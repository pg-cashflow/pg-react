import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { verifyOrderPay, verifyTenantDuePay } from "@/api/pay";
import { getMyDues } from "@/api/tenant";
import { useLocale } from "@/i18n";
import { useAuth } from "@/auth/context";
import type { Due } from "@pg/types";

export const PaymentReturnView: React.FC = () => {
  const { t } = useLocale();
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"CONFIRMING" | "PAID" | "WAIVED" | "STILL_PENDING">("CONFIRMING");
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract query params from location search
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const dueId = searchParams.get("due_id") || "";
  const orderId = searchParams.get("order_id") || "";

  const markPaid = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setStatus("PAID");
    if (role === "owner") {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dues() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
    } else {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantPayments });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantProfile });
    }
  }, [queryClient, role]);

  const markWaived = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setStatus("WAIVED");
    if (role === "owner") {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dues() });
    } else {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
    }
  }, [queryClient, role]);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (role !== "owner") {
      try {
        const data = await queryClient.fetchQuery<Due[]>({
          queryKey: QUERY_KEYS.tenantDues,
          queryFn: getMyDues,
          staleTime: 0,
        });
        const dues = Array.isArray(data) ? data : ((data as any)?.dues || []);
        if (dueId) {
          const match = dues.find((d: Due) => d.id === dueId);
          if (match) {
            if (match.status === "paid") {
              markPaid();
              return true;
            }
            if (match.status === "waived") {
              markWaived();
              return true;
            }
          }
        }
      } catch {
        // transient query error
      }
    }
    return false;
  }, [dueId, markPaid, markWaived, queryClient, role]);

  useEffect(() => {
    let active = true;
    const deadline = Date.now() + 60 * 1000;
    let delay = 1500;
    let inFlight = false;

    const executeVerify = async (): Promise<boolean> => {
      if (inFlight) return false;
      inFlight = true;
      try {
        // 1. Order-ID-based verification
        if (orderId) {
          try {
            const res = await verifyOrderPay(orderId);
            if (active && res.paid) {
              markPaid();
              return true;
            }
          } catch {
            // ignore error; proceed to dues polling
          }
        }

        // 2. Due-ID-based verification fallback for tenant
        if (dueId && role !== "owner") {
          try {
            const res = await verifyTenantDuePay(dueId);
            if (active && res.paid) {
              markPaid();
              return true;
            }
          } catch {
            // ignore error; proceed to dues polling
          }
        }

        // 3. Check dues list for settled status
        return await checkStatus();
      } finally {
        inFlight = false;
      }
    };

    // Sequential polling loop with backoff (no overlapping executions)
    const poll = async () => {
      if (!active) return;
      const isSettled = await executeVerify();
      if (isSettled || !active) return;

      if (Date.now() >= deadline) {
        setStatus("STILL_PENDING");
        return;
      }

      delay = Math.min(delay + 500, 4000);
      pollTimerRef.current = setTimeout(poll, delay);
    };

    // Kick off immediate first check, then backstop polling triggers only after
    executeVerify().then((settled) => {
      if (!settled && active) {
        pollTimerRef.current = setTimeout(poll, delay);
      }
    });

    return () => {
      active = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [checkStatus, dueId, orderId, markPaid, role]);

  const handleReturn = () => {
    if (role === "owner") {
      navigate({ to: "/owner/dues" });
    } else {
      navigate({ to: "/tenant" });
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pt-12">
      <div className="text-center space-y-2">
        <h1 className="t-h2 font-bold text-ink">{t("payreturn.title")}</h1>
        {orderId && <p className="t-caption text-ink-muted">Reference: {orderId}</p>}
      </div>

      {status === "PAID" ? (
        <div className="p-6 rounded-[16px] bg-success-tint border border-success/20 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <div>
            <h2 className="t-h3 font-semibold text-ink">{t("payreturn.received")}</h2>
            <p className="t-body text-ink-muted mt-1">{t("payreturn.receivedDesc")}</p>
          </div>
          <button
            onClick={handleReturn}
            className="w-full h-11 inline-flex items-center justify-center rounded-[10px] bg-accent text-white font-semibold hover:opacity-95 transition-opacity"
          >
            {t("payreturn.backToDues")}
          </button>
        </div>
      ) : status === "WAIVED" ? (
        <div className="p-6 rounded-[16px] bg-surface border border-hairline text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
          <div>
            <h2 className="t-h3 font-semibold text-ink">{t("payreturn.waived")}</h2>
            <p className="t-body text-ink-muted mt-1">{t("payreturn.waivedDesc")}</p>
          </div>
          <button
            onClick={handleReturn}
            className="w-full h-11 inline-flex items-center justify-center rounded-[10px] bg-accent text-white font-semibold hover:opacity-95 transition-opacity"
          >
            {t("payreturn.backToDues")}
          </button>
        </div>
      ) : status === "CONFIRMING" ? (
        <div className="p-6 rounded-[16px] bg-surface border border-hairline text-center space-y-4">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
          <div>
            <h2 className="t-h3 font-semibold text-ink">{t("payreturn.verifying")}</h2>
            <p className="t-body text-ink-muted mt-1">{t("payreturn.verifyingDesc")}</p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-[16px] bg-surface border border-hairline text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-accent mx-auto" />
          <div>
            <h2 className="t-h3 font-semibold text-ink">{t("payreturn.inProgress")}</h2>
            <p className="t-body text-ink-muted mt-1">{t("payreturn.inProgressDesc")}</p>
          </div>
          <button
            onClick={handleReturn}
            className="w-full h-11 inline-flex items-center justify-center rounded-[10px] border border-hairline bg-surface text-ink font-semibold hover:bg-bg transition-colors gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("payreturn.backToDues")}
          </button>
        </div>
      )}
    </div>
  );
};
