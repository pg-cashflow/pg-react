import React, { useState, useEffect } from "react";
import { X, RotateCcw, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import { refundPayment } from "@/api/payments";
import type { Payment, GatewayRefund } from "@pg/types";

interface RefundModalProps {
  payment: Payment | null;
  tenantName: string;
  isOpen: boolean;
  onClose: () => void;
  onRefundComplete?: (refund: GatewayRefund) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  payment,
  tenantName,
  isOpen,
  onClose,
  onRefundComplete,
}) => {
  const [rupeesInput, setRupeesInput] = useState("");
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refundResult, setRefundResult] = useState<GatewayRefund | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  const generateNewKey = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };

  useEffect(() => {
    if (isOpen && payment) {
      setRupeesInput((payment.amount / 100).toString());
      setReason("");
      setOtp("");
      setNeedsStepUp(false);
      setErrorMessage(null);
      setRefundResult(null);
      setIdempotencyKey(generateNewKey());
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const maxAmountRupees = payment.amount / 100;
  const requestedPaise = rupeesToPaise(rupeesInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (requestedPaise <= 0) {
      setErrorMessage("Refund amount must be greater than zero.");
      return;
    }

    if (requestedPaise > payment.amount) {
      setErrorMessage(`Refund amount cannot exceed payment total of ${formatPaise(payment.amount)}.`);
      return;
    }

    if (reason.trim().length < 3 || reason.trim().length > 100) {
      setErrorMessage("Reason must be between 3 and 100 characters.");
      return;
    }

    if (needsStepUp && (!otp || otp.length < 4)) {
      setErrorMessage("Please enter the authorization OTP.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await refundPayment(
        payment.id,
        {
          amount_paise: requestedPaise,
          reason: reason.trim(),
          otp: otp.trim() || undefined,
        },
        idempotencyKey
      );

      setRefundResult(result);
      if (onRefundComplete) {
        onRefundComplete(result);
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      const msg = apiErr.message || "Failed to process refund";
      if (apiErr.status === 401 && (msg.toLowerCase().includes("step-up") || msg.toLowerCase().includes("otp"))) {
        setNeedsStepUp(true);
        setErrorMessage("Dual-control or step-up authentication required. Please enter OTP.");
      } else {
        // Regenerate idempotency key on failure so next attempt does not replay the error
        setIdempotencyKey(generateNewKey());
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryWithNewKey = () => {
    setIdempotencyKey(generateNewKey());
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
              <h2 className="text-base font-semibold text-ink">Initiate Payment Refund</h2>
              <p className="text-xs text-ink-muted">Refund to tenant&apos;s original payment method via Cashfree</p>
            </div>
          </div>
          <button
            onClick={onClose}
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
              <span className="text-ink-muted">Tenant</span>
              <span className="font-semibold text-ink">{tenantName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Original Payment</span>
              <span className="font-semibold text-success">{formatPaise(payment.amount)}</span>
            </div>
            {payment.upi_txn_id && (
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">UPI Ref</span>
                <span className="font-mono text-ink">{payment.upi_txn_id}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Channel</span>
              <span className="uppercase text-ink">{payment.matched_by}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Refund Result Display */}
          {refundResult ? (
            <div className="space-y-4 py-2">
              {refundResult.status === "succeeded" && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                  <h3 className="font-semibold text-sm text-ink">Refund Succeeded</h3>
                  <p className="text-xs text-ink-muted">
                    {formatPaise(refundResult.amount_paise)} refunded successfully.
                  </p>
                  {refundResult.refund_reference && (
                    <div className="text-xs font-mono text-ink-muted">
                      Ref: {refundResult.refund_reference}
                    </div>
                  )}
                </div>
              )}

              {(refundResult.status === "initiated" || refundResult.status as string === "pending") && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl text-center space-y-2">
                  <Clock className="w-8 h-8 text-warning mx-auto animate-pulse" />
                  <h3 className="font-semibold text-sm text-ink">Refund Initiated</h3>
                  <p className="text-xs text-ink-muted">
                    Refund of {formatPaise(refundResult.amount_paise)} is being processed by the bank.
                  </p>
                  <p className="text-xs text-ink-muted">
                    Reconciliation worker will settle this status automatically.
                  </p>
                </div>
              )}

              {refundResult.status === "failed" && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-danger mx-auto" />
                  <h3 className="font-semibold text-sm text-ink">Refund Failed</h3>
                  <p className="text-xs text-ink-muted">
                    The payment gateway rejected the refund request.
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryWithNewKey}
                    className="px-4 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium text-ink hover:bg-bg transition"
                  >
                    Retry with New Idempotency Key
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-accent text-accent-contrast rounded-xl text-sm font-semibold hover:bg-accent/90 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1.5">
                  Refund Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={maxAmountRupees}
                    value={rupeesInput}
                    onChange={(e) => setRupeesInput(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full pl-8 pr-4 py-2.5 bg-bg border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Max refundable: {formatPaise(payment.amount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1.5">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Overpayment adjustment requested by tenant"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1 text-[11px] text-ink-muted">
                  Min 3, max 100 characters (sent to gateway records).
                </p>
              </div>

              {needsStepUp && (
                <div className="p-3.5 bg-accent-tint border border-accent/20 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-ink uppercase">
                    Authorization OTP / Step-Up Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit approval code"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink font-mono"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-hairline rounded-xl text-sm font-medium text-ink hover:bg-bg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || requestedPaise <= 0 || reason.trim().length < 3}
                  className="px-5 py-2.5 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-danger/90 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Refund
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
