import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  KeyRound,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  getTenantKYCStatus,
  submitKYCConsent,
  requestAadhaarOTP,
  verifyAadhaarOTP,
  initiateDigiLockerKYC,
  uploadKYCDocument,
  revokeKYCConsent,
} from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatDate } from "@/lib/utils";

export const TenantKYCCard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"otp" | "digilocker" | "upload">("otp");

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
      setSuccessMsg("OTP sent to your Aadhaar-linked mobile phone.");
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
      setSuccessMsg("Identity verified instantly with UIDAI.");
      setOtpRefId(null);
      setOtpCode("");
      setAadhaarInput("");
      refreshKYC();
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Invalid or expired OTP");
    },
  });

  const digiLockerMutation = useMutation({
    mutationFn: async () => {
      setUiError(null);
      await consentMutation.mutateAsync();
      const returnUrl = window.location.href;
      return initiateDigiLockerKYC(returnUrl);
    },
    onSuccess: (res) => {
      if (res.vendor_flow_url) {
        window.location.href = res.vendor_flow_url;
      }
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Could not open DigiLocker");
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
      setSuccessMsg("Document submitted for manual review by the owner.");
      setUploadFile(null);
      refreshKYC();
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeKYCConsent,
    onSuccess: () => {
      setShowRevokeConfirm(false);
      setSuccessMsg("KYC consent revoked and verification data marked inactive.");
      refreshKYC();
    },
    onError: (err: unknown) => {
      setUiError(err instanceof Error ? err.message : "Revocation failed");
    },
  });

  const formatAadhaarNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    const parts = [];
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
        setUiError("Document exceeds 5MB limit.");
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
        <p className="t-body-sm text-danger">Unable to load verification status.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="t-caption font-semibold text-accent hover:underline"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-hairline bg-surface p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent-tint text-accent">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="t-h3">Identity Verification (KYC)</h2>
            <p className="t-caption text-ink-muted">Mandatory tenant authenticity and occupancy record</p>
          </div>
        </div>

        {isVerified && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-tint text-success t-caption font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified
          </span>
        )}
        {isPendingReview && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning-tint text-warning t-caption font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Under Review
          </span>
        )}
        {isRejected && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger-tint text-danger t-caption font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Rejected
          </span>
        )}
      </div>

      {/* Verified View */}
      {isVerified && (
        <div className="rounded-[10px] bg-bg border border-hairline p-3.5 space-y-2.5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="t-caption text-ink-faint block">Aadhaar / ID Record</span>
              <p className="t-code font-semibold text-ink">
                {kyc?.masked_uid ? `**** **** ${kyc.masked_uid}` : "UIDAI Verified"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="t-caption text-ink-faint block">Method</span>
              <span className="t-caption font-medium uppercase tracking-wider text-ink-muted">
                {kyc?.method === "aadhaar_otp"
                  ? "Direct Aadhaar OTP"
                  : kyc?.method === "digilocker"
                  ? "DigiLocker"
                  : kyc?.method === "ocr"
                  ? "Manual ID Review"
                  : "Secure QR"}
              </span>
            </div>
          </div>

          {kyc?.verified_at && (
            <div className="flex items-center justify-between pt-2 border-t border-hairline t-caption text-ink-muted">
              <span>Verified on {formatDate(kyc.verified_at)}</span>
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DPDP Act Compliant
              </span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowRevokeConfirm(true)}
              className="t-caption text-ink-faint hover:text-danger transition"
            >
              Revoke Consent / Manage Privacy
            </button>
          </div>
        </div>
      )}

      {/* Pending Manual Review View */}
      {isPendingReview && (
        <div className="rounded-[10px] bg-warning-tint/30 border border-warning/20 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="w-4 h-4 shrink-0" />
            <h3 className="t-body font-semibold">Document Pending Owner Approval</h3>
          </div>
          <p className="t-caption text-ink-muted leading-relaxed">
            Your uploaded identity document was received and queued for review. Your property manager
            will verify the document details shortly. Rent payment will unlock immediately upon approval.
          </p>
          {kyc?.created_at && (
            <p className="t-caption text-ink-faint">Submitted on {formatDate(kyc.created_at)}</p>
          )}
        </div>
      )}

      {/* Rejected View */}
      {isRejected && (
        <div className="rounded-[10px] bg-danger-tint/30 border border-danger/20 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="t-body font-semibold">Document Verification Rejected</h3>
          </div>
          {kyc?.rejection_reason && (
            <p className="t-body-sm text-ink font-medium bg-bg/80 p-2.5 rounded-lg border border-hairline">
              Reason: {kyc.rejection_reason}
            </p>
          )}
          <p className="t-caption text-ink-muted">
            Please re-submit your verification using direct Aadhaar OTP or upload a clear, legible photo.
          </p>
        </div>
      )}

      {/* Action View: Unverified or Rejected */}
      {(!isVerified && !isPendingReview) && (
        <div className="space-y-3 pt-1">
          {/* Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-bg p-1 rounded-xl border border-hairline">
            <button
              type="button"
              onClick={() => {
                setActiveTab("otp");
                setUiError(null);
              }}
              className={`py-2 px-2 rounded-lg t-caption font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === "otp"
                  ? "bg-surface text-ink shadow-sm border border-hairline"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Aadhaar OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("digilocker");
                setUiError(null);
              }}
              className={`py-2 px-2 rounded-lg t-caption font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === "digilocker"
                  ? "bg-surface text-ink shadow-sm border border-hairline"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>DigiLocker</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setUiError(null);
              }}
              className={`py-2 px-2 rounded-lg t-caption font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === "upload"
                  ? "bg-surface text-ink shadow-sm border border-hairline"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload ID</span>
            </button>
          </div>

          {/* Tab 1: Direct Aadhaar OTP */}
          {activeTab === "otp" && (
            <div className="space-y-3 rounded-xl border border-hairline bg-bg p-3.5">
              <div>
                <span className="t-caption font-semibold text-ink flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  Instant Automatic UIDAI Verification
                </span>
                <p className="t-caption text-ink-muted mt-0.5">
                  Direct government OTP verification. No human review required; verifies instantly.
                </p>
              </div>

              {!otpRefId ? (
                <div className="space-y-2">
                  <label className="t-caption font-medium text-ink-muted block">
                    12-Digit Aadhaar Number
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
                      "Send OTP to Linked Mobile"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="t-caption font-medium text-ink-muted">
                      Enter 6-Digit UIDAI OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpRefId(null)}
                      className="t-caption text-accent hover:underline"
                    >
                      Change Number
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
                      "Verify & Confirm Identity"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: DigiLocker */}
          {activeTab === "digilocker" && (
            <div className="space-y-3 rounded-xl border border-hairline bg-bg p-3.5">
              <div>
                <span className="t-caption font-semibold text-ink flex items-center gap-1">
                  <ExternalLink className="w-4 h-4 text-accent" />
                  Government DigiLocker Authentication
                </span>
                <p className="t-caption text-ink-muted mt-0.5">
                  Sign in through your official DigiLocker account. Cashfree automatically imports
                  verified demographic records.
                </p>
              </div>

              <button
                type="button"
                disabled={!consentChecked || digiLockerMutation.isPending}
                onClick={() => digiLockerMutation.mutate()}
                className="w-full h-11 rounded-[10px] bg-accent text-white t-body-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {digiLockerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Proceed to DigiLocker Portal"
                )}
              </button>
            </div>
          )}

          {/* Tab 3: Manual Upload */}
          {activeTab === "upload" && (
            <div className="space-y-3 rounded-xl border border-hairline bg-bg p-3.5">
              <div>
                <span className="t-caption font-semibold text-ink flex items-center gap-1">
                  <FileText className="w-4 h-4 text-ink-muted" />
                  Manual ID Photo Upload (Fallback)
                </span>
                <p className="t-caption text-ink-muted mt-0.5">
                  Attach an Aadhaar Card, Passport, or Driving Licence photo (JPG, PNG, PDF up to 5MB).
                  Requires human verification by the property owner.
                </p>
              </div>

              <div className="border border-dashed border-hairline rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink truncate min-w-0 pr-2">
                  <Upload className="w-4 h-4 text-ink-muted shrink-0" />
                  <span className="t-caption text-ink-muted truncate">
                    {uploadFile ? uploadFile.name : "Choose document image or PDF"}
                  </span>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-surface border border-hairline text-ink t-caption font-semibold cursor-pointer shrink-0 hover:bg-surface/80 transition">
                  {uploadFile ? "Change" : "Browse"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
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
                  "Submit Document for Review"
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
              I consent to the PG collecting and storing my identity verification details for residency
              compliance under the DPDP Act.
            </span>
          </label>
        </div>
      )}

      {/* Messages */}
      {uiError && <p className="t-caption text-danger">{uiError}</p>}
      {successMsg && <p className="t-caption text-success font-medium">{successMsg}</p>}

      {/* Revocation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-hairline rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="t-h3 text-danger">Revoke KYC Consent</h3>
            <p className="t-body-sm text-ink-muted">
              Revoking consent marks your verification status as revoked under the DPDP Act. You may
              need to re-verify your identity before next month's rent cycle.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(false)}
                className="h-10 px-3 rounded-[10px] border border-hairline t-caption font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate()}
                className="h-10 px-4 rounded-[10px] bg-danger text-white t-caption font-semibold flex items-center gap-1.5"
              >
                {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
