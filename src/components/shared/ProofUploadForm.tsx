import React, { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { submitUtrReport, getMyDues } from "@/api/tenant";
import { extractUtrFromScreenshot } from "@/lib/upiScreenshotExtractor";
import { ApiError } from "@/api/client";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { Due } from "@pg/types";
import { useLocale } from "@/i18n";

interface ProofUploadFormProps {
  dueId: string;
  dueCode: string;
  amountPaise: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const ProofUploadForm: React.FC<ProofUploadFormProps> = ({
  dueId,
  dueCode: _dueCode,
  amountPaise: _amountPaise,
  onSuccess,
  onCancel,
}) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [utr, setUtr] = useState("");
  const [image, setImage] = useState<File | undefined>();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractingUtr, setExtractingUtr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Screenshot image is too large (maximum 2MB).");
      return;
    }
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setExtractingUtr(true);
    setError(null);
    try {
      const extractedUtr = await extractUtrFromScreenshot(file);
      if (extractedUtr) setUtr(extractedUtr);
    } catch {
      // Manual entry remains valid if OCR fails
    } finally {
      setExtractingUtr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUtr = utr.trim();
    if (!finalUtr && !image) {
      setError("Attach a screenshot or enter the 12-digit UTR.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await submitUtrReport(dueId, finalUtr || `IMG-${Date.now().toString().slice(-6)}`, image);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        const lower = (err.message || "").toLowerCase();
        if (lower.includes("duplicate") || lower.includes("utr")) {
          setError("This UTR was already submitted. Please verify the transaction reference.");
          return;
        }

        // If "already recorded", query ledger before declaring paid
        try {
          const data = await queryClient.fetchQuery<Due[]>({
            queryKey: QUERY_KEYS.tenantDues,
            queryFn: getMyDues,
            staleTime: 0,
          });
          const dues = Array.isArray(data) ? data : ((data as any)?.dues || []);
          const match = dues.find((d: Due) => d.id === dueId);
          if (match && (match.status === "paid" || match.status === "waived")) {
            onSuccess();
            return;
          }
        } catch {
          // ignore cache fetch error
        }
        setError("This due was already recorded on the server.");
        return;
      }

      setError(err instanceof Error ? err.message : "Proof submission failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block t-caption text-ink-muted mb-1.5">{t("proof.screenshotLabel")}</label>
        <div className="border border-dashed border-hairline rounded-[14px] p-3.5 flex items-center gap-3 bg-surface">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Screenshot preview"
              className="w-12 h-12 object-cover rounded-[8px] border border-hairline"
            />
          ) : (
            <div className="w-12 h-12 rounded-[8px] bg-bg flex items-center justify-center border border-hairline">
              <ImageIcon className="w-5 h-5 text-ink-faint" />
            </div>
          )}
          <span className="t-body-sm text-ink-muted flex-1 truncate">
            {extractingUtr ? t("proof.scanningUtr") : image ? image.name : t("proof.receiptPlaceholder")}
          </span>
          <label className="px-3 py-1.5 rounded-[10px] border border-hairline t-caption font-semibold cursor-pointer bg-bg hover:bg-surface transition-colors">
            <Upload className="w-3.5 h-3.5 inline mr-1" /> {t("proof.browse")}
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
        <label className="block t-caption text-ink-muted mb-1.5">{t("proof.utrLabel")}</label>
        <input
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder={t("proof.utrPlaceholder")}
          maxLength={18}
          className="w-full h-12 px-4 rounded-[10px] border border-hairline bg-surface t-code text-base"
        />
      </div>

      {error && (
        <div className="p-3 rounded-[10px] bg-danger-tint text-danger t-body-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 h-12 rounded-[10px] border border-hairline bg-surface text-ink font-semibold t-body-sm"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex-1 h-12 rounded-[10px] bg-accent text-white font-semibold t-body-sm flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("proof.submitting")}
            </>
          ) : (
            t("proof.submitBtn")
          )}
        </button>
      </div>
    </form>
  );
};
