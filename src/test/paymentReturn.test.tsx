import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentReturnView } from "@/routes/payment/return";
import { LocaleProvider } from "@/i18n";
import * as payApi from "@/api/pay";
import * as authContext from "@/auth/context";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
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

const renderWithProviders = async (role: "tenant" | "owner" = "tenant") => {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    role,
    user: { id: "u-1", phone: "9999999999", role, full_name: "Test User" },
    token: "mock-token",
    isAuthenticated: true,
    isLoading: false,
    phone: "9999999999",
    activePropertyId: "prop-1",
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    switchProperty: vi.fn(),
  } as any);

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <PaymentReturnView />
        </LocaleProvider>
      </QueryClientProvider>
    );
  });
};

describe("PaymentReturnView", () => {
  it("renders verifying state and transitions to paid when order verification succeeds", async () => {
    // Mock location.search
    delete (window as any).location;
    window.location = new URL("https://app.pg.local/payment/return?order_id=order_abc123&due_id=due_xyz") as any;

    const verifySpy = vi.spyOn(payApi, "verifyOrderPay").mockResolvedValue({
      paid: true,
      status: "SUCCESS",
      due_ids: ["due_xyz"],
    });

    await renderWithProviders("tenant");

    // Expect verifyOrderPay to be called with only orderId
    expect(verifySpy).toHaveBeenCalledWith("order_abc123");

    // Fast-forward promises
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container?.textContent).toContain("Payment Received!");
    expect(container?.textContent).toContain("order_abc123");
    expect(container?.textContent).toContain("Back to Dues");

    // Test button click
    const backBtn = container?.querySelector("button");
    expect(backBtn).not.toBeNull();
    act(() => {
      backBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/tenant" });
  });

  it("navigates to owner dues when owner role clicks back to dues", async () => {
    delete (window as any).location;
    window.location = new URL("https://app.pg.local/payment/return?order_id=order_owner1") as any;

    vi.spyOn(payApi, "verifyOrderPay").mockResolvedValue({
      paid: true,
      status: "SUCCESS",
    });

    await renderWithProviders("owner");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const backBtn = container?.querySelector("button");
    act(() => {
      backBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/owner/dues" });
  });
});
