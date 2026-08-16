import React, { useEffect, useState } from "react";
import { X, Copy, Check, ExternalLink, QrCode, Loader2, MessageCircle } from "lucide-react";

interface QRModalProps {
  paymentUrl?: string;
  qrImageUrl?: string;
  waMe?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  isLoading?: boolean;
}

export const QRModal: React.FC<QRModalProps> = ({
  paymentUrl,
  qrImageUrl,
  waMe,
  isOpen,
  onClose,
  title = "Payment QR & Link",
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        <div className="bg-white p-3 rounded-xl flex items-center justify-center mx-auto my-3 shadow-inner max-w-[240px] min-h-[240px]">
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          ) : qrImageUrl ? (
            <img src={qrImageUrl} alt="Payment QR Code" className="w-48 h-48 rounded" />
          ) : (
            <p className="text-xs text-slate-500 text-center px-2">QR unavailable</p>
          )}
        </div>

        <p className="text-xs text-center text-slate-400 mb-4">
          Scan with any UPI app (GPay, PhonePe, Paytm) to pay immediately.
        </p>

        {paymentUrl && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300 break-all select-all">
              <span className="truncate flex-1">{paymentUrl}</span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition flex-shrink-0"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-slate-950 font-medium text-sm hover:bg-primary/90 transition shadow-md"
            >
              Open Payment Page
              <ExternalLink className="w-4 h-4" />
            </a>

            {waMe && (
              <a
                href={waMe}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-500 transition shadow-md"
              >
                Share on WhatsApp
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
