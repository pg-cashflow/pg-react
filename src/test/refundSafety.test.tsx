import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefundModal } from "../components/owner/RefundModal";
import * as payments from "../api/payments";
import { ApiError } from "../api/client";
import type { Payment, GatewayRefund } from "@pg/types";

let container: HTMLDivElement, root: Root;
const payment = { id: "payment-1", amount: 100000, matched_by: "cashfree" } as Payment;
beforeEach(() => {
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.spyOn(payments, "getPaymentRefundHistory").mockResolvedValue({
    payment_id: "payment-1",
    original_amount_paise: 100000,
    refunded_amount_paise: 0,
    reserved_amount_paise: 0,
    remaining_refundable_paise: 100000,
    refund_eligible: true,
    refund_window_days: 120,
    refunds: [],
    pending_operation: null,
  });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });
async function open() {
  await act(async () => root.render(<RefundModal payment={payment} tenantName="Test tenant" isOpen onClose={() => {}} />));
  const input = container.querySelectorAll("input")[1];
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Fee");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
describe("refund recovery safety", () => {
  it("reuses the same operation key after a lost response and accepts the server's three-character minimum", async () => {
    const spy = vi.spyOn(payments, "refundPayment").mockRejectedValue(new ApiError(0, "Connection lost"));
    await open();
    await submit();
    await submit();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][2]).toBe(spy.mock.calls[1][2]);
    expect(spy.mock.calls[0][1].reason).toBe("Fee");
  });
  it("shows a pending status instead of an empty result for ONHOLD", async () => {
    vi.spyOn(payments, "refundPayment").mockResolvedValue({ status: "on_hold", amount_paise: 100000 } as GatewayRefund);
    await open();
    await submit();
    expect(container.textContent).toContain("Refund Initiated");
    expect(container.querySelector("form")).toBeNull();
  });
  it("limits maximum refund to remaining balance returned by refund history", async () => {
    vi.spyOn(payments, "getPaymentRefundHistory").mockResolvedValue({
      payment_id: "payment-1",
      original_amount_paise: 100000,
      refunded_amount_paise: 60000,
      reserved_amount_paise: 0,
      remaining_refundable_paise: 40000,
      refund_eligible: true,
      refund_window_days: 120,
      refunds: [],
      pending_operation: null,
    });
    await open();
    expect(container.textContent).toContain("400.00");
  });

  it("ignores a stale refund-history response after switching payments", async () => {
    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((res) => { resolve = res; });
      return { promise, resolve };
    };
    const first = deferred<payments.PaymentRefundHistory>();
    const second = deferred<payments.PaymentRefundHistory>();
    vi.spyOn(payments, "getPaymentRefundHistory").mockImplementation((id) =>
      id === "payment-1" ? first.promise : second.promise
    );

    const nextPayment = { ...payment, id: "payment-2" } as Payment;
    act(() => root.render(<RefundModal payment={payment} tenantName="Test tenant" isOpen onClose={() => {}} />));
    act(() => root.render(<RefundModal payment={nextPayment} tenantName="Test tenant" isOpen onClose={() => {}} />));

    await act(async () => {
      second.resolve({
        payment_id: "payment-2",
        original_amount_paise: 50000,
        refunded_amount_paise: 0,
        reserved_amount_paise: 0,
        remaining_refundable_paise: 50000,
        refund_eligible: true,
        refund_window_days: 120,
        refunds: [],
        pending_operation: null,
      });
      await second.promise;
    });
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(amountInput.max).toBe("500");

    await act(async () => {
      first.resolve({
        payment_id: "payment-1",
        original_amount_paise: 100000,
        refunded_amount_paise: 0,
        reserved_amount_paise: 0,
        remaining_refundable_paise: 100000,
        refund_eligible: true,
        refund_window_days: 120,
        refunds: [],
        pending_operation: null,
      });
      await first.promise;
    });
    expect(amountInput.max).toBe("500");
  });

  it("uses server-computed expiry eligibility and blocks expired refunds", async () => {
    const expiredPayment = { id: "payment-old", amount: 100000, matched_by: "cashfree" } as Payment;
    vi.spyOn(payments, "getPaymentRefundHistory").mockResolvedValue({
      payment_id: "payment-old",
      original_amount_paise: 100000,
      refunded_amount_paise: 0,
      reserved_amount_paise: 0,
      remaining_refundable_paise: 100000,
      refund_eligible: false,
      refund_window_days: 120,
      refunds: [],
      pending_operation: null,
    });
    await act(async () => root.render(<RefundModal payment={expiredPayment} tenantName="Old tenant" isOpen onClose={() => {}} />));
    expect(container.textContent).toContain("cannot be refunded via gateway");
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("does not use the browser payment timestamp to decide refund eligibility", async () => {
    const oldClientTimestamp = {
      id: "payment-old-client-clock",
      amount: 100000,
      matched_by: "cashfree",
      created_at: "2000-01-01T00:00:00.000Z",
    } as Payment;
    vi.spyOn(payments, "getPaymentRefundHistory").mockResolvedValue({
      payment_id: oldClientTimestamp.id,
      original_amount_paise: 100000,
      refunded_amount_paise: 0,
      reserved_amount_paise: 0,
      remaining_refundable_paise: 100000,
      refund_eligible: true,
      refund_window_days: 120,
      refunds: [],
      pending_operation: null,
    });
    await act(async () => root.render(<RefundModal payment={oldClientTimestamp} tenantName="Test tenant" isOpen onClose={() => {}} />));
    const reasonInput = container.querySelectorAll("input")[1];
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(reasonInput, "Fee");
      reasonInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    expect(container.textContent).not.toContain("cannot be refunded via gateway");
  });
});
