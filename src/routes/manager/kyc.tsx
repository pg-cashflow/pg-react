import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  FileText,
  Eye,
  Loader2,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { getManagerKYCDocumentBlob } from "@/api/kyc";
import { useLocale } from "@/i18n";

export const ManagerKYCView: React.FC = () => {
  const { t } = useLocale();
  const [docId, setDocId] = useState("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewController = useRef<AbortController | null>(null);

  useEffect(() => () => previewController.current?.abort(), []);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const revokeWithDelay = (url: string) => {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // no-op
      }
    }, 60000);
  };

  const handleFetchDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = docId.trim();
    if (!trimmed) return;

    previewController.current?.abort();
    previewController.current = new AbortController();
    const signal = previewController.current.signal;

    setPreviewLoading(true);
    setPreviewError(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const blob = await getManagerKYCDocumentBlob(trimmed, signal);
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setPreviewContentType(blob.type);
    } catch (err: any) {
      if (signal.aborted) return;
      setPreviewError(err?.message || "Failed to load document");
    } finally {
      if (!signal.aborted) {
        setPreviewLoading(false);
      }
    }
  };

  const handleCloseModal = () => {
    previewController.current?.abort();
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewContentType(null);
    setPreviewError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-h1 font-bold text-ink flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-accent" />
          {t("nav.kyc")}
        </h1>
        <p className="t-body-sm text-ink-muted mt-1">
          {t("kyc.queueSubtitle")}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-surface border border-hairline flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
        <div className="t-body-sm text-ink-muted">
          <p className="font-semibold text-ink">
            {t("kyc.card.pendingTitle")}
          </p>
          <p className="mt-1">
            {t("kyc.card.pendingDesc")}
          </p>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-xl border border-hairline max-w-xl space-y-4">
        <h2 className="t-heading-sm font-semibold text-ink flex items-center gap-2">
          <FileText className="w-5 h-5 text-ink-muted" />
          {t("kyc.viewDocument")}
        </h2>
        <form onSubmit={handleFetchDocument} className="space-y-4">
          <div>
            <label
              htmlFor="doc-id"
              className="block t-caption font-medium text-ink-muted mb-1"
            >
              {t("kyc.document")}
            </label>
            <input
              id="doc-id"
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              className="w-full px-3 py-2 t-body-sm border border-hairline rounded-lg bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={previewLoading || !docId.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-contrast rounded-[10px] t-caption font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {previewLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                {t("kyc.viewDocument")}
              </>
            )}
          </button>
        </form>

        {previewError && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg t-body-sm text-danger">
            {previewError}
          </div>
        )}
      </div>

      {previewBlobUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-hairline">
            <div className="p-4 border-b border-hairline flex items-center justify-between">
              <h3 className="t-heading-sm font-semibold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                {t("kyc.modalTitle")}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => revokeWithDelay(previewBlobUrl)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-bg">
              {previewContentType?.startsWith("image/") ? (
                <img
                  src={previewBlobUrl}
                  alt="KYC Document Preview"
                  className="max-h-[70vh] object-contain rounded-lg"
                />
              ) : previewContentType === "application/pdf" ? (
                <iframe
                  src={previewBlobUrl}
                  title="PDF Preview"
                  className="w-full h-[70vh] rounded-lg border-0 bg-white"
                />
              ) : (
                <div className="text-center p-6 text-ink-muted">
                  <p>{t("kyc.card.idRecord")}</p>
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => revokeWithDelay(previewBlobUrl)}
                    className="inline-flex items-center gap-1.5 t-caption font-semibold text-accent mt-2 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("kyc.openNewTab")}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerKYCView;

