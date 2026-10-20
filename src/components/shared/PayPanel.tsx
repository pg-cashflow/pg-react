import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Loader2, Download, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { getTenantDuePay, getPayQrBlob } from "@/api/pay";
import { formatPaise } from "@/lib/utils";
import { ApiError } from "@/api/client";
import { DuePaymentTimeline } from "@/components/shared/DuePaymentTimeline";
import { CopyButton } from "@/components/shared/CopyButton";
import { ProofUploadForm } from "@/components/shared/ProofUploadForm";
import { usePayDue } from "@/lib/usePayDue";
import type { PayIntent } from "@pg/types";

export const PayPanel: React.FC<{ dueId: string; onDone?: () => void }> = ({ dueId, onDone }) => {
  const [pay, setPay] = useState<PayIntent | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [submittedManual, setSubmittedManual] = useState(false);
  const [showFallbackForm, setShowFallbackForm] = useState(false);

  const { state: gatewayState, error: gatewayError, startPayment, checkAgain } = usePayDue(dueId, {
    onPaid: () => onDone?.(),
  });

  useEffect(() => {
    let revoked: string | null = null;
    setInitialError(null);

    getTenantDuePay(dueId)
      .then(async (p) => {
        setPay(p);
        if (p.mode === "manual" && p.payable && p.qr_png_url) {
          try {
            const blob = await getPayQrBlob(p.qr_png_url);
            const url = URL.createObjectURL(blob);
            revoked = url;
            setQrUrl(url);
          } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
              setInitialError("Personal UPI QR replaced by Cashfree checkout");
            }
          }
        }
      })
      .catch((err: Error) => setInitialError(err.message));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [dueId]);

  const copy = async (label: string, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (initialError && !pay) return <p className="t-body-sm text-danger">{initialError}</p>;
  if (!pay) return <Loader2 className="w-5 h-5 animate-spin text-ink-muted my-6 mx-auto" />;
  if (!pay.payable || gatewayState === "PAID") {
    return (
      <div className="p-4 rounded-[14px] bg-success-tint border border-success/20 text-success space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <p className="t-h3 text-success">Already paid or waived</p>
        </div>
        <p className="t-body-sm text-ink-muted">
          Your rent payment is settled on the property ledger.
        </p>
      </div>
    );
  }

  // Submitted manual UTR
  if (submittedManual) {
    return (
      <div className="p-4 rounded-[14px] bg-success-tint border border-success/20 text-success space-y-3">
        <p className="t-h3">UTR submitted — waiting for owner verification</p>
        <p className="t-body-sm text-ink-muted">
          This is not marked paid until the owner confirms the UTR. Keep your screenshot.
        </p>
        <DuePaymentTimeline
          due={{
            id: dueId,
            due_code: pay.due_code,
            tenant_id: "",
            property_id: "",
            kind: "rent",
            amount: pay.amount_paise,
            original_amount: pay.amount_paise,
            period_start: "",
            period_end: "",
            due_date: new Date().toISOString(),
            status: "pending",
            created_at: "",
            updated_at: "",
          }}
          utrSubmitted
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Due Summary Card */}
      <div className="rounded-[14px] border border-hairline bg-bg p-4">
        <p className="t-caption text-ink-muted">Amount due</p>
        <p className="t-amount-lg mt-1">{formatPaise(pay.amount_paise)}</p>
        {pay.note && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="t-caption text-ink-muted">Due code / UPI note</span>
            <span className="flex items-center gap-1">
              <span className="t-code font-medium">{pay.note}</span>
              <CopyButton value={pay.note} label="Copy due code" />
            </span>
          </div>
        )}
      </div>

      {pay.mode === "cashfree" ? (
        <div className="space-y-4">
          {showFallbackForm ? (
            <div className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="t-h3">Submit Payment Proof</p>
              </div>
              <p className="t-caption text-ink-muted">
                If your payment was debited but the gateway timed out, upload your UPI receipt here.
              </p>
              <ProofUploadForm
                dueId={dueId}
                dueCode={pay.due_code}
                amountPaise={pay.amount_paise}
                onSuccess={() => {
                  setShowFallbackForm(false);
                  setSubmittedManual(true);
                }}
                onCancel={() => setShowFallbackForm(false)}
              />
            </div>
          ) : gatewayState === "CONFIRMING" || gatewayState === "CHECKING" ? (
            <div className="rounded-[14px] border border-hairline bg-surface p-4 space-y-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
              <div>
                <p className="t-h3 font-semibold text-ink">Confirming with your bank</p>
                <p className="t-body-sm text-ink-muted mt-1">
                  Usually completes under 10 seconds. You may safely stay on this screen.
                </p>
              </div>
              <div className="pt-2 text-left">
                <DuePaymentTimeline
                  due={{
                    id: dueId,
                    due_code: pay.due_code,
                    tenant_id: "",
                    property_id: "",
                    kind: "rent",
                    amount: pay.amount_paise,
                    original_amount: pay.amount_paise,
                    period_start: "",
                    period_end: "",
                    due_date: new Date().toISOString(),
                    status: "pending",
                    created_at: "",
                    updated_at: "",
                  }}
                  mode="cashfree"
                  cashfreeStep="confirming"
                />
              </div>
              <div className="pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowFallbackForm(true)}
                  className="t-caption text-ink-muted hover:text-ink min-h-[44px] inline-flex items-center"
                >
                  Paid but not showing? Submit screenshot →
                </button>
              </div>
            </div>
          ) : gatewayState === "STILL_PENDING" ? (
            <div className="rounded-[14px] border border-hairline bg-surface p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="t-h3 font-semibold text-ink">Payment verification taking longer</p>
                  <p className="t-body-sm text-ink-muted mt-1">
                    Your bank or UPI app has not sent confirmation yet. You were not charged unless your bank confirmed it.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={checkAgain}
                  className="flex-1 h-12 rounded-[10px] border border-hairline bg-surface text-ink font-semibold t-body-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Check again
                </button>
                <button
                  type="button"
                  onClick={() => setShowFallbackForm(true)}
                  className="flex-1 h-12 rounded-[10px] bg-accent text-white font-semibold t-body-sm"
                >
                  Submit screenshot
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                disabled={gatewayState === "OPENING" || gatewayState === "CHECKOUT_OPEN"}
                onClick={startPayment}
                className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold flex items-center justify-center gap-2"
              >
                {gatewayState === "OPENING" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…
                  </>
                ) : (
                  `Pay ${formatPaise(pay.amount_paise)} via Cashfree`
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowFallbackForm(true)}
                  className="t-caption text-ink-muted hover:text-ink min-h-[44px] inline-flex items-center"
                >
                  Paid but not showing? Submit screenshot →
                </button>
              </div>
            </div>
          )}

          {gatewayError && (
            <div className="p-3 rounded-[10px] bg-danger-tint text-danger t-body-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gatewayError}</span>
            </div>
          )}
        </div>
      ) : (
        /* Manual Mode (QR / UPI Intent / Fallback) */
        <div className="space-y-4">
          {qrUrl && (
            <div className="bg-surface border border-hairline p-4 rounded-[14px] text-center space-y-3">
              <img src={qrUrl} alt="UPI QR" className="w-44 h-44 mx-auto bg-white rounded-[10px] p-2" />
              <div className="flex flex-wrap gap-2 justify-center">
                {pay.vpa && (
                  <button
                    type="button"
                    onClick={() => copy("vpa", pay.vpa)}
                    className="px-3 py-1.5 rounded-[10px] border border-hairline t-caption"
                  >
                    {copied === "vpa" ? <Check className="w-3.5 h-3.5 inline text-success" /> : <Copy className="w-3.5 h-3.5 inline" />}{" "}
                    Copy VPA
                  </button>
                )}
                <a href={qrUrl} download={`rent-${pay.due_code}.png`} className="px-3 py-1.5 rounded-[10px] border border-hairline t-caption">
                  <Download className="w-3.5 h-3.5 inline" /> Save QR
                </a>
                {pay.upi_link && (
                  <a href={pay.upi_link} className="px-3 py-1.5 rounded-[10px] bg-accent text-white t-caption font-semibold">
                    Open UPI <ExternalLink className="w-3.5 h-3.5 inline" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[14px] border border-hairline bg-surface p-4">
            <p className="t-caption font-semibold text-ink mb-3">Submit UTR or Receipt</p>
            <ProofUploadForm
              dueId={dueId}
              dueCode={pay.due_code}
              amountPaise={pay.amount_paise}
              onSuccess={() => setSubmittedManual(true)}
            />
          </div>
        </div>
      )}

      {initialError && (
        <div className="p-3 rounded-[10px] bg-danger-tint text-danger t-body-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{initialError}</span>
        </div>
      )}
    </div>
  );
};
