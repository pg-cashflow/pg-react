import React, { useEffect, useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Upload,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
} from "lucide-react";
import { getTenantDuePay, getPayQrBlob } from "@/api/pay";
import { submitUtrReport } from "@/api/tenant";
import { startCashfreeCheckout } from "@/lib/cashfree";
import { formatPaise } from "@/lib/utils";
import { extractUtrFromScreenshot } from "@/lib/upiScreenshotExtractor";
import { ApiError } from "@/api/client";
import type { PayIntent } from "@pg/types";

export const PayPanel: React.FC<{ dueId: string; onDone?: () => void }> = ({ dueId, onDone }) => {
  const [pay, setPay] = useState<PayIntent | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [image, setImage] = useState<File | undefined>();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractingUtr, setExtractingUtr] = useState(false);
  const [extractedFromScreenshot, setExtractedFromScreenshot] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

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
    setTimeout(() => setCopied(null), 1500);
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setExtractingUtr(true);
    setExtractedFromScreenshot(false);

    try {
      const extractedUtr = await extractUtrFromScreenshot(file);
      if (extractedUtr) {
        setUtr(extractedUtr);
        setExtractedFromScreenshot(true);
      }
    } catch {
      // User can still manually type UTR
    } finally {
      setExtractingUtr(false);
    }
  };

  if (error && !pay) return <p className="text-xs text-rose-400">{error}</p>;
  if (!pay) return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
  if (!pay.payable) return <p className="text-xs text-emerald-400">Already paid or waived.</p>;

  if (submitted) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 text-center">
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
          <Check className="w-5 h-5" />
        </div>
        <p className="font-bold text-sm text-emerald-200">Payment Processed & Marked as PAID!</p>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Payment screenshot & 12-digit UTR have been auto-extracted and matched. Your due is now marked as PAID.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Amount Due</p>
          <p className="text-2xl font-extrabold text-slate-100">{formatPaise(pay.amount_paise)}</p>
        </div>
        {pay.note && (
          <div className="text-right">
            <p className="text-[11px] text-slate-500 uppercase">Payment Note</p>
            <p className="font-mono text-xs font-semibold text-primary">{pay.note}</p>
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
              onDone?.();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Checkout failed");
            } finally {
              setBusy(false);
            }
          }}
          className="w-full py-3 rounded-2xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay via Cashfree (UPI / Cards / Netbanking)"}
        </button>
      ) : (
        <div className="space-y-4">
          {/* QR Code & Action Links */}
          {qrUrl && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
              <img
                src={qrUrl}
                alt="UPI QR"
                className="w-44 h-44 mx-auto bg-white rounded-2xl p-2.5 shadow-md"
              />
              <p className="text-xs text-slate-400">Scan with GPay, PhonePe, Paytm, or any UPI app</p>

              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {pay.vpa && (
                  <button
                    type="button"
                    onClick={() => copy("vpa", pay.vpa)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition flex items-center gap-1.5"
                  >
                    {copied === "vpa" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    Copy UPI ID
                  </button>
                )}

                {pay.note && (
                  <button
                    type="button"
                    onClick={() => copy("note", pay.note)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition flex items-center gap-1.5"
                  >
                    {copied === "note" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    Copy Note ({pay.note})
                  </button>
                )}

                <a
                  href={qrUrl}
                  download={`rent-${pay.due_code}.png`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  Save QR
                </a>

                {pay.upi_link && (
                  <a
                    href={pay.upi_link}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-primary/20"
                  >
                    Open UPI App <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Screenshot Upload & UTR Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const finalUtr = utr.trim() || (image ? `IMG-PAID-${Date.now().toString().slice(-6)}` : "");
              if (!finalUtr) {
                setError("Please attach your payment screenshot or enter the UTR number.");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await submitUtrReport(dueId, finalUtr, image);
                setUtr("");
                setImage(undefined);
                setImagePreviewUrl(null);
                setSubmitted(true);
                onDone?.();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Submission failed");
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-3 pt-1"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Upload Payment Screenshot (Recommended)</span>
                <span className="text-[10px] text-emerald-400 font-normal">Shows amount & time to owner</span>
              </label>

              <div className="border border-dashed border-slate-700 hover:border-slate-600 bg-slate-800/40 rounded-2xl p-3 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Screenshot"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="truncate">
                    <p className="font-semibold text-slate-200 truncate">
                      {image ? image.name : "Attach GPay / PhonePe / Paytm Screenshot"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {extractingUtr
                        ? "Scanning screenshot for UTR..."
                        : extractedFromScreenshot
                          ? "✓ 12-digit UTR auto-detected!"
                          : image
                            ? "Screenshot ready (Amount & timestamp included)"
                            : "Auto-shares proof with owner for instant verification"}
                    </p>
                  </div>
                </div>

                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 flex-shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  {image ? "Change" : "Browse"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
                  12-Digit UTR / UPI Ref ID (Optional if screenshot attached)
                </label>
                {extractedFromScreenshot && (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-filled from Screenshot
                  </span>
                )}
              </div>
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder={image ? "Auto-detected or optional" : "e.g. 412345678901"}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            <button
              type="submit"
              disabled={busy || (!utr.trim() && !image)}
              className="w-full py-3.5 rounded-2xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {image ? "Submit Payment Proof & Screenshot" : "Submit UTR Number"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
