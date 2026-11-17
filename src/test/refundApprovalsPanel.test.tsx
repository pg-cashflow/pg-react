import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefundApprovalsPanel } from "../components/owner/RefundApprovalsPanel";
import * as paymentsApi from "../api/payments";
import * as tenantsApi from "../api/tenants";
import * as authContext from "../auth/context";
import { ApiError } from "../api/client";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

const mockRequests: paymentsApi.RefundApprovalRequest[] = [
  {
    id: "req-1",
    property_id: "prop-1",
    payment_id: "pay-1",
    tenant_id: "tenant-1",
    amount_paise: 500000,
    reason: "Security deposit refund",
    idempotency_key: "idemp-1",
    requested_by: "user-maker",
    requested_by_role: "owner",
    status: "pending",
    required_approvals: 2,
    material_hash: "hash-1",
    approvals: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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

  vi.spyOn(tenantsApi, "getTenants").mockResolvedValue([
    { id: "tenant-1", name: "Ravi Kumar" } as any,
  ]);
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

const renderComponent = async (userId: string) => {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    userId,
    user: { id: userId, phone: "+919876543210", role: "owner" } as any,
    role: "owner",
    isAuthenticated: true,
    isLoading: false,
  } as any);

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <RefundApprovalsPanel />
      </QueryClientProvider>
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
};

describe("RefundApprovalsPanel Component", () => {
  it("renders null when no pending requests exist", async () => {
    vi.spyOn(paymentsApi, "listRefundApprovalRequests").mockResolvedValue({
      refund_requests: [],
    });
    await renderComponent("user-checker");
    expect(container?.innerHTML).toBe("");
  });

  it("renders pending approval queue with tenant name, formatted amount, and reason", async () => {
    vi.spyOn(paymentsApi, "listRefundApprovalRequests").mockResolvedValue({
      refund_requests: mockRequests,
    });
    await renderComponent("user-checker");
    expect(container?.textContent).toContain("Ravi Kumar");
    expect(container?.textContent).toContain("5,000.00");
    expect(container?.textContent).toContain("Security deposit refund");
    expect(container?.textContent).toContain("0 / 2");
  });

  it("blocks maker from self-approving their own refund request", async () => {
    vi.spyOn(paymentsApi, "listRefundApprovalRequests").mockResolvedValue({
      refund_requests: mockRequests,
    });
    await renderComponent("user-maker");
    expect(container?.textContent).toContain("Maker self-approval prohibited");
    // Ensure no Approve or Reject buttons rendered for maker
    const approveBtn = container?.querySelector("button.bg-success");
    expect(approveBtn).toBeNull();
  });

  it("permits distinct secondary owner to approve request", async () => {
    vi.spyOn(paymentsApi, "listRefundApprovalRequests").mockResolvedValue({
      refund_requests: mockRequests,
    });
    const approveSpy = vi
      .spyOn(paymentsApi, "approveRefundApprovalRequest")
      .mockResolvedValue({} as any);

    await renderComponent("user-checker");
    const approveBtn = Array.from(container?.querySelectorAll("button") || []).find((b) =>
      b.textContent?.includes("Approve")
    );
    expect(approveBtn).toBeDefined();

    await act(async () => {
      approveBtn?.click();
    });

    expect(container?.textContent).toContain("Approve Refund Request");

    const confirmApproveBtn = container?.querySelector('form button[type="submit"]') as HTMLButtonElement;
    expect(confirmApproveBtn).toBeDefined();

    await act(async () => {
      confirmApproveBtn?.click();
    });

    expect(approveSpy).toHaveBeenCalledWith("req-1", {
      note: undefined,
      otp: undefined,
    });
  });

  it("displays step-up OTP field when server returns stepUpRequired", async () => {
    vi.spyOn(paymentsApi, "listRefundApprovalRequests").mockResolvedValue({
      refund_requests: mockRequests,
    });
    vi.spyOn(paymentsApi, "approveRefundApprovalRequest").mockRejectedValue(
      new ApiError(401, "OTP required", "auth.stepUpRequired")
    );

    await renderComponent("user-checker");
    const approveBtn = Array.from(container?.querySelectorAll("button") || []).find((b) =>
      b.textContent?.includes("Approve")
    );

    await act(async () => {
      approveBtn?.click();
    });

    const confirmApproveBtn = container?.querySelector('form button[type="submit"]') as HTMLButtonElement;
    expect(confirmApproveBtn).toBeDefined();

    await act(async () => {
      confirmApproveBtn?.click();
    });

    expect(container?.textContent).toContain("Authorization OTP required");
    const otpInput = container?.querySelector('input[placeholder="Enter 6-digit OTP"]');
    expect(otpInput).toBeDefined();
  });

  it("permits secondary owner to reject request with required reason", async () => {
    vi.spyOn(paymentsApi, "listRefundApprovalRequests").mockResolvedValue({
      refund_requests: mockRequests,
    });
    const rejectSpy = vi
      .spyOn(paymentsApi, "rejectRefundApprovalRequest")
      .mockResolvedValue({} as any);

    await renderComponent("user-checker");
    const rejectBtn = Array.from(container?.querySelectorAll("button") || []).find((b) =>
      b.textContent?.includes("Reject")
    );
    expect(rejectBtn).toBeDefined();

    await act(async () => {
      rejectBtn?.click();
    });

    expect(container?.textContent).toContain("Reject Refund Request");

    const reasonTextarea = container?.querySelector("textarea");
    expect(reasonTextarea).toBeDefined();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
        reasonTextarea,
        "Duplicate claim"
      );
      reasonTextarea?.dispatchEvent(new Event("input", { bubbles: true }));
      reasonTextarea?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const confirmRejectBtn = container?.querySelector('form button[type="submit"]') as HTMLButtonElement;
    expect(confirmRejectBtn).toBeDefined();

    await act(async () => {
      confirmRejectBtn?.click();
    });

    expect(rejectSpy).toHaveBeenCalledWith("req-1", "Duplicate claim");
  });
});
