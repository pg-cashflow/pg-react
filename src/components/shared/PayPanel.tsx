import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Loader2, Download, AlertCircle, CheckCircle2, RefreshCw, Phone } from "lucide-react";
import { getTenantDuePay, getPayQrBlob } from "@/api/pay";
import { formatPaise } from "@/lib/utils";
import { DuePaymentTimeline } from "@/components/shared/DuePaymentTimeline";
import { CopyButton } from "@/components/shared/CopyButton";
import { ProofUploadForm } from "@/components/shared/ProofUploadForm";
import { usePayDue } from "@/lib/usePayDue";
import { Link } from "@tanstack/react-router";
import type { PayIntent } from "@pg/types";
import { useLocale, formatApiError } from "@/i18n";

export const PayPanel: React.FC<{ dueId: string; onDone?: () => void }> = ({ dueId, onDone }) => {
  const { t } = useLocale();
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
    let active = true;
    let createdUrl: string | null = null;
    setInitialError(null);

    getTenantDuePay(dueId)
      .then(async (p) => {
        if (!active) return;
        setPay(p);
        if (p.mode === "manual" && p.payable && p.qr_png_url) {
          try {
            const blob = await getPayQrBlob(p.qr_png_url);
            if (!active) return;
            const url = URL.createObjectURL(blob);
            createdUrl = url;
            setQrUrl(url);
          } catch (err) {
            if (!active) return;
            setInitialError(formatApiError(err, t));
          }
        }
      })
      .catch((err: Error) => {
        if (active) setInitialError(formatApiError(err, t));
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
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
          <p className="t-h3 text-success">{t("paypanel.alreadyPaidTitle")}</p>
        </div>
        <p className="t-body-sm text-ink-muted">
          {t("paypanel.alreadyPaidDesc")}
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
        <p className="t-caption text-ink-muted">{t("paypanel.amountToPay")}</p>
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

      {/* ── Cashfree Fallback Banner ─────────────────────────────── */}
      {pay.mode === "manual" && pay.fallback_reason === "missing_phone" && (
        <div className="p-3.5 rounded-[12px] bg-warning-tint/30 border border-warning/20 flex items-start gap-3">
          <Phone className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="t-body-sm font-semibold text-warning">
              Cashfree checkout requires your phone number
            </p>
            <p className="t-caption text-ink-muted mt-0.5">
              Your owner enabled Cashfree online checkout, but your profile has no phone number yet.
              Add one to unlock instant UPI&nbsp;/ card payment.
            </p>
            <Link
              to="/tenant/profile"
              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-warning underline underline-offset-2"
            >
              Update profile →
            </Link>
          </div>
        </div>
      )}

      {pay.mode === "manual" && pay.fallback_reason === "gateway_down" && (
        <div className="p-3.5 rounded-[12px] bg-warning-tint/30 border border-warning/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="t-body-sm font-semibold text-warning">
              Online checkout temporarily unavailable
            </p>
            <p className="t-caption text-ink-muted mt-0.5">
              The Cashfree gateway is unreachable right now. Pay manually below — your payment
              will be credited once the owner verifies your UTR.
            </p>
          </div>
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────── */}

      {pay.mode === "cashfree" ? (
        <div className="space-y-4">
          {showFallbackForm ? (
            <div className="rounded-[14px] border border-hairline bg-surface p-4 space-y-3">
              <p className="t-h3">Submit Payment Proof</p>
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
            <div className="rounded-[14px] border border-hairline bg-surface p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-accent shrink-0" />
                <div>
                  <p className="t-h3 font-semibold text-ink">Confirming with your bank…</p>
                  <p className="t-caption text-ink-muted mt-0.5">
                    Usually under 10 seconds. Stay on this screen.
                  </p>
                </div>
              </div>

              <div className="pt-0.5">
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

              {/* Explicit re-check + fallback — helps when webhook is delayed (esp. sandbox) */}
              <div className="flex gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={checkAgain}
                  className="flex-1 h-11 rounded-[10px] border border-hairline bg-surface text-ink font-semibold t-body-sm flex items-center justify-center gap-2 hover:bg-bg transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  I already paid — check now
                </button>
                <button
                  type="button"
                  onClick={() => setShowFallbackForm(true)}
                  className="px-4 h-11 rounded-[10px] border border-hairline text-ink-muted t-caption hover:text-ink transition"
                >
                  Upload proof
                </button>
              </div>
            </div>
          ) : gatewayState === "STILL_PENDING" ? (
            <div className="rounded-[14px] border border-hairline bg-surface p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="t-h3 font-semibold text-ink">Bank confirmation taking longer than usual</p>
                  <p className="t-body-sm text-ink-muted mt-1">
                    Your bank hasn't confirmed yet.{" "}
                    <strong>You were not charged</strong> unless your UPI app showed a successful
                    debit notification.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={checkAgain}
                  className="flex-1 h-12 rounded-[10px] border border-hairline bg-surface text-ink font-semibold t-body-sm flex items-center justify-center gap-2 hover:bg-bg transition"
                >
                  <RefreshCw className="w-4 h-4" /> Check again
                </button>
                <button
                  type="button"
                  onClick={() => setShowFallbackForm(true)}
                  className="flex-1 h-12 rounded-[10px] bg-accent text-white font-semibold t-body-sm hover:bg-accent/90 transition"
                >
                  Submit screenshot
                </button>
              </div>

              <p className="t-caption text-ink-muted text-center">
                Your due will auto-update once the bank confirms. You can safely close this.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                disabled={gatewayState === "OPENING" || gatewayState === "CHECKOUT_OPEN"}
                onClick={startPayment}
                className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-60 transition"
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

          {/* Optional manual fallback form */}
          {showFallbackForm && (
            <div className="mt-4 p-4 rounded-[14px] border border-hairline bg-bg space-y-3">
              <div className="flex justify-between items-center">
                <p className="t-caption font-semibold text-ink">Fallback: Submit Receipt or UTR</p>
                <button
                  type="button"
                  onClick={() => setShowFallbackForm(false)}
                  className="t-caption text-ink-muted hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-end"
                >
                  Close
                </button>
              </div>
              <p className="t-caption text-ink-muted">
                If Cashfree took your money but the status hasn't updated, submit the UTR/bank reference here for owner verification.
              </p>
              <ProofUploadForm
                dueId={dueId}
                dueCode={pay.due_code}
                amountPaise={pay.amount_paise}
                onSuccess={() => {
                  setSubmittedManual(true);
                  setShowFallbackForm(false);
                }}
              />
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
                    {copied === "vpa" ? t("paypanel.copied") : t("paypanel.copyUPI")}
                  </button>
                )}
                <a href={qrUrl} download={`rent-${pay.due_code}.png`} className="px-3 py-1.5 rounded-[10px] border border-hairline t-caption">
                  <Download className="w-3.5 h-3.5 inline" /> {t("paypanel.downloadQR")}
                </a>
                {pay.upi_link && (
                  <a href={pay.upi_link} className="px-3 py-1.5 rounded-[10px] bg-accent text-white t-caption font-semibold">
                    {t("paypanel.openUPIApp")} <ExternalLink className="w-3.5 h-3.5 inline" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[14px] border border-hairline bg-surface p-4">
            <p className="t-caption font-semibold text-ink mb-3">{t("paypanel.submitUTR")}</p>
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
