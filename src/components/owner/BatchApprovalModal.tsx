import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import { OtpInput } from "@/components/shared/OtpInput";
import { useRequestPayoutBatchOTP, useApprovePayoutBatch } from "@/lib/usePayouts";
import type { PayoutBatch } from "@pg/types";

interface BatchApprovalModalProps {
  batch: PayoutBatch;
  isOpen: boolean;
  onClose: () => void;
  onApproved?: () => void;
}

export const BatchApprovalModal: React.FC<BatchApprovalModalProps> = ({
  batch,
  isOpen,
  onClose,
  onApproved,
}) => {
  const [itemCountInput, setItemCountInput] = useState("");
  const [rupeesInput, setRupeesInput] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSentInfo, setOtpSentInfo] = useState<{ channel: string; destination: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestOTPMutation = useRequestPayoutBatchOTP();
  const approveMutation = useApprovePayoutBatch();

  if (!isOpen) return null;

  const expectedPaise = rupeesToPaise(rupeesInput);
  const parsedItemCount = parseInt(itemCountInput, 10);

  const isCountMatched = parsedItemCount === batch.item_count;
  const isAmountMatched = expectedPaise === batch.total_amount_paise;
  const canRequestOTP = isCountMatched && isAmountMatched;

  const handleRequestOTP = () => {
    setErrorMessage(null);
    requestOTPMutation.mutate(batch.id, {
      onSuccess: (res) => {
        setOtpSentInfo({ channel: res.channel, destination: res.destination });
      },
      onError: (err: any) => {
        setErrorMessage(err.message || "Failed to send approval OTP");
      },
    });
  };

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isCountMatched || !isAmountMatched) {
      setErrorMessage("Confirmation values must match batch total and count exactly.");
      return;
    }

    if (!otp || otp.length !== 6) {
      setErrorMessage("Please enter the 6-digit approval code.");
      return;
    }

    approveMutation.mutate(
      {
        batchId: batch.id,
        input: {
          expected_item_count: batch.item_count,
          expected_total_paise: batch.total_amount_paise,
          otp,
        },
      },
      {
        onSuccess: () => {
          onApproved?.();
          onClose();
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Batch approval failed.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-warning-tint text-warning">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Approve Payout Batch</h2>
              <p className="text-xs text-ink-muted font-mono">{batch.batch_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-bg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApprove} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium">
              {errorMessage}
            </div>
          )}

          {/* Batch Invariant Summary */}
          <div className="p-4 rounded-xl bg-bg border border-hairline grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Total Items</p>
              <p className="t-h2 text-ink mt-0.5">{batch.item_count}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Total Amount</p>
              <p className="t-h2 font-mono text-ink mt-0.5">{formatPaise(batch.total_amount_paise)}</p>
            </div>
          </div>

          {/* Dual Control Affirmative Inputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Step 1: Affirmative Verification
              </label>
              <span className="text-xs text-ink-muted">Dual-control safety</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-ink-muted mb-1 font-medium">
                  Confirm Item Count ({batch.item_count})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={`Type ${batch.item_count}`}
                    value={itemCountInput}
                    onChange={(e) => setItemCountInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
                  />
                  {isCountMatched && (
                    <CheckCircle2 className="w-4 h-4 text-success absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-ink-muted mb-1 font-medium">
                  Confirm Total Rupees ({batch.total_amount_paise / 100})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Type ${batch.total_amount_paise / 100}`}
                    value={rupeesInput}
                    onChange={(e) => setRupeesInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:border-accent"
                  />
                  {isAmountMatched && (
                    <CheckCircle2 className="w-4 h-4 text-success absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Step-Up OTP */}
          <div className="space-y-4 pt-2 border-t border-hairline">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Step 2: Step-Up Security Code
              </label>
              {otpSentInfo && (
                <span className="text-xs text-success font-medium">
                  Code sent to {otpSentInfo.destination}
                </span>
              )}
            </div>

            {!otpSentInfo ? (
              <button
                type="button"
                onClick={handleRequestOTP}
                disabled={!canRequestOTP || requestOTPMutation.isPending}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-tint text-accent font-semibold text-sm border border-accent/20 hover:bg-accent hover:text-white transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {requestOTPMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Request Approval OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={approveMutation.isPending}
                  autoFocus
                />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-muted">Enter 6-digit SMS / Email code</span>
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={requestOTPMutation.isPending}
                    className="text-accent hover:underline font-medium"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={approveMutation.isPending}
              className="px-4 py-2.5 rounded-xl border border-hairline text-ink text-sm font-medium hover:bg-bg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canRequestOTP || !otpSentInfo || otp.length !== 6 || approveMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-sm"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Authorize Payout Batch"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
