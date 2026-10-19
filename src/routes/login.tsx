import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/context";
import { getInviteCode, setInviteCode } from "@/auth/storage";
import { resetFirebasePhoneAuth } from "@/auth/firebasePhone";
import { Building2, ArrowRight, Phone, AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import AuthLayout from "@/components/layout/AuthLayout";
import { useLocale } from "@/i18n";
import { OtpInput } from "@/components/shared/OtpInput";

const GoogleMark: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.26-2.08 3.55-5.14 3.55-8.66z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
    />
  </svg>
);

export const LoginPage: React.FC = () => {
  const { t } = useLocale();
  const { sendPhoneOtp, confirmPhoneOtp, loginWithGoogle } = useAuth();
  const [invite, setInvite] = useState<string | null>(() => getInviteCode() || null);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [showTestHelper, setShowTestHelper] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showLostPhoneHelp, setShowLostPhoneHelp] = useState(false);
  const onLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const handleUnauthorized = (e: Event) => {
      const custom = e as CustomEvent<{ reason?: string }>;
      if (custom.detail?.reason === "biometric_failed") {
        setSessionNotice(t("auth.biometricFailed"));
      } else if (
        custom.detail?.reason === "access_revoked" ||
        custom.detail?.reason === "session_ended"
      ) {
        setSessionNotice(t("auth.sessionExpired"));
      }
    };
    window.addEventListener("pg:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pg:unauthorized", handleUnauthorized);
  }, [t]);

  const phonePrompt = t("auth.loginSubtitle");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSessionNotice(null);
      await sendPhoneOtp(phone.trim());
      setResendCooldown(30);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    const codeToVerify = codeOverride ?? otp;
    if (codeToVerify.length !== 6 || loading) return;

    try {
      setLoading(true);
      setError(null);
      setSessionNotice(null);
      await confirmPhoneOtp(codeToVerify);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!phone.trim() || resendCooldown > 0 || loading) return;
    try {
      setLoading(true);
      setError(null);
      setSessionNotice(null);
      await sendPhoneOtp(phone.trim());
      setResendCooldown(30);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      setSessionNotice(null);
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const fillTestNumber = (testPhone: string, testOtp?: string) => {
    setPhone(testPhone);
    if (testOtp) setOtp(testOtp);
    setError(null);
    setSessionNotice(null);
  };

  const handleClearInvite = () => {
    setInviteCode("");
    setInvite(null);
  };

  const subtitle = invite ? (
    <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
      <span>{t("auth.inviteCodeNotice", { code: invite })}</span>
      <button
        type="button"
        onClick={handleClearInvite}
        className="inline-flex items-center gap-0.5 text-xs text-ink-muted hover:text-danger transition underline cursor-pointer"
        title="Remove invite code"
      >
        <X className="w-3 h-3" /> {t("auth.clearInvite")}
      </button>
    </span>
  ) : step === "phone" ? (
    phonePrompt
  ) : (
    t("auth.codeSentTo", { phone })
  );

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <AuthLayout
        icon={Building2}
        title={t("auth.loginTitle")}
        subtitle={subtitle}
        footer={
          invite ? (
            <button
              type="button"
              onClick={handleClearInvite}
              className="text-xs text-ink-muted hover:text-ink transition underline cursor-pointer"
            >
              {t("auth.clearInvite")}
            </button>
          ) : undefined
        }
      >

        {onLocalhost && (
          <div className="mb-4 p-3 rounded-xl bg-accent-tint border border-accent/20 text-accent text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Phone OTP fails on localhost. Open{" "}
              <a className="underline font-semibold" href="http://127.0.0.1:5173">
                http://127.0.0.1:5173
              </a>
              .
            </span>
          </div>
        )}

        {/* Spark testing guidance */}
        {import.meta.env.DEV && (
        <div className="mb-5 p-3 rounded-xl bg-accent-tint/50 border border-accent/20 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              Firebase Spark Testing Tip
            </span>
            <button
              type="button"
              onClick={() => setShowTestHelper(!showTestHelper)}
              className="text-[11px] underline text-accent hover:opacity-80"
            >
              {showTestHelper ? "Hide" : "Show test numbers"}
            </button>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Real SMS requires Firebase Blaze. On the free Spark plan, use your Firebase test phone numbers configured in Console.
          </p>
          {showTestHelper && (
            <div className="pt-2 border-t border-accent/15 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillTestNumber("+918008281429", "123456")}
                className="px-2.5 py-1 rounded-lg bg-surface border border-hairline text-[11px] text-ink font-mono hover:bg-accent-tint transition"
              >
                Owner: +91 80082 81429
              </button>
              <button
                type="button"
                onClick={() => fillTestNumber("+919000000000", "123456")}
                className="px-2.5 py-1 rounded-lg bg-surface border border-hairline text-[11px] text-ink font-mono hover:bg-accent-tint transition"
              >
                Tenant: +91 90000 00000
              </button>
              <button
                type="button"
                onClick={() => fillTestNumber("+919111111111", "123456")}
                className="px-2.5 py-1 rounded-lg bg-surface border border-hairline text-[11px] text-ink font-mono hover:bg-accent-tint transition"
              >
                Warden: +91 91111 11111
              </button>
            </div>
          )}
        </div>
        )}

        {sessionNotice && !error && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed">{sessionNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span>{error}</span>
              {error.includes("Blaze") && (
                <p className="mt-1 text-ink-muted">
                  Tip: Use a test number added to Firebase Auth &gt; Phone numbers for testing (e.g. +91 90000 00000 with OTP 123456).
                </p>
              )}
            </div>
          </div>
        )}

        {step === "phone" ? (
          <form key="phone-form" onSubmit={handleSendOtp} className="space-y-4 animate-step-in">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">
                {t("auth.phoneLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-faint">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg border border-hairline rounded-xl text-ink placeholder-ink-faint text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                />
              </div>
              <p className="text-[11px] text-ink-faint mt-1.5">
                {t("auth.phoneHelper")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-pressed transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("auth.sendOtp")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-hairline" />
              <span className="text-[11px] uppercase tracking-wider text-ink-faint">{t("auth.or")}</span>
              <div className="h-px flex-1 bg-hairline" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface text-ink font-semibold text-sm border border-hairline hover:bg-accent-tint transition disabled:opacity-50"
            >
              <GoogleMark />
              {t("auth.googleSignIn")}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowLostPhoneHelp((prev) => !prev)}
                className="text-xs text-ink-muted hover:text-ink transition underline"
              >
                {t("auth.cantAccessPhone")}
              </button>
              {showLostPhoneHelp && (
                <div className="mt-2 p-3 rounded-xl bg-surface border border-hairline text-xs text-ink-muted leading-relaxed text-left animate-step-in">
                  {t("auth.cantAccessPhoneDesc")}
                </div>
              )}
            </div>
          </form>
        ) : (
          <form key="otp-form" onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4 animate-step-in">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-2 uppercase tracking-wider text-center">
                {t("auth.enterOtp")}
              </label>
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={(code) => void handleVerifyOtp(undefined, code)}
                disabled={loading}
                hasError={!!error}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-pressed transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("auth.verifyOtp")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={loading || resendCooldown > 0}
              className="w-full text-center text-xs text-ink-muted hover:text-ink transition py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? t("auth.resendIn", { seconds: resendCooldown })
                : t("auth.resendOtp")}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setResendCooldown(0);
                setError(null);
                resetFirebasePhoneAuth();
              }}
              className="w-full text-center text-xs text-ink-muted hover:text-ink transition py-1"
            >
              {t("auth.changePhone")}
            </button>
          </form>
        )}
      </AuthLayout>
    </div>
  );
};
