import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { getTenantKYCStatus } from "@/api/kyc";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { TenantKYCCard } from "@/components/shared/TenantKYCCard";
import { AppLoadingScreen } from "@/components/layout/AppLoadingScreen";
import { ThemeToggle } from "@/components/common/ThemeToggle";

/**
 * Hard onboarding gate: a tenant may not reach the dashboard (or any other
 * tenant route) until they have done their part of identity verification.
 *
 * "Done their part" means status is `verified` (automatic methods: DigiLocker,
 * Aadhaar OTP, Secure QR) or `pending_manual_review` (document upload — the
 * remaining step, owner approval, is outside the tenant's control, so the
 * gate does not make them wait on it; TenantKYCCard shows the review-pending
 * state in that case and the dashboard is fully reachable past this point).
 *
 * This mirrors the server-side "kyc_required" onboarding stage
 * (GET /me/onboarding, internal/join/onboarding_state.go) — the frontend
 * check here is what makes the UX feel instant and seamless; the backend
 * stage is what makes the gate correct even if a client is tampered with
 * (payment and other sensitive tenant routes still enforce their own
 * RequireKYC* middleware independent of this screen).
 */
export const TenantKYCOnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.tenantKYCStatus,
    queryFn: getTenantKYCStatus,
    // Dashboard access depends on this — keep it fresh rather than trusting a
    // stale cache from before the tenant last touched the KYC flow.
    staleTime: 0,
  });

  if (isLoading) return <AppLoadingScreen />;

  if (isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <p className="t-body text-ink-muted">Couldn't check your verification status.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="h-10 px-4 rounded-[10px] bg-accent text-white t-body-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = data?.verification?.status;
  const gatePassed = status === "verified" || status === "pending_manual_review";

  if (gatePassed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent-tint text-accent">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="t-body font-semibold">One quick step</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 pb-10 sm:px-6 max-w-2xl w-full mx-auto">
        <div className="pb-5">
          <h1 className="t-h2 font-bold">Verify your identity to continue</h1>
          <p className="t-body-sm text-ink-muted mt-1">
            Your room is allocated — complete identity verification to unlock your dashboard, dues,
            and payments. Choose whichever is faster for you.
          </p>
        </div>
        <TenantKYCCard defaultTab="otp" onSuccess={() => refetch()} />
      </main>
    </div>
  );
};
