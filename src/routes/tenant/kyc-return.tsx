import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, ShieldAlert, Clock } from "lucide-react";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { getDigiLockerStatus } from "@/api/kyc";
import { useLocale } from "@/i18n";

export const TenantKYCReturnView: React.FC = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"CONFIRMING" | "VERIFIED" | "AADHAAR_NOT_LINKED" | "PENDING_MANUAL_REVIEW" | "FAILED" | "STILL_PENDING">("CONFIRMING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markVerified = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setStatus("VERIFIED");
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantKYCStatus });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantProfile });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantDues });
  }, [queryClient]);

  const pollStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await getDigiLockerStatus();
      const v = res.verification;
      if (!v) return false;

      if (v.status === "verified") {
        markVerified();
        return true;
      }

      if (v.status === "pending_manual_review") {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setStatus("PENDING_MANUAL_REVIEW");
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantKYCStatus });
        return true;
      }

      if (v.status === "failed") {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        if (v.failure_reason === "AADHAAR_NOT_LINKED") {
          setStatus("AADHAAR_NOT_LINKED");
        } else {
          setStatus("FAILED");
          setErrorMessage(v.failure_reason || "Verification failed via DigiLocker.");
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantKYCStatus });
        return true;
      }

      if (v.status === "rejected") {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setStatus("FAILED");
        setErrorMessage("Identity verification was rejected.");
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantKYCStatus });
        return true;
      }
    } catch {
      // transient network blip; keep polling
    }
    return false;
  }, [markVerified, queryClient]);

  useEffect(() => {
    let active = true;
    const deadline = Date.now() + 60 * 1000; // 60s max
    let delay = 1500;
    let inFlight = false;

    const executeCheck = async (): Promise<boolean> => {
      if (inFlight) return false;
      inFlight = true;
      try {
        return await pollStatus();
      } finally {
        inFlight = false;
      }
    };

    const poll = async () => {
      if (!active) return;
      const isComplete = await executeCheck();
      if (isComplete || !active) return;

      if (Date.now() >= deadline) {
        setStatus("STILL_PENDING");
        return;
      }

      delay = Math.min(delay + 500, 4000);
      pollTimerRef.current = setTimeout(poll, delay);
    };

    // Initial check immediately, then schedule poll if still pending
    executeCheck().then((complete) => {
      if (!complete && active) {
        pollTimerRef.current = setTimeout(poll, delay);
      }
    });

    return () => {
      active = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [pollStatus]);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pt-12">
      <div className="text-center space-y-2">
        <h1 className="t-h2 font-bold text-ink">{t("kyc.digilocker.returnTitle")}</h1>
        <p className="t-caption text-ink-muted">
          {t("kyc.digilocker.returnSubtitle")}
        </p>
      </div>

      {status === "VERIFIED" && (
        <div className="p-6 rounded-[16px] bg-success-tint border border-success/20 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <div>
            <p className="t-h2 font-semibold text-success">{t("kyc.digilocker.verified")}</p>
            <p className="t-body-sm text-ink-muted mt-1">
              {t("kyc.digilocker.verifiedDesc")}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/tenant/dues" })}
            className="w-full py-3 bg-brand text-white font-medium rounded-xl hover:bg-brand/90 transition-colors"
          >
            {t("kyc.digilocker.continueToDues")}
          </button>
        </div>
      )}

      {status === "AADHAAR_NOT_LINKED" && (
        <div className="p-6 rounded-[16px] bg-warning-tint border border-warning/20 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-warning mx-auto" />
          <div>
            <p className="t-h2 font-semibold text-warning">{t("kyc.digilocker.notLinked")}</p>
            <p className="t-body-sm text-ink-muted mt-1">
              {t("kyc.digilocker.notLinkedDesc")}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/tenant" })}
            className="w-full py-3 bg-brand text-white font-medium rounded-xl hover:bg-brand/90 transition-colors"
          >
            {t("kyc.digilocker.uploadFallback")}
          </button>
        </div>
      )}

      {status === "PENDING_MANUAL_REVIEW" && (
        <div className="p-6 rounded-[16px] bg-warning-tint border border-warning/20 text-center space-y-4">
          <Clock className="w-12 h-12 text-warning mx-auto" />
          <div>
            <p className="t-h2 font-semibold text-warning">{t("kyc.digilocker.manualReview")}</p>
            <p className="t-body-sm text-ink-muted mt-1">
              {t("kyc.digilocker.manualReviewDesc")}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/tenant" })}
            className="w-full py-3 bg-brand text-white font-medium rounded-xl hover:bg-brand/90 transition-colors"
          >
            {t("nav.dashboard")}
          </button>
        </div>
      )}

      {status === "FAILED" && (
        <div className="p-6 rounded-[16px] bg-danger-tint border border-danger/20 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-danger mx-auto" />
          <div>
            <p className="t-h2 font-semibold text-danger">{t("kyc.digilocker.failed")}</p>
            <p className="t-body-sm text-ink-muted mt-1">
              {errorMessage || t("kyc.digilocker.failedDesc")}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/tenant" })}
            className="w-full py-3 bg-ink text-white font-medium rounded-xl hover:bg-ink/90 transition-colors"
          >
            {t("kyc.digilocker.tryAgain")}
          </button>
        </div>
      )}

      {status === "CONFIRMING" && (
        <div className="p-8 rounded-[16px] bg-surface-raised border border-border text-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto" />
          <div>
            <p className="t-body-lg font-medium text-ink">{t("kyc.digilocker.confirming")}</p>
            <p className="t-caption text-ink-muted mt-1">
              {t("kyc.digilocker.confirmingDesc")}
            </p>
          </div>
        </div>
      )}

      {status === "STILL_PENDING" && (
        <div className="p-6 rounded-[16px] bg-surface-raised border border-border text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-ink-muted mx-auto" />
          <div>
            <p className="t-body-lg font-medium text-ink">{t("kyc.digilocker.stillPending")}</p>
            <p className="t-caption text-ink-muted mt-1">
              {t("kyc.digilocker.stillPendingDesc")}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setStatus("CONFIRMING");
                pollStatus();
              }}
              className="flex-1 py-3 bg-brand-tint text-brand font-medium rounded-xl hover:bg-brand-tint/80 transition-colors"
            >
              {t("common.retry")}
            </button>
            <button
              onClick={() => navigate({ to: "/tenant" })}
              className="flex-1 py-3 bg-ink text-white font-medium rounded-xl hover:bg-ink/90 transition-colors"
            >
              {t("nav.dashboard")}
            </button>
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => navigate({ to: "/tenant" })}
          className="inline-flex items-center text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t("common.back")}
        </button>
      </div>
    </div>
  );
};
