import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantKYCOnboardingGate } from "@/components/shared/TenantKYCOnboardingGate";
import * as kycApi from "@/api/kyc";

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
    expect(container?.textContent).toContain("Verify via DigiLocker");
    expect(container?.textContent).toContain("Verify via Aadhaar OTP");
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
        method: "digilocker",
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
