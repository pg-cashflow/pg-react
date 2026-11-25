import React, { useState, useEffect, useRef } from "react";
import { X, RotateCcw, AlertCircle, CheckCircle2, Clock, Loader2, ShieldAlert } from "lucide-react";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import { refundPayment, requestRefundOTP, getPaymentRefundHistory, createRefundApprovalRequest } from "@/api/payments";
import { REFUND_WINDOW_DAYS } from "@/lib/constants";
import type { Payment, GatewayRefund } from "@pg/types";
import { useLocale, formatApiError } from "@/i18n";

interface RefundModalProps {
  payment: Payment | null;
  tenantName: string;
  isOpen: boolean;
  onClose: () => void;
  onRefundComplete?: (refund: GatewayRefund) => void;
  onApprovalSubmitted?: () => void;
}

function generateRefundIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  payment,
  tenantName,
  isOpen,
  onClose,
  onRefundComplete,
  onApprovalSubmitted,
}) => {
  const { t } = useLocale();
  const tRef = useRef(t);
  const paymentId = payment?.id ?? null;
  const [rupeesInput, setRupeesInput] = useState("");
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refundResult, setRefundResult] = useState<GatewayRefund | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpDestination, setOtpDestination] = useState("");
  const [attemptPending, setAttemptPending] = useState(false);
  const [remainingPaise, setRemainingPaise] = useState<number | null>(null);
  const [hasPendingOp, setHasPendingOp] = useState(false);
  const [isExpiredWindow, setIsExpiredWindow] = useState(false);
  const [refundWindowDays, setRefundWindowDays] = useState(REFUND_WINDOW_DAYS);
  const [dualControlRequired, setDualControlRequired] = useState(false);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    // A payment switch or modal close invalidates the previous request. This
    // prevents a late response from replacing the selected payment's balance.
    // Depend on the stable payment ID rather than the full object so a parent
    // re-render cannot restart the request or rotate an in-flight idempotency key.
    let isCurrent = true;
    if (isOpen && paymentId) {
      setReason("");
      setOtp("");
      setNeedsStepUp(false);
      setOtpDestination("");
      setErrorMessage(null);
      setRefundResult(null);
      setIdempotencyKey(generateRefundIdempotencyKey());
      setAttemptPending(false);
      setRemainingPaise(null);
      setHasPendingOp(false);
      setDualControlRequired(false);
      setApprovalSubmitted(false);
      setIsExpiredWindow(false);
      setRefundWindowDays(REFUND_WINDOW_DAYS);

      getPaymentRefundHistory(paymentId)
        .then((hist) => {
          if (!isCurrent) return;
          if (
            hist.payment_id !== paymentId ||
            typeof hist.refund_eligible !== "boolean" ||
            !Number.isSafeInteger(hist.refund_window_days) ||
            hist.refund_window_days < 1 ||
            !Number.isSafeInteger(hist.remaining_refundable_paise) ||
            hist.remaining_refundable_paise < 0
          ) {
            setRemainingPaise(0);
            setRupeesInput("0");
            setErrorMessage(tRef.current("error.payment.refundHistoryFailed"));
            return;
          }
          setRefundWindowDays(hist.refund_window_days);
          setIsExpiredWindow(!hist.refund_eligible);
          setRemainingPaise(hist.remaining_refundable_paise);
          setHasPendingOp(Boolean(hist.pending_operation));
          setRupeesInput((hist.remaining_refundable_paise / 100).toString());
          if (!hist.refund_eligible) {
            setErrorMessage(tRef.current("owner.refund.expiredWindow", { days: hist.refund_window_days }));
          } else if (hist.remaining_refundable_paise <= 0) {
            setErrorMessage(tRef.current("owner.refund.fullyRefunded"));
          }
        })
        .catch(() => {
          if (!isCurrent) return;
          setRemainingPaise(0);
          setRupeesInput("0");
          setErrorMessage(tRef.current("error.payment.refundHistoryFailed"));
        });

      try {
        const raw = sessionStorage.getItem(`pg_refund_attempt:${paymentId}`);
        const saved = raw ? JSON.parse(raw) : null;
        if (saved && typeof saved.key === "string" && Number.isSafeInteger(saved.amount) && typeof saved.reason === "string") {
          setIdempotencyKey(saved.key);
          setRupeesInput((saved.amount / 100).toString());
          setReason(saved.reason);
          setAttemptPending(true);
        }
      } catch { /* Storage may be unavailable; same-open retries still reuse the key. */ }
    }
    return () => {
      isCurrent = false;
    };
  }, [isOpen, paymentId]);

  if (!isOpen || !payment) return null;

  const effectiveMaxPaise = remainingPaise !== null ? remainingPaise : 0;
  const maxAmountRupees = effectiveMaxPaise / 100;
  const requestedPaise = rupeesToPaise(rupeesInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isExpiredWindow) {
      setErrorMessage(t("owner.refund.expiredWindow", { days: refundWindowDays }));
      return;
    }

    if (requestedPaise <= 0) {
      setErrorMessage(t("owner.refund.invalidAmount"));
      return;
    }

    if (requestedPaise > effectiveMaxPaise) {
      setErrorMessage(t("owner.refund.exceedsBalance", { amount: formatPaise(effectiveMaxPaise) }));
      return;
    }

    const trimmedReason = reason.trim().normalize("NFC");
    const reasonCharCount = Array.from(trimmedReason).length;
    if (reasonCharCount < 3 || reasonCharCount > 100) {
      setErrorMessage(t("error.payment.refundReasonLength"));
      return;
    }

    // eslint-disable-next-line no-misleading-character-class
    const validReasonRegex = /^[\p{L}\p{M}\p{N}\u200C\u200D .,_'/-]+$/u;
    if (!validReasonRegex.test(trimmedReason)) {
      setErrorMessage(t("error.payment.refundReasonCharacters"));
      return;
    }

    if (needsStepUp && !/^\d{6}$/.test(otp)) {
      setErrorMessage(t("owner.refund.otpRequired"));
      return;
    }

    setIsSubmitting(true);
    setAttemptPending(true);
    try {
      sessionStorage.setItem(`pg_refund_attempt:${payment.id}`, JSON.stringify({ key: idempotencyKey, amount: requestedPaise, reason: trimmedReason }));
    } catch { /* The backend remains authoritative if local recovery is unavailable. */ }

    try {
      const result = await refundPayment(
        payment.id,
        {
          amount_paise: requestedPaise,
          reason: trimmedReason,
          otp: otp.trim() || undefined,
        },
        idempotencyKey
      );

      setRefundResult(result);
      if (onRefundComplete) {
        onRefundComplete(result);
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number; code?: string };
      const msg = formatApiError(err, t);
      const isDualControl =
        apiErr.code === "refund.dual_control_required" ||
        apiErr.code === "finance.dual_control_required" ||
        /dual[- ]control|maker[- ]checker|approval required/i.test(apiErr.message || "") ||
        /dual[- ]control|maker[- ]checker|approval required/i.test(msg);

      if (isDualControl) {
        setDualControlRequired(true);
        setErrorMessage(
          t("owner.refund.dualControlRequired")
        );
      } else {
        const isStepUp =
          apiErr.status === 401 &&
          (apiErr.code === "auth.stepUpRequired" ||
            apiErr.code === "auth.invalidOtp" ||
            apiErr.code === "auth.otpExpired" ||
            apiErr.code === "auth.otpLocked" ||
            msg.toLowerCase().includes("step-up") ||
            msg.toLowerCase().includes("otp") ||
            Boolean(apiErr.message && /step-up|otp|approval code/i.test(apiErr.message)));
        if (isStepUp) {
          setNeedsStepUp(true);
          setErrorMessage(msg);
        } else {
          // A transport error does not prove that the refund was rejected. Keep
          // the operation identity so retry cannot create another refund.
          if (apiErr.status === 400 || apiErr.status === 422) {
            // These responses are validation failures before gateway dispatch.
            setAttemptPending(false);
            try { sessionStorage.removeItem(`pg_refund_attempt:${payment.id}`); } catch { /* best effort */ }
          }
          setErrorMessage(msg);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateApprovalRequest = async () => {
    if (!payment) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createRefundApprovalRequest(
        payment.id,
        {
          amount_paise: requestedPaise,
          reason: reason.trim().normalize("NFC"),
        },
        idempotencyKey
      );
      setApprovalSubmitted(true);
      setDualControlRequired(false);
      if (onApprovalSubmitted) {
        onApprovalSubmitted();
      }
    } catch (err: unknown) {
      setErrorMessage(formatApiError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryWithNewKey = () => {
    try { sessionStorage.removeItem(`pg_refund_attempt:${payment.id}`); } catch { /* best effort */ }
    setAttemptPending(false);
    setIdempotencyKey(generateRefundIdempotencyKey());
    setRefundResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-hairline w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-tint flex items-center justify-center text-accent">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{t("owner.refund.title")}</h2>
              <p className="text-xs text-ink-muted">{t("owner.refund.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t("common.close")}
            className="text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-bg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Payment Summary Banner */}
          <div className="bg-bg border border-hairline rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">{t("owner.refund.tenant")}</span>
              <span className="font-semibold text-ink">{tenantName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">{t("owner.refund.originalPayment")}</span>
              <span className="font-semibold text-success">{formatPaise(payment.amount)}</span>
            </div>
            {payment.upi_txn_id && (
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">{t("owner.refund.upiRef")}</span>
                <span className="font-mono text-ink">{payment.upi_txn_id}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">{t("owner.refund.channel")}</span>
              <span className="uppercase text-ink">{payment.matched_by}</span>
            </div>
          </div>

          {hasPendingOp && (
            <div className="p-3.5 bg-warning-tint border border-warning/30 rounded-xl flex items-start gap-3 text-xs text-warning">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                {t("owner.refund.pendingOperationNotice")}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {dualControlRequired && (
            <div className="p-4 bg-accent-tint border border-accent/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{t("owner.refund.dualControlTitle")}</span>
              </div>
              <p className="text-xs text-ink-muted">
                {t("owner.refund.dualControlDesc")}
              </p>
              <button
                type="button"
                onClick={handleCreateApprovalRequest}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-accent text-white rounded-xl text-xs font-semibold hover:bg-accent/90 transition flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t("owner.refund.submitApprovalBtn")}</span>
              </button>
            </div>
          )}

          {/* Refund Result Display */}
          {approvalSubmitted ? (
            <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
              <h3 className="font-semibold text-sm text-ink">{t("owner.refund.approvalSubmittedTitle")}</h3>
              <p className="text-xs text-ink-muted">
                {t("owner.refund.approvalSubmittedDesc")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-surface border border-hairline rounded-xl text-xs font-semibold text-ink hover:bg-bg transition"
              >
                {t("common.close")}
              </button>
            </div>
          ) : refundResult ? (
            <div className="space-y-4 py-2">
              {refundResult.status === "succeeded" && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                  <h3 className="font-semibold text-sm text-ink">{t("owner.refund.succeeded")}</h3>
                  <p className="text-xs text-ink-muted">
                    {t("owner.refund.succeededDesc", { amount: formatPaise(refundResult.amount_paise) })}
                  </p>
                  {refundResult.refund_reference && (
                    <div className="text-xs font-mono text-ink-muted">
                      {t("owner.refund.ref", { ref: refundResult.refund_reference })}
                    </div>
                  )}
                </div>
              )}

              {!["succeeded", "failed", "cancelled"].includes(refundResult.status) && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl text-center space-y-2">
                  <Clock className="w-8 h-8 text-warning mx-auto animate-pulse" />
                  <h3 className="font-semibold text-sm text-ink">{t("owner.refund.initiated")}</h3>
                  <p className="text-xs text-ink-muted">
                    {t("owner.refund.initiatedDesc", { amount: formatPaise(refundResult.amount_paise) })}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {t("owner.refund.reconNote")}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-4 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium text-ink hover:bg-bg transition"
                  >
                    {t("owner.refund.checkStatus")}
                  </button>
                </div>
              )}

              {(refundResult.status === "failed" || refundResult.status === "cancelled") && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-danger mx-auto" />
                  <h3 className="font-semibold text-sm text-ink">{t("owner.refund.failed")}</h3>
                  <p className="text-xs text-ink-muted">
                    {t("owner.refund.failedDesc")}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryWithNewKey}
                    className="px-4 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium text-ink hover:bg-bg transition"
                  >
                    {t("owner.refund.retryKey")}
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-accent text-accent-contrast rounded-xl text-sm font-semibold hover:bg-accent/90 transition"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1.5">
                  {t("owner.refund.amountLabel")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxAmountRupees}
                    value={rupeesInput}
                    onChange={(e) => setRupeesInput(e.target.value)}
                    required
                    disabled={isSubmitting || attemptPending}
                    className="w-full pl-8 pr-4 py-2.5 bg-bg border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <p className="mt-1 t-micro text-ink-muted">
                  {t("owner.refund.maxRefundable", { amount: formatPaise(effectiveMaxPaise) })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1.5">
                  {t("owner.refund.reasonLabel")}
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("owner.refund.reasonPlaceholder")}
                  required
                  disabled={isSubmitting || attemptPending}
                  className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1 t-micro text-ink-muted">
                  {t("owner.refund.reasonHint")}
                </p>
              </div>

              {needsStepUp && (
                <div className="p-3.5 bg-accent-tint border border-accent/20 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-ink uppercase">
                    {t("owner.refund.stepUpLabel")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder={t("owner.refund.stepUpPlaceholder")}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink font-mono"
                  />
                  <button type="button" disabled={sendingOTP || isSubmitting} onClick={async () => {
                    setSendingOTP(true);
                    try {
                      const res = await requestRefundOTP(payment.id);
                      setOtpDestination(res.destination);
                      setErrorMessage(null);
                    } catch (err) { setErrorMessage(formatApiError(err, t)); }
                    finally { setSendingOTP(false); }
                  }} className="text-xs font-semibold text-accent disabled:opacity-50">
                    {t("owner.refund.sendCode")}
                  </button>
                  {otpDestination && <p className="text-xs text-ink-muted" role="status">{t("owner.refund.codeSent", { destination: otpDestination })}</p>}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-hairline rounded-xl text-sm font-medium text-ink hover:bg-bg transition"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || requestedPaise <= 0 || reason.trim().length < 3 || isExpiredWindow || effectiveMaxPaise <= 0 || hasPendingOp}
                  className="px-5 py-2.5 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-danger/90 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("owner.refund.confirm")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
