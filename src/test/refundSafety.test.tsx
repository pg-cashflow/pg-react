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
});
