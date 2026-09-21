import React, { useState } from "react";
import { useAuth } from "@/auth/context";
import { getInviteCode } from "@/auth/storage";
import { resetFirebasePhoneAuth } from "@/auth/firebasePhone";
import { Building2, ArrowRight, KeyRound, Phone, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import AuthLayout from "@/components/layout/AuthLayout";

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
  const { sendPhoneOtp, confirmPhoneOtp, loginWithGoogle } = useAuth();
  const invite = getInviteCode();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestHelper, setShowTestHelper] = useState(false);
  const onLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  const phonePrompt = linkingGoogle
    ? "Link your registered phone number to finish Google sign-in"
    : "Enter your registered phone number to sign in";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await sendPhoneOtp(phone.trim());
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    try {
      setLoading(true);
      setError(null);
      await confirmPhoneOtp(otp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!phone.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await sendPhoneOtp(phone.trim());
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
      const result = await loginWithGoogle();
      if (result === "needs-phone") {
        setLinkingGoogle(true);
        setStep("phone");
      }
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
  };

  const subtitle = invite
    ? `Joining with invite ${invite}`
    : step === "phone"
      ? phonePrompt
      : `Enter the 6-digit OTP sent to ${phone}`;

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <AuthLayout icon={Building2} title="Sign in" subtitle={subtitle}>

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
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">
                Phone Number
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
                Use +91 format or enter a 10-digit Indian mobile number
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
                  {linkingGoogle ? "Send link OTP" : "Send OTP"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {!linkingGoogle && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-hairline" />
                  <span className="text-[11px] uppercase tracking-wider text-ink-faint">or</span>
                  <div className="h-px flex-1 bg-hairline" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface text-ink font-semibold text-sm border border-hairline hover:bg-accent-tint transition disabled:opacity-50"
                >
                  <GoogleMark />
                  Continue with Google
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-faint">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg border border-hairline rounded-xl text-ink placeholder-ink-faint text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                />
              </div>
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
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={loading}
              className="w-full text-center text-xs text-ink-muted hover:text-ink transition py-1 disabled:opacity-50"
            >
              Resend OTP
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
                resetFirebasePhoneAuth();
              }}
              className="w-full text-center text-xs text-ink-muted hover:text-ink transition py-1"
            >
              Change phone number
            </button>
          </form>
        )}
      </AuthLayout>
    </div>
  );
};
