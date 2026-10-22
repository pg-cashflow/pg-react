import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { verifyTenantDuePay } from "@/api/pay";
import { getMyDues } from "@/api/tenant";
import type { Due } from "@pg/types";

export const TenantPayReturnView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"CONFIRMING" | "PAID" | "STILL_PENDING">("CONFIRMING");
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
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantPayments });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantProfile });
  }, [queryClient]);

  const checkStatus = useCallback(async (): Promise<boolean> => {
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
      // transient query error
    }
    return false;
  }, [dueId, markPaid, queryClient]);

  useEffect(() => {
    let active = true;
    const deadline = Date.now() + 60 * 1000;

    // 1. Immediate verify if dueId is provided
    if (dueId) {
      verifyTenantDuePay(dueId)
        .then((res) => {
          if (active && res.paid) {
            markPaid();
          }
        })
        .catch(() => {
          // ignore error; proceed to dues polling
        });
    }

    // 2. Polling backstop
    const poll = async () => {
      if (!active) return;
      if (dueId) {
        try {
          const res = await verifyTenantDuePay(dueId);
          if (active && res.paid) {
            markPaid();
            return;
          }
        } catch {
          // ignore error; proceed to dues polling
        }
      }
      const isPaid = await checkStatus();
      if (isPaid || !active) return;

      if (Date.now() >= deadline) {
        setStatus("STILL_PENDING");
        return;
      }

      pollTimerRef.current = setTimeout(poll, 2000);
    };

    pollTimerRef.current = setTimeout(poll, 1500);

    return () => {
      active = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [checkStatus, dueId, markPaid]);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pt-12">
      <div className="text-center space-y-2">
        <h1 className="t-h2 font-bold text-ink">Payment Confirmation</h1>
        {orderId && <p className="t-caption text-ink-muted">Reference: {orderId}</p>}
      </div>

      {status === "PAID" ? (
        <div className="p-6 rounded-[16px] bg-success-tint border border-success/20 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <div>
            <p className="t-h2 font-semibold text-success">Payment Received!</p>
            <p className="t-body-sm text-ink-muted mt-1">
              Your rent due has been updated and marked as paid on the ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/tenant/dues" })}
            className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold t-body-sm inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> View My Dues
          </button>
        </div>
      ) : status === "STILL_PENDING" ? (
        <div className="p-6 rounded-[16px] border border-hairline bg-surface text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-accent mx-auto" />
          <div>
            <p className="t-h3 font-semibold text-ink">Confirmation in Progress</p>
            <p className="t-body-sm text-ink-muted mt-1">
              Your payment is still being processed by the bank or gateway. You will receive an update as soon as it settles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/tenant/dues" })}
            className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold t-body-sm"
          >
            Back to Dues
          </button>
        </div>
      ) : (
        <div className="p-8 rounded-[16px] border border-hairline bg-surface text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
          <div>
            <p className="t-h3 font-semibold text-ink">Verifying with your bank…</p>
            <p className="t-body-sm text-ink-muted mt-1">
              Please wait while we confirm your transaction. Do not close this browser window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
