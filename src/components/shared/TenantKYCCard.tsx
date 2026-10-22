import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  KeyRound,
  Loader2,
  CheckCircle2,
  Lock,
  X,
} from "lucide-react";
import {
  getTenantKYCStatus,
  submitKYCConsent,
  requestAadhaarOTP,
  verifyAadhaarOTP,
  uploadKYCDocument,
  revokeKYCConsent,
} from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n";

export interface TenantKYCCardProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  defaultTab?: "otp" | "upload";
}

export const TenantKYCCard: React.FC<TenantKYCCardProps> = ({
  isModal,
  onClose,
  onSuccess,
  defaultTab = "otp",
}) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"otp" | "upload">(defaultTab);

  // Form states
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [otpRefId, setOtpRefId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [consentChecked, setConsentChecked] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.tenantKYCStatus,
    queryFn: getTenantKYCStatus,
  });

  const kyc = data?.verification;
  const isVerified = kyc?.status === "verified";
  const isPendingReview = kyc?.status === "pending_manual_review";
  const isRejected = kyc?.status === "rejected";

  const refreshKYC = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantKYCStatus });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenantProfile });
  };

  // Mutations
  const consentMutation = useMutation({
    mutationFn: () =>
      submitKYCConsent({
        purpose: "residency_verification_and_kyc",
        consent_version: "v1.0",
        consent_text:
          "I agree to my identity details being verified and stored for PG occupancy records in compliance with the DPDP Act.",
      }),
  });

  const requestOtpMutation = useMutation({
    mutationFn: async (rawAadhaar: string) => {
      setUiError(null);
      setSuccessMsg(null);
      await consentMutation.mutateAsync();
      const clean = rawAadhaar.replace(/\s+/g, "");
      return requestAadhaarOTP(clean);
    },
    onSuccess: (res) => {
      setOtpRefId(res.ref_id);
      setSuccessMsg(t("kyc.card.otpSentSuccess"));
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Failed to send OTP");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!otpRefId) throw new Error("Please request OTP first");
      setUiError(null);
      return verifyAadhaarOTP(otpRefId, otpCode.trim());
    },
    onSuccess: () => {
      setSuccessMsg(t("kyc.card.verifiedInstantSuccess"));
      setOtpRefId(null);
      setOtpCode("");
      setAadhaarInput("");
      refreshKYC();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Invalid or expired OTP");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUiError(null);
      setSuccessMsg(null);
      await consentMutation.mutateAsync();
      return uploadKYCDocument(file);
    },
    onSuccess: () => {
      setSuccessMsg(t("kyc.card.docSubmittedSuccess"));
      setUploadFile(null);
      refreshKYC();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeKYCConsent,
    onSuccess: () => {
      setShowRevokeConfirm(false);
      setSuccessMsg(t("kyc.card.consentRevokedSuccess"));
      refreshKYC();
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Revocation failed");
    },
  });

  const formatAadhaarNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAadhaarInput(formatAadhaarNumber(e.target.value));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUiError(t("kyc.card.docSizeExceeded"));
        return;
      }
      setUploadFile(file);
      setUiError(null);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-[14px] border border-hairline bg-surface p-4 flex items-center justify-center min-h-[140px]">
        <Loader2 className="w-5 h-5 animate-spin text-ink-muted" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-2">
        <p className="t-body-sm text-danger">{t("kyc.card.unableToLoad")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="t-caption font-semibold text-accent hover:underline"
        >
          {t("common.retry")}
        </button>
      </section>
    );
  }

  const content = (
    <section className={`rounded-[14px] ${isModal ? "" : "border border-hairline bg-surface p-4"} space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent-tint text-accent">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="t-h3">{t("kyc.card.title")}</h2>
            <p className="t-caption text-ink-muted">{t("kyc.card.subtitle")}</p>
          </div>
        </div>

        {isVerified && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-tint text-success t-caption font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("kyc.card.verifiedBadge")}
          </span>
        )}
        {isPendingReview && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning-tint text-warning t-caption font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {t("kyc.card.underReviewBadge")}
          </span>
        )}
        {isRejected && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger-tint text-danger t-caption font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("kyc.card.rejectedBadge")}
          </span>
        )}
      </div>

      {/* Verified View */}
      {isVerified && (
        <div className="rounded-[10px] bg-bg border border-hairline p-3.5 space-y-2.5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="t-caption text-ink-faint block">{t("kyc.card.idRecord")}</span>
              <p className="t-code font-semibold text-ink">
                {kyc?.masked_uid ? `**** **** ${kyc.masked_uid}` : t("kyc.card.uidaiVerified")}
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="t-caption text-ink-faint block">{t("kyc.card.method")}</span>
              <span className="t-caption font-medium uppercase tracking-wider text-ink-muted">
                {kyc?.method === "aadhaar_otp"
                  ? t("kyc.card.methodDirectOtp")
                  : kyc?.method === "digilocker"
                  ? t("kyc.card.methodDigilocker")
                  : kyc?.method === "ocr"
                  ? t("kyc.card.methodManual")
                  : t("kyc.card.methodQr")}
              </span>
            </div>
          </div>

          {kyc?.verified_at && (
            <div className="flex items-center justify-between pt-2 border-t border-hairline t-caption text-ink-muted">
              <span>{t("kyc.card.verifiedOn", { date: formatDate(kyc.verified_at) })}</span>
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("kyc.card.dpdpCompliant")}
              </span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowRevokeConfirm(true)}
              className="t-caption text-ink-faint hover:text-danger transition"
            >
              {t("kyc.card.revokePrivacy")}
            </button>
          </div>
        </div>
      )}

      {/* Pending Manual Review View */}
      {isPendingReview && (
        <div className="rounded-[10px] bg-warning-tint/30 border border-warning/20 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="w-4 h-4 shrink-0" />
            <h3 className="t-body font-semibold">{t("kyc.card.pendingTitle")}</h3>
          </div>
          <p className="t-caption text-ink-muted leading-relaxed">
            {t("kyc.card.pendingDesc")}
          </p>
          {kyc?.created_at && (
            <p className="t-caption text-ink-faint">{t("kyc.card.submittedOn", { date: formatDate(kyc.created_at) })}</p>
          )}
        </div>
      )}

      {/* Rejected View */}
      {isRejected && (
        <div className="rounded-[10px] bg-danger-tint/30 border border-danger/20 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="t-body font-semibold">{t("kyc.card.rejectedTitle")}</h3>
          </div>
          {kyc?.rejection_reason && (
            <p className="t-body-sm text-ink font-medium bg-bg/80 p-2.5 rounded-lg border border-hairline">
              {t("kyc.card.rejectionReason", { reason: kyc.rejection_reason })}
            </p>
          )}
          <p className="t-caption text-ink-muted">
            {t("kyc.card.rejectedHelp")}
          </p>
        </div>
      )}

      {/* Action View: Unverified or Rejected */}
      {(!isVerified && !isPendingReview) && (
        <div className="space-y-3 pt-1">
          {/* Two Primary Verification Actions: Aadhaar OTP & Document Upload */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("otp");
                setUiError(null);
              }}
              className={`py-2.5 px-3 rounded-xl t-caption font-semibold flex items-center justify-center gap-1.5 transition border ${
                activeTab === "otp"
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-surface text-ink border-hairline hover:bg-hairline/20"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{t("kyc.card.tabOtp")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setUiError(null);
              }}
              className={`py-2.5 px-3 rounded-xl t-caption font-semibold flex items-center justify-center gap-1.5 transition border ${
                activeTab === "upload"
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-surface text-ink border-hairline hover:bg-hairline/20"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>{t("kyc.card.tabUpload")}</span>
            </button>
          </div>

          {/* Tab 1: Direct Aadhaar OTP */}
          {activeTab === "otp" && (
            <div className="space-y-3 rounded-xl border border-hairline bg-bg p-3.5">
              <div>
                <span className="t-caption font-semibold text-ink flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  {t("kyc.card.otpHeading")}
                </span>
                <p className="t-caption text-ink-muted mt-0.5">
                  {t("kyc.card.otpSubtitle")}
                </p>
              </div>

              {!otpRefId ? (
                <div className="space-y-2">
                  <label className="t-caption font-medium text-ink-muted block">
                    {t("kyc.card.aadhaarLabel")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={aadhaarInput}
                    onChange={handleAadhaarChange}
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                    className="w-full h-11 px-3 rounded-[10px] border border-hairline bg-surface t-code text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    disabled={
                      aadhaarInput.replace(/\s+/g, "").length !== 12 ||
                      !consentChecked ||
                      requestOtpMutation.isPending
                    }
                    onClick={() => requestOtpMutation.mutate(aadhaarInput)}
                    className="w-full h-11 rounded-[10px] bg-accent text-white t-body-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                  >
                    {requestOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("kyc.card.sendOtpBtn")
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="t-caption font-medium text-ink-muted">
                      {t("kyc.card.enterOtpLabel")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpRefId(null)}
                      className="t-caption text-accent hover:underline"
                    >
                      {t("kyc.card.changeNumber")}
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-full h-11 px-3 rounded-[10px] border border-hairline bg-surface t-code text-center tracking-widest text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                    onClick={() => verifyOtpMutation.mutate()}
                    className="w-full h-11 rounded-[10px] bg-accent text-white t-body-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                  >
                    {verifyOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("kyc.card.verifyConfirmBtn")
                    )}
                  </button>
                </div>
              )}

              {/* Direct fallback to upload if OTP doesn't arrive or fails */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("upload");
                    setUiError(null);
                  }}
                  className="t-caption text-ink-muted hover:text-accent underline transition"
                >
                  {t("kyc.card.otpFallbackLink")}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Manual Upload */}
          {activeTab === "upload" && (
            <div className="space-y-3 rounded-xl border border-hairline bg-bg p-3.5">
              <div>
                <span className="t-caption font-semibold text-ink flex items-center gap-1">
                  <FileText className="w-4 h-4 text-ink-muted" />
                  {t("kyc.card.uploadHeading")}
                </span>
                <p className="t-caption text-ink-muted mt-0.5">
                  {t("kyc.card.uploadSubtitle")}
                </p>
              </div>

              <div className="border border-dashed border-hairline rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink truncate min-w-0 pr-2">
                  <Upload className="w-4 h-4 text-ink-muted shrink-0" />
                  <span className="t-caption text-ink-muted truncate">
                    {uploadFile ? uploadFile.name : t("kyc.card.chooseDoc")}
                  </span>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-surface border border-hairline text-ink t-caption font-semibold cursor-pointer shrink-0 hover:bg-surface/80 transition">
                  {uploadFile ? t("kyc.card.change") : t("kyc.card.browse")}
                  <input
                    type="file"
                    accept=".pdf,application/pdf,.jpg,.jpeg,image/jpeg,.png,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={!uploadFile || !consentChecked || uploadMutation.isPending}
                onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
                className="w-full h-11 rounded-[10px] bg-accent text-white t-body-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("kyc.card.submitReviewBtn")
                )}
              </button>
            </div>
          )}

          {/* DPDP Consent Checkbox */}
          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 rounded border-hairline text-accent focus:ring-accent"
            />
            <span className="t-caption text-ink-muted leading-tight">
              {t("kyc.card.consentText")}
            </span>
          </label>
        </div>
      )}

      {/* Messages */}
      {uiError && (
        <div className="rounded-xl border border-danger/30 bg-danger-tint/20 p-3 space-y-2 text-left">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="t-caption font-semibold text-danger">{uiError}</p>
              {activeTab === "otp" && (
                <p className="t-caption text-ink-muted">
                  {t("kyc.card.sandboxFallback")}
                </p>
              )}
            </div>
          </div>
          {activeTab === "otp" && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setUiError(null);
              }}
              className="w-full py-2 px-3 rounded-lg bg-surface border border-hairline hover:bg-hairline/20 t-caption font-semibold text-ink flex items-center justify-center gap-1.5 transition"
            >
              <Upload className="w-4 h-4 text-accent" />
              <span>{t("kyc.card.uploadInsteadBtn")}</span>
            </button>
          )}
        </div>
      )}
      {successMsg && <p className="t-caption text-success font-medium">{successMsg}</p>}

      {/* Revocation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="t-h3 text-danger">{t("kyc.card.revokeTitle")}</h3>
            <p className="t-body-sm text-ink-muted">
              {t("kyc.card.revokeDesc")}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(false)}
                className="h-10 px-3 rounded-[10px] border border-hairline t-caption font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate()}
                className="h-10 px-4 rounded-[10px] bg-danger text-white t-caption font-semibold flex items-center gap-1.5"
              >
                {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("kyc.card.revokeBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-surface border border-hairline p-5 sm:p-6 shadow-2xl relative space-y-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-hairline/20 transition z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {content}
        </div>
      </div>
    );
  }

  return content;
};
