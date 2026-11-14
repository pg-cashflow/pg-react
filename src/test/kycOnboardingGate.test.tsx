import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantKYCOnboardingGate } from "@/components/shared/TenantKYCOnboardingGate";
import { TenantDashboardView } from "@/routes/tenant/dashboard";
import * as kycApi from "@/api/kyc";
import * as tenantApi from "@/api/tenant";
import * as gamificationApi from "@/api/gamification";

// ThemeToggle needs a ThemeProvider (matchMedia, etc.) that's orthogonal to what
// this file tests — the gating logic. Stub it out like other layout chrome.
vi.mock("@/components/common/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  if (container && document.body.contains(container)) {
    document.body.removeChild(container);
  }
  container = null;
  root = null;
});

const flushQueries = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

const renderGate = async () => {
  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <TenantKYCOnboardingGate>
          <div data-testid="dashboard">Dashboard</div>
        </TenantKYCOnboardingGate>
      </QueryClientProvider>
    );
  });
  await flushQueries();
};

describe("TenantKYCOnboardingGate", () => {
  it("blocks the dashboard and shows the verification screen when unverified", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: null,
      consent_active: false,
    });

    await renderGate();

    expect(container?.querySelector("[data-testid='dashboard']")).toBeNull();
    expect(container?.textContent).toContain("Verify your identity to continue");
    // Both methods offered upfront, as equal choices.
    expect(container?.textContent).toContain("Verify via Aadhaar OTP");
    expect(container?.textContent).toContain("Upload ID Document");
  });

  it("blocks the dashboard while rejected (tenant must re-attempt)", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-rej",
        status: "rejected",
        method: "ocr",
        rejection_reason: "Blurred photo",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T11:59:00Z",
      },
      consent_active: true,
    });

    await renderGate();

    expect(container?.querySelector("[data-testid='dashboard']")).toBeNull();
  });

  it("passes the gate and renders the dashboard once verified", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-ok",
        status: "verified",
        method: "aadhaar_otp",
        masked_uid: "9876",
        verified_at: "2026-10-17T12:00:00Z",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T12:00:00Z",
      },
      consent_active: true,
    });

    await renderGate();

    expect(container?.querySelector("[data-testid='dashboard']")).not.toBeNull();
    expect(container?.textContent).not.toContain("Verify your identity to continue");
  });

  it("passes the gate for a document under manual review (tenant can't accelerate owner review)", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-review",
        status: "pending_manual_review",
        method: "ocr",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T11:59:00Z",
      },
      consent_active: true,
    });

    await renderGate();

    expect(container?.querySelector("[data-testid='dashboard']")).not.toBeNull();
  });
});

describe("Tenant Dashboard Inline KYC Flow (KYC-03)", () => {
  const mockTenantProfile = {
    id: "t-1",
    name: "Aarav Sharma",
    phone: "+919876543210",
    room_number: "204",
    status: "active",
    active_dues: [],
  };

  const renderDashboard = async () => {
    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <TenantDashboardView onNavigate={() => {}} />
        </QueryClientProvider>
      );
    });
    await flushQueries();
  };

  it("renders tenant dashboard with inline KYC reminder banner when unverified", async () => {
    vi.spyOn(tenantApi, "getMyProfile").mockResolvedValue(mockTenantProfile as any);
    vi.spyOn(tenantApi, "getMyDues").mockResolvedValue([]);
    vi.spyOn(tenantApi, "getMyPayments").mockResolvedValue([]);
    vi.spyOn(gamificationApi, "getTenantPoints").mockResolvedValue({
      points: 100,
      on_time_months: 2,
    } as any);
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: null,
      consent_active: false,
    });

    await renderDashboard();

    expect(container?.textContent).toContain("204");
    expect(container?.textContent).toContain("Identity Verification Required");
  });

  it("renders tenant dashboard with review-pending banner when verification is in review", async () => {
    vi.spyOn(tenantApi, "getMyProfile").mockResolvedValue(mockTenantProfile as any);
    vi.spyOn(tenantApi, "getMyDues").mockResolvedValue([]);
    vi.spyOn(tenantApi, "getMyPayments").mockResolvedValue([]);
    vi.spyOn(gamificationApi, "getTenantPoints").mockResolvedValue({
      points: 100,
      on_time_months: 2,
    } as any);
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-rev",
        status: "pending_manual_review",
        method: "ocr",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T11:59:00Z",
      },
      consent_active: true,
    });

    await renderDashboard();

    expect(container?.textContent).toContain("204");
    expect(container?.textContent).toContain("KYC Document Under Review");
  });

  it("renders tenant dashboard without reminder banner when verified", async () => {
    vi.spyOn(tenantApi, "getMyProfile").mockResolvedValue(mockTenantProfile as any);
    vi.spyOn(tenantApi, "getMyDues").mockResolvedValue([]);
    vi.spyOn(tenantApi, "getMyPayments").mockResolvedValue([]);
    vi.spyOn(gamificationApi, "getTenantPoints").mockResolvedValue({
      points: 100,
      on_time_months: 2,
    } as any);
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-ok",
        status: "verified",
        method: "aadhaar_otp",
        masked_uid: "1234",
        verified_at: "2026-10-17T12:00:00Z",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T12:00:00Z",
      },
      consent_active: true,
    });

    await renderDashboard();

    expect(container?.textContent).toContain("204");
    expect(container?.textContent).not.toContain("Identity Verification Required");
    expect(container?.textContent).not.toContain("KYC Document Under Review");
  });
});
