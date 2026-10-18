import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantKYCCard } from "@/components/shared/TenantKYCCard";
import { OwnerKYCView } from "@/routes/owner/kyc";
import * as kycApi from "@/api/kyc";
import * as clientApi from "@/api/client";

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

describe("TenantKYCCard", () => {
  it("renders verified state with masked UID and DPDP compliance", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-1",
        status: "verified",
        method: "aadhaar_otp",
        masked_uid: "1234",
        verified_at: "2026-10-17T12:00:00Z",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T12:00:00Z",
      },
      consent_active: true,
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <TenantKYCCard />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("Identity Verification (KYC)");
    expect(container?.textContent).toContain("Verified");
    expect(container?.textContent).toContain("**** **** 1234");
    expect(container?.textContent).toContain("Direct Aadhaar OTP");
    expect(container?.textContent).toContain("DPDP Act Compliant");
  });

  it("renders pending manual review state when document is under review", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-2",
        status: "pending_manual_review",
        method: "ocr",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T11:59:00Z",
      },
      consent_active: true,
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <TenantKYCCard />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("Under Review");
    expect(container?.textContent).toContain("Document Pending Owner Approval");
  });

  it("renders rejection state with mandatory reason", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: {
        id: "v-3",
        status: "rejected",
        method: "ocr",
        rejection_reason: "Document photo is blurry and unreadable",
        created_at: "2026-10-17T11:59:00Z",
        updated_at: "2026-10-17T12:05:00Z",
      },
      consent_active: true,
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <TenantKYCCard />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("Rejected");
    expect(container?.textContent).toContain("Document Verification Rejected");
    expect(container?.textContent).toContain("Document photo is blurry and unreadable");
  });

  it("renders unverified action buttons for Aadhaar OTP and manual upload", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: null,
      consent_active: false,
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <TenantKYCCard />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("Verify via Aadhaar OTP");
    expect(container?.textContent).toContain("Upload ID Document");
    expect(container?.textContent).toContain("Instant Automatic UIDAI Verification");
    expect(container?.textContent).toContain("Aadhaar OTP not working? Upload your ID document instead");
  });
});

describe("OwnerKYCView", () => {
  it("renders queue items and approve/reject actions", async () => {
    vi.spyOn(kycApi, "getOwnerKYCQueue").mockResolvedValue({
      items: [
        {
          id: "review-1",
          status: "pending_manual_review",
          method: "ocr",
          tenant_name: "Rahul Sharma",
          room_number: "204",
          created_at: "2026-10-17T10:00:00Z",
          updated_at: "2026-10-17T10:00:00Z",
        },
      ],
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <OwnerKYCView />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("KYC Manual Review Queue");
    expect(container?.textContent).toContain("1 Pending Review");
    expect(container?.textContent).toContain("Rahul Sharma");
    expect(container?.textContent).toContain("Room 204");
    expect(container?.textContent).toContain("Approve");
    expect(container?.textContent).toContain("Reject");
  });

  it("renders empty queue message when no reviews are pending", async () => {
    vi.spyOn(kycApi, "getOwnerKYCQueue").mockResolvedValue({
      items: [],
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <OwnerKYCView />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("No pending manual reviews");
  });
});

describe("uploadKYCDocument", () => {
  it("appends file only once under 'file' and avoids duplicate payload", async () => {
    let capturedBody: FormData | null = null;
    vi.spyOn(clientApi, "apiFetch").mockImplementation(async (_path, options) => {
      capturedBody = options?.body as FormData;
      return { id: "test-verif" } as any;
    });

    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    await kycApi.uploadKYCDocument(file);

    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody?.get("file")).toBe(file);
    expect(capturedBody?.get("document")).toBeNull();
    expect(Array.from(capturedBody?.keys() || [])).toEqual(["file"]);
  });
});
