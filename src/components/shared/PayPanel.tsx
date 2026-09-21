import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Loader2, Upload, Image as ImageIcon, Download, AlertCircle } from "lucide-react";
import { getTenantDuePay, getPayQrBlob } from "@/api/pay";
import { submitUtrReport } from "@/api/tenant";
import { startCashfreeCheckout } from "@/lib/cashfree";
import { formatPaise } from "@/lib/utils";
import { extractUtrFromScreenshot } from "@/lib/upiScreenshotExtractor";
import { ApiError } from "@/api/client";
import { DuePaymentTimeline } from "@/components/shared/DuePaymentTimeline";
import { CopyButton } from "@/components/shared/CopyButton";
import type { PayIntent } from "@pg/types";

export const PayPanel: React.FC<{ dueId: string; onDone?: () => void }> = ({ dueId }) => {
  const [pay, setPay] = useState<PayIntent | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [image, setImage] = useState<File | undefined>();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractingUtr, setExtractingUtr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    setError(null);
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
              setError("Personal UPI QR replaced by Cashfree checkout");
            }
          }
        }
      })
      .catch((err: Error) => setError(err.message));
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

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setExtractingUtr(true);
    try {
      const extractedUtr = await extractUtrFromScreenshot(file);
      if (extractedUtr) setUtr(extractedUtr);
    } catch {
      /* manual UTR still valid */
    } finally {
      setExtractingUtr(false);
    }
  };

  if (error && !pay) return <p className="t-body-sm text-danger">{error}</p>;
  if (!pay) return <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />;
  if (!pay.payable) return <p className="t-body-sm text-success">Already paid or waived.</p>;

  if (submitted) {
    return (
      <div className="p-4 rounded-[14px] bg-success-tint border border-success/20 text-success space-y-3">
        <p className="t-h3">UTR submitted — waiting for owner verification</p>
        <p className="t-body-sm text-ink-muted">
          This is not marked paid until the owner confirms the UTR. Keep the screenshot.
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
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await startCashfreeCheckout(pay.payment_session_id || "");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Checkout failed");
            } finally {
              setBusy(false);
            }
          }}
          className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Pay via Cashfree"}
        </button>
      ) : (
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

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const finalUtr = utr.trim();
              if (!finalUtr && !image) {
                setError("Attach a screenshot or enter the UTR.");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await submitUtrReport(dueId, finalUtr || `IMG-${Date.now().toString().slice(-6)}`, image);
                setSubmitted(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Submission failed");
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-3"
          >
            <label className="block t-caption text-ink-muted mb-1">Payment screenshot</label>
            <div className="border border-dashed border-hairline rounded-[14px] p-3 flex items-center gap-3">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Screenshot" className="w-10 h-10 object-cover rounded-[8px] border border-hairline" />
              ) : (
                <ImageIcon className="w-5 h-5 text-ink-faint" />
              )}
              <span className="t-body-sm text-ink-muted flex-1 truncate">
                {extractingUtr ? "Reading UTR…" : image ? image.name : "GPay / PhonePe screenshot"}
              </span>
              <label className="px-3 py-1.5 rounded-[10px] border border-hairline t-caption font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5 inline" /> Browse
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleScreenshotChange} className="hidden" />
              </label>
            </div>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="12-digit UTR"
              className="w-full h-12 px-4 rounded-[10px] border border-hairline bg-surface t-code text-base"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-[10px] bg-accent text-white font-semibold"
            >
              {busy ? "Confirming your payment…" : "I've paid — submit UTR"}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-[10px] bg-danger-tint text-danger t-body-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};
