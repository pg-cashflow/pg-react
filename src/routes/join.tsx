import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Building,
  User,
  Phone,
  Home,
  HeartHandshake,
  Upload,
  ArrowRight,
  LogOut,
  FileCheck,
  MapPin,
  Calendar,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { getJoinMe, submitJoinProfile, lookupInvite } from "@/api/join";
import {
  requestAadhaarOTP,
  verifyAadhaarOTP,
  initiateDigiLockerKYC,
  submitKYCConsent,
  uploadKYCDocument,
} from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useAuth } from "@/auth/context";
import { getAccessToken } from "@/auth/tokenStore";
import { getInviteCode } from "@/auth/storage";

import { ThemeToggle } from "@/components/common/ThemeToggle";

export const JoinWaitingPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user, triggerActivation, applySession } = useAuth();
  const inviteCode = getInviteCode();

  const [name, setName] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [parentName, setParentName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const meQuery = useQuery({
    queryKey: QUERY_KEYS.joinMe,
    queryFn: getJoinMe,
  });

  const inviteQuery = useQuery({
    queryKey: ["invite-info", inviteCode],
    queryFn: () => (inviteCode ? lookupInvite(inviteCode) : null),
    enabled: !!inviteCode,
  });

  const isPhoneFixed = Boolean(
    (user?.phone && !user.phone.startsWith("+G")) ||
    (meQuery.data?.user?.phone && !meQuery.data.user.phone.startsWith("+G"))
  );
  const fixedPhone =
    (user?.phone && !user.phone.startsWith("+G") ? user.phone : null) ||
    (meQuery.data?.user?.phone && !meQuery.data.user.phone.startsWith("+G") ? meQuery.data.user.phone : "");

  const [personalPhone, setPersonalPhone] = useState(fixedPhone || "");
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [parentRelation, setParentRelation] = useState("Father");
  const [kycMethod, setKycMethod] = useState<"aadhaar_otp" | "digilocker" | "upload">("aadhaar_otp");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otpRefId, setOtpRefId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [consent, setConsent] = useState(false);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinDateLabel = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (meQuery.data?.join?.name) {
      setName(meQuery.data.join.name);
    }
    if (fixedPhone && !personalPhone) {
      setPersonalPhone(fixedPhone);
    }
  }, [meQuery.data?.join?.name, fixedPhone, personalPhone]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("ID photo must be 2MB or smaller.");
      return;
    }
    setIdPhoto(file);
    setError(null);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    setError(null);
    setSaving(true);
    try {
      const res = await requestAadhaarOTP(cleanAadhaar);
      setOtpRefId(res.ref_id);
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpRefId || otpCode.length !== 6) return;
    setOtpVerifying(true);
    setError(null);
    try {
      await verifyAadhaarOTP(otpRefId, otpCode.trim());
      setVerifiedSuccess(true);
      setTimeout(async () => {
        await meQuery.refetch();
        triggerActivation();
        navigate({ to: "/activation" });
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired OTP");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSkipToActivation = async () => {
    await meQuery.refetch();
    triggerActivation();
    navigate({ to: "/activation" });
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPhone = isPhoneFixed ? fixedPhone : personalPhone.trim();
    const permanent = permanentAddress.trim();
    const current = (sameAsPermanent ? permanent : currentAddress).trim();
    const parent = parentName.trim();
    const emergency = emergencyPhone.trim();

    if (!trimmedName || !trimmedPhone || !permanent || !current || !parent || !emergency) {
      setError("Please fill all required fields.");
      return;
    }
    if (!/^\+?[0-9\s-]{10,15}$/.test(trimmedPhone)) {
      setError("Please enter a valid personal mobile number.");
      return;
    }
    if (!/^\+?[0-9\s-]{10,15}$/.test(emergency)) {
      setError("Please enter a valid emergency / parent phone number.");
      return;
    }
    if (kycMethod === "upload" && !idPhoto) {
      setError("Please upload your Aadhaar / government ID photo as fallback verification.");
      return;
    }
    if (kycMethod === "aadhaar_otp" && aadhaarNumber.replace(/\D/g, "").length !== 12) {
      setError("Please enter your complete 12-digit Aadhaar number for instant UIDAI OTP verification.");
      return;
    }
    if (!consent) {
      setError("Consent is required to verify and store your identity for PG records.");
      return;
    }

    setSaving(true);
    try {
      const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
      const aadhaarLast4 = cleanAadhaar.length >= 4 ? cleanAadhaar.slice(-4) : undefined;
      const formattedParent = parentRelation ? `${parent} (${parentRelation})` : parent;

      const res = await submitJoinProfile({
        name: trimmedName,
        phone: trimmedPhone,
        permanent_address: permanent,
        current_address: current,
        parent_name: formattedParent,
        guardian_relation: parentRelation,
        emergency_phone: emergency,
        kyc_method: kycMethod === "aadhaar_otp" ? "aadhaar_otp" : kycMethod,
        aadhaar_last4: aadhaarLast4,
        consent: true,
        image: kycMethod === "upload" ? idPhoto : idPhoto || null,
      });

      if (res.token) {
        const sessionUser = res.user ?? {
          id: user?.id ?? "",
          phone: user?.phone ?? "",
          role: "tenant",
          tenant_id: res.tenant?.id,
          property_id: res.tenant?.property_id,
        };
        applySession(res.token, sessionUser);
      } else if (res.tenant?.id && user) {
        const currentToken = getAccessToken();
        if (currentToken) {
          applySession(
            currentToken,
            {
              ...user,
              tenant_id: res.tenant.id,
              property_id: res.tenant.property_id ?? user.property_id,
            }
          );
        }
      }

      // Record consent under DPDP Act
      try {
        await submitKYCConsent({
          purpose: "residency_verification_and_kyc",
          consent_version: "v1.0",
          consent_text:
            "I agree to my identity details being verified and stored for PG occupancy records in compliance with the DPDP Act.",
        });
      } catch (consentErr) {
        console.warn("Consent recording note:", consentErr);
      }

      // Trigger KYC verification based on selected method
      if (kycMethod === "aadhaar_otp") {
        try {
          const otpRes = await requestAadhaarOTP(cleanAadhaar);
          setOtpRefId(otpRes.ref_id);
          setOtpStep(true);
          setResendCooldown(30);
          setSaving(false);
          return;
        } catch (otpErr) {
          setError(
            otpErr instanceof Error
              ? `Profile saved, but Aadhaar OTP request failed: ${otpErr.message}. You can continue to dashboard and complete verification later from profile.`
              : "Profile saved, but Aadhaar OTP request failed. You can complete verification from your profile."
          );
          setSaving(false);
          return;
        }
      }

      if (kycMethod === "digilocker") {
        try {
          const returnUrl = window.location.origin + "/activation?role=tenant";
          const digiRes = await initiateDigiLockerKYC(returnUrl);
          if (digiRes.verification_url) {
            window.location.href = digiRes.verification_url;
            return;
          }
        } catch (digiErr) {
          setError(
            digiErr instanceof Error
              ? `Profile saved, but DigiLocker redirect failed: ${digiErr.message}.`
              : "Profile saved, but DigiLocker redirect failed."
          );
        }
      }

      if (kycMethod === "upload" && idPhoto) {
        try {
          await uploadKYCDocument(idPhoto);
        } catch (uploadErr) {
          console.warn("KYC upload error:", uploadErr);
        }
      }

      await meQuery.refetch();
      triggerActivation();
      navigate({ to: "/activation" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 bg-bg border border-hairline rounded-xl text-ink placeholder-ink-faint text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition";

  if (otpStep) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 sm:p-6 relative transition-colors">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-lg bg-surface border border-hairline rounded-3xl shadow-xl p-6 sm:p-8 relative z-10 space-y-6 transition-colors">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-accent-tint text-accent flex items-center justify-center shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              UIDAI Aadhaar OTP Verification
            </h1>
            <p className="text-xs text-ink-muted max-w-xs mx-auto leading-relaxed">
              We've requested an authentic verification OTP from UIDAI. Enter the 6-digit code sent to your Aadhaar-linked mobile phone (Aadhaar ending in{" "}
              <span className="font-mono font-semibold text-ink">•••• {aadhaarNumber.replace(/\D/g, "").slice(-4)}</span>).
            </p>
          </div>

          {verifiedSuccess ? (
            <div className="p-4 rounded-2xl bg-success-tint border border-success/30 text-success text-center space-y-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-8 h-8 mx-auto" />
              <p className="font-semibold text-sm">Identity Certified with UIDAI!</p>
              <p className="text-xs text-ink-muted">Redirecting to your new passbook...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="w-full h-12 px-4 rounded-2xl border border-hairline bg-bg font-mono text-center text-lg tracking-[0.5em] text-ink focus:outline-none focus:ring-2 focus:ring-accent transition shadow-inner"
                  autoFocus
                />
              </div>

              <button
                type="button"
                disabled={otpCode.length !== 6 || otpVerifying}
                onClick={handleVerifyOtp}
                className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent-pressed transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {otpVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify & Certify Identity
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || saving}
                  onClick={handleResendOtp}
                  className="text-accent hover:underline disabled:text-ink-faint font-medium"
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </button>

                <button
                  type="button"
                  onClick={handleSkipToActivation}
                  className="text-ink-muted hover:text-ink transition"
                >
                  Verify later from dashboard →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 sm:p-6 relative transition-colors">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg bg-surface border border-hairline rounded-3xl shadow-xl p-6 sm:p-8 relative z-10 space-y-6 transition-colors">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="flex items-center gap-1.5 font-medium text-accent">
              <Building className="w-3.5 h-3.5" />
              {inviteQuery.data?.property_name || "PG / Hostel Onboarding"}
            </span>
            {inviteQuery.data?.owner_name && (
              <span className="text-[11px] text-ink-muted">Owner: {inviteQuery.data.owner_name}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-danger-tint border border-danger/20 text-danger text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <h1 className="t-h1 flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              Tenant Registration
            </h1>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Upload your ID and fill your details. You will enter the tenant portal right after — the owner
              assigns room and rent separately.
            </p>
          </div>

          <form onSubmit={handleSubmitProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Personal Mobile Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Phone className="w-4 h-4" />
                </div>
                {isPhoneFixed ? (
                  <input
                    disabled
                    value={fixedPhone}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface/40 border border-hairline/50 rounded-xl text-ink-muted text-sm font-mono cursor-not-allowed"
                  />
                ) : (
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
              {!isPhoneFixed && (
                <p className="text-[11px] text-ink-faint mt-1">
                  Enter your active mobile number for PG communication and rent receipts
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Permanent / Home Address *
              </label>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Home className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  value={permanentAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPermanentAddress(val);
                    if (sameAsPermanent) {
                      setCurrentAddress(val);
                    }
                  }}
                  placeholder="Home address, hometown, city & state"
                  className="w-full pl-10 pr-4 py-2 bg-surface/80 border border-hairline/80 rounded-xl text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-xs font-medium text-ink uppercase tracking-wider">
                  Current Staying Address *
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-accent cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={sameAsPermanent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsPermanent(checked);
                      if (checked) {
                        setCurrentAddress(permanentAddress);
                      }
                    }}
                    className="rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span>Same as permanent address</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  disabled={sameAsPermanent}
                  value={sameAsPermanent ? permanentAddress : currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder={sameAsPermanent ? "Matches permanent address" : "Where you are staying now"}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl text-ink text-sm transition ${
                    sameAsPermanent
                      ? "bg-surface/30 border-hairline/40 text-ink-muted cursor-not-allowed"
                      : "bg-surface/80 border-hairline/80 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                  Parent / Guardian Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Parent / guardian full name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                  Relation *
                </label>
                <div className="relative">
                  <select
                    value={parentRelation}
                    onChange={(e) => setParentRelation(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 bg-bg border border-hairline rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition appearance-none cursor-pointer"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-ink-muted">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Emergency / Parent Phone *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <input
                  required
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 uppercase tracking-wider">
                Join Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  disabled
                  value={joinDateLabel}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface/40 border border-hairline/50 rounded-xl text-ink-muted text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Defaults to today (the day you register).</p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-ink uppercase tracking-wider">
                  Identity Verification (KYC) *
                </label>
                <span className="text-[10px] text-ink-faint">UIDAI authentic verification</span>
              </div>

              {/* Method Switcher */}
              <div className="grid grid-cols-3 gap-1.5 bg-surface/50 p-1 rounded-2xl border border-hairline">
                <button
                  type="button"
                  onClick={() => setKycMethod("aadhaar_otp")}
                  className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
                    kycMethod === "aadhaar_otp"
                      ? "bg-accent text-white shadow-sm font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-surface/60"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Aadhaar OTP</span>
                  <span className="text-[9px] px-1 py-0.2 bg-white/20 rounded font-normal uppercase tracking-wider hidden sm:inline">
                    Instant
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setKycMethod("digilocker")}
                  className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
                    kycMethod === "digilocker"
                      ? "bg-accent text-white shadow-sm font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-surface/60"
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>DigiLocker</span>
                  <span className="text-[9px] px-1 py-0.2 bg-white/20 rounded font-normal uppercase tracking-wider hidden sm:inline">
                    Portal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setKycMethod("upload")}
                  className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col sm:flex-row items-center justify-center gap-1 transition ${
                    kycMethod === "upload"
                      ? "bg-accent text-white shadow-sm font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-surface/60"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload ID</span>
                  <span className="text-[9px] px-1 py-0.2 bg-hairline text-ink-muted rounded font-normal uppercase tracking-wider hidden sm:inline">
                    Review
                  </span>
                </button>
              </div>

              {kycMethod === "aadhaar_otp" && (
                <div className="p-3.5 rounded-2xl border border-accent/20 bg-accent-tint/30 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-accent flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Direct UIDAI Instant Aadhaar OTP
                    </span>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                      Instant verification. Clicking continue triggers an official UIDAI SMS OTP to your Aadhaar-linked mobile phone.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink-muted mb-1">
                      12-Digit Aadhaar Number *
                    </label>
                    <div className="relative">
                      <input
                        value={aadhaarNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                          setAadhaarNumber(digits);
                        }}
                        placeholder="XXXX XXXX 1234"
                        maxLength={12}
                        className="w-full pl-3.5 pr-28 py-2 bg-bg border border-hairline rounded-xl text-ink font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <div className="absolute inset-y-0 right-1.5 flex items-center">
                        <span className="text-[10px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-1 rounded-lg">
                          UIDAI OTP
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-ink-faint mt-1">
                      Certified via UIDAI. Your full 12-digit number is never stored unmasked.
                    </p>
                  </div>
                </div>
              )}

              {kycMethod === "digilocker" && (
                <div className="p-3.5 rounded-2xl border border-accent/20 bg-accent-tint/30 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-accent flex items-center gap-1">
                      <ExternalLink className="w-4 h-4" />
                      Cashfree DigiLocker Verification Portal
                    </span>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                      You will be redirected to sign in through your official DigiLocker account. Cashfree imports verified demographic records.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-ink-muted mb-1">
                      Aadhaar Number (Optional)
                    </label>
                    <input
                      value={aadhaarNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                        setAadhaarNumber(digits);
                      }}
                      placeholder="XXXX XXXX 1234 (optional)"
                      maxLength={12}
                      className="w-full px-3.5 py-2 bg-bg border border-hairline rounded-xl text-ink font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              {kycMethod === "upload" && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-surface/40 border border-hairline/60 flex items-center justify-between text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-ink-muted" />
                      Manual ID verification fallback
                    </span>
                    <span className="text-[10px] text-ink-faint">Requires manager review</span>
                  </div>

                  <div className="relative border border-dashed border-hairline hover:border-hairline bg-surface/30 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-ink truncate">
                      {idPhoto ? (
                        <>
                          <FileCheck className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="truncate">{idPhoto.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-ink-muted flex-shrink-0" />
                          <span className="text-ink-muted">Attach Aadhaar / Govt ID photo (max 2MB)</span>
                        </>
                      )}
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface border border-hairline text-ink text-xs font-medium cursor-pointer transition">
                      {idPhoto ? "Change" : "Browse"}
                      <input type="file" accept="image/*,.pdf" onChange={handleIdUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-hairline text-accent focus:ring-accent"
              />
              <span>
                I agree to the PG storing and verifying my identity details for occupancy and KYC records under DPDP Act compliance.
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent-pressed transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {kycMethod === "aadhaar_otp"
                    ? "Continue to Aadhaar OTP"
                    : kycMethod === "digilocker"
                    ? "Proceed to DigiLocker"
                    : "Submit & Complete Setup"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-danger hover:text-danger flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
