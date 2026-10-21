import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentGatewaySettingsCard } from "../components/owner/PaymentGatewaySettingsCard";
import * as propertiesApi from "../api/properties";
import type { Property } from "..pg/types";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

const mockProperties: Property[] = [
  {
    id: "prop-123",
    name: "Green Hostel",
    owner_phone: "9998887766",
    owner_name: "John Owner",
    owner_email: "owner@example.com",
    payment_mode: "manual",
    created_at: new Date().toISOString(),
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

describe("PaymentGatewaySettingsCard Component", () => {
  it("renders gateway online badge and current manual mode correctly", async () => {
    vi.spyOn(propertiesApi, "getProperties").mockResolvedValue(mockProperties);
    vi.spyOn(propertiesApi, "getCashfreeReadiness").mockResolvedValue({
      ready: true,
      payment_mode: "manual",
      reason: "Cashfree payment gateway operational",
      env: "sandbox",
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <PaymentGatewaySettingsCard propertyId="prop-123" />
        </QueryClientProvider>
      );
    });
    await flushQueries();

    expect(container?.textContent).toContain("Rent Collection & Gateway Platform");
    expect(container?.textContent).toContain("Cashfree Online (Sandbox Active)");
    expect(container?.textContent).toContain("Manual UPI QR Code");
    expect(container?.textContent).toContain("Cashfree Checkout");
  });

  it("handles 1-click activation of Cashfree checkout when gateway is ready", async () => {
    vi.spyOn(propertiesApi, "getProperties").mockResolvedValue(mockProperties);
    vi.spyOn(propertiesApi, "getCashfreeReadiness").mockResolvedValue({
      ready: true,
      payment_mode: "manual",
      reason: "Cashfree payment gateway operational",
      env: "sandbox",
    });

    const updateSpy = vi.spyOn(propertiesApi, "updatePropertyPaymentMode").mockResolvedValue({
      ok: true,
      property_id: "prop-123",
      payment_mode: "cashfree",
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <PaymentGatewaySettingsCard propertyId="prop-123" />
        </QueryClientProvider>
      );
    });

    // Find the Cashfree button and click it
    const buttons = container?.querySelectorAll("button");
    const cashfreeBtn = Array.from(buttons || []).find((b) =>
      b.textContent?.includes("Cashfree Checkout")
    );
    expect(cashfreeBtn).toBeDefined();

    await act(async () => {
      cashfreeBtn?.click();
    });

    expect(updateSpy).toHaveBeenCalledWith("prop-123", "cashfree");
    expect(container?.textContent).toContain("Cashfree Web Checkout activated");
  });

  it("blocks activation and displays warning message when gateway is offline", async () => {
    vi.spyOn(propertiesApi, "getProperties").mockResolvedValue(mockProperties);
    vi.spyOn(propertiesApi, "getCashfreeReadiness").mockResolvedValue({
      ready: false,
      payment_mode: "manual",
      reason: "Cashfree credentials missing on server",
      env: "sandbox",
    });

    const updateSpy = vi.spyOn(propertiesApi, "updatePropertyPaymentMode");

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <PaymentGatewaySettingsCard propertyId="prop-123" />
        </QueryClientProvider>
      );
    });

    expect(container?.textContent).toContain("Gateway Inactive (Cashfree credentials missing on server)");

    const buttons = container?.querySelectorAll("button");
    const cashfreeBtn = Array.from(buttons || []).find((b) =>
      b.textContent?.includes("Cashfree Checkout")
    );

    // Button should be disabled
    expect(cashfreeBtn?.disabled).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
