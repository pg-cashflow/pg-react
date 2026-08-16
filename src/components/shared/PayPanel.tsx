import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { getTenantDuePay, getPayQrBlob } from "@/api/pay";
import { submitUtrReport } from "@/api/tenant";
import { startCashfreeCheckout } from "@/lib/cashfree";
import { formatPaise } from "@/lib/utils";
import { ApiError } from "@/api/client";
import type { PayIntent } from "@pg/types";

export const PayPanel: React.FC<{ dueId: string; onDone?: () => void }> = ({ dueId, onDone }) => {
  const [pay, setPay] = useState<PayIntent | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [image, setImage] = useState<File | undefined>();
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

  if (error && !pay) return <p className="text-xs text-rose-400">{error}</p>;
  if (!pay) return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
  if (!pay.payable) return <p className="text-xs text-emerald-400">Already paid or waived.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-100">{formatPaise(pay.amount_paise)}</p>
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
          className="w-full py-2.5 rounded-xl bg-primary text-slate-950 font-semibold text-sm disabled:opacity-50"
        >
          Pay with UPI
        </button>
      ) : (
        <>
          {qrUrl && <img src={qrUrl} alt="UPI QR" className="w-48 h-48 mx-auto bg-white rounded-xl p-2" />}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copy("vpa", pay.vpa)} className="px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-200">
              {copied === "vpa" ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />} Copy UPI ID
            </button>
            <button onClick={() => copy("note", pay.note)} className="px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-200">
              {copied === "note" ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />} Copy {pay.note}
            </button>
            {qrUrl && (
              <a href={qrUrl} download={`rent-${pay.due_code}.png`} className="px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-200">
                Save QR
              </a>
            )}
            {pay.upi_link && (
              <a href={pay.upi_link} className="px-3 py-2 rounded-xl bg-primary text-slate-950 text-xs font-semibold inline-flex items-center gap-1">
                Open UPI <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!utr.trim()) return;
              setBusy(true);
              setError(null);
              try {
                await submitUtrReport(dueId, utr.trim(), image);
                setUtr("");
                onDone?.();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Report failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="UTR / UPI txn ID"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0])}
              className="text-xs text-slate-400"
            />
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-100 disabled:opacity-50">
              Submit UTR
            </button>
          </form>
        </>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
};
