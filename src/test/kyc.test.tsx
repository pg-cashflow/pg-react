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

  it("renders Secure QR tab when defaultTab is qr", async () => {
    vi.spyOn(kycApi, "getTenantKYCStatus").mockResolvedValue({
      verification: null,
      consent_active: false,
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <TenantKYCCard defaultTab="qr" />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("Verify via Secure QR");
    expect(container?.textContent).toContain("Instant Offline QR Verification");
    expect(container?.textContent).toContain("Verify Aadhaar QR");
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

  it("fetches blob and renders preview when clicking View Document", async () => {
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-blob-uuid");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }
    const createObjectURLSpy = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-blob-uuid");
    const revokeObjectURLSpy = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

    vi.spyOn(kycApi, "getOwnerKYCQueue").mockResolvedValue({
      items: [
        {
          id: "review-1",
          status: "pending_manual_review",
          method: "ocr",
          tenant_name: "Rahul Sharma",
          room_number: "204",
          document_name: "aadhaar.pdf",
          document_url: "/api/owner/kyc/review-1/document",
          created_at: "2026-10-17T10:00:00Z",
          updated_at: "2026-10-17T10:00:00Z",
        },
      ],
    });

    const mockBlob = new Blob(["%PDF-1.4 mock content"], { type: "application/pdf" });
    const getDocBlobSpy = vi.spyOn(kycApi, "getOwnerKYCDocumentBlob").mockResolvedValue(mockBlob);

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <OwnerKYCView />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    // Click "View Document" (or button with document_name "aadhaar.pdf")
    const viewButton = Array.from(container?.querySelectorAll("button") || []).find((b) =>
      b.textContent?.includes("aadhaar.pdf") || b.textContent?.includes("View Document")
    );
    expect(viewButton).toBeDefined();

    await act(async () => {
      viewButton?.click();
    });
    await flushQueries();

    expect(getDocBlobSpy).toHaveBeenCalledWith("review-1");
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);

    // Modal should now be visible with iframe for pdf
    expect(container?.textContent).toContain("ID Document Preview");
    expect(container?.textContent).toContain("Rahul Sharma");
    const iframe = container?.querySelector("iframe");
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute("src")).toBe("blob:http://localhost/mock-blob-uuid");

    // Close preview
    const closeBtn = container?.querySelector('button[aria-label="Close preview"]') as HTMLButtonElement | null;
    expect(closeBtn).toBeDefined();

    await act(async () => {
      closeBtn?.click();
    });
    await flushQueries();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:http://localhost/mock-blob-uuid");
  });

  it("handles preview error gracefully when document is not found", async () => {
    vi.spyOn(kycApi, "getOwnerKYCQueue").mockResolvedValue({
      items: [
        {
          id: "review-legacy",
          status: "pending_manual_review",
          method: "ocr",
          tenant_name: "Legacy User",
          document_name: "legacy.jpg",
          created_at: "2026-10-17T10:00:00Z",
          updated_at: "2026-10-17T10:00:00Z",
        },
      ],
    });

    vi.spyOn(kycApi, "getOwnerKYCDocumentBlob").mockRejectedValue(new Error("404 Not Found"));

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <OwnerKYCView />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    const viewButton = Array.from(container?.querySelectorAll("button") || []).find((b) =>
      b.textContent?.includes("legacy.jpg") || b.textContent?.includes("View Document")
    );
    expect(viewButton).toBeDefined();

    await act(async () => {
      viewButton?.click();
    });
    await flushQueries();

    expect(container?.textContent).toContain("ID Document Preview");
    expect(container?.textContent).toContain("Document Preview Unavailable");
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

  it("delegates to apiUpload when onProgress callback is supplied", async () => {
    let capturedBody: FormData | null = null;
    let capturedOptions: clientApi.UploadOptions | undefined;
    vi.spyOn(clientApi, "apiUpload").mockImplementation(async (_path, formData, options) => {
      capturedBody = formData;
      capturedOptions = options;
      options?.onProgress?.({ loaded: 50, total: 100, percent: 50 });
      return { id: "test-verif-upload" } as any;
    });

    const file = new File(["dummy content"], "id.jpg", { type: "image/jpeg" });
    let progressReceived = 0;
    const res = await kycApi.uploadKYCDocument(file, {
      onProgress: (pct) => {
        progressReceived = pct;
      },
    });

    expect(res).toEqual({ id: "test-verif-upload" });
    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody?.get("file")).toBe(file);
    expect(progressReceived).toBe(50);
    expect(capturedOptions?.onProgress).toBeDefined();
  });
});
