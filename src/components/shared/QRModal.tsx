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
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-accent-tint transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-accent-tint text-accent">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        <div className="bg-white p-3 rounded-xl flex items-center justify-center mx-auto my-3 shadow-inner max-w-[240px] min-h-[240px]">
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
          ) : qrImageUrl ? (
            <img src={qrImageUrl} alt="Payment QR Code" className="w-48 h-48 rounded" />
          ) : (
            <p className="text-xs text-ink-muted text-center px-2">QR unavailable</p>
          )}
        </div>

        <p className="text-xs text-center text-ink-muted mb-4">
          Scan with any UPI app (GPay, PhonePe, Paytm) to pay immediately.
        </p>

        {paymentUrl && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface/80 border border-hairline/60 text-xs font-mono text-ink break-all select-all">
              <span className="truncate flex-1">{paymentUrl}</span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-surface text-ink hover:text-white transition flex-shrink-0"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/90 transition shadow-md"
            >
              Open Payment Page
              <ExternalLink className="w-4 h-4" />
            </a>

            {waMe && (
              <a
                href={waMe}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-success transition shadow-md"
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
