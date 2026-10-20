import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatMatchedBy } from "@/lib/utils";
import { startCashfreeCheckout } from "@/lib/cashfree";

describe("Cashfree checkout precedence and result mapping", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      Cashfree: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prioritizes paymentDetails over redirect and error", async () => {
    const mockCheckout = vi.fn().mockResolvedValue({
      paymentDetails: { paymentMessage: "Transaction Successful", orderId: "order_123" },
      redirect: true,
      error: { message: "Some error" },
    });

    (window as any).Cashfree = vi.fn().mockReturnValue({
      checkout: mockCheckout,
    });

    const result = await startCashfreeCheckout("sess_123");
    expect(result.kind).toBe("completed");
    if (result.kind === "completed") {
      expect(result.details.orderId).toBe("order_123");
    }
  });

  it("prioritizes redirect over error when paymentDetails is absent", async () => {
    const mockCheckout = vi.fn().mockResolvedValue({
      redirect: true,
      error: { message: "Popup blocked" },
    });

    (window as any).Cashfree = vi.fn().mockReturnValue({
      checkout: mockCheckout,
    });

    const result = await startCashfreeCheckout("sess_123");
    expect(result.kind).toBe("redirect");
  });

  it("maps error when user closes the popup or payment fails", async () => {
    const mockCheckout = vi.fn().mockResolvedValue({
      error: { message: "User closed popup" },
    });

    (window as any).Cashfree = vi.fn().mockReturnValue({
      checkout: mockCheckout,
    });

    const result = await startCashfreeCheckout("sess_123");
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error?.message).toBe("User closed popup");
    }
  });
});

describe("Payment history formatting and localization", () => {
  it("formats cashfree as 'Paid online'", () => {
    expect(formatMatchedBy("cashfree")).toBe("Paid online");
  });

  it("uses localization dictionary when translation function is passed", () => {
    const mockT = vi.fn((key: string) => {
      if (key === "payment.paidOnline") return "ಆನ್‌ಲೈನ್‌ ಪಾವತಿ";
      return key;
    });

    expect(formatMatchedBy("cashfree", mockT as any)).toBe("ಆನ್‌ಲೈನ್‌ ಪಾವತಿ");
    expect(mockT).toHaveBeenCalledWith("payment.paidOnline");
  });

  it("replaces underscores for standard manual matched_by", () => {
    expect(formatMatchedBy("due_code")).toBe("due code");
    expect(formatMatchedBy("amount_date_window")).toBe("amount date window");
  });
});
