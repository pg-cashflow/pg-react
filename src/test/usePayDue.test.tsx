import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { usePayDue } from "@/lib/usePayDue";
import { API_BASE } from "@/lib/constants";
import * as cashfreeModule from "@/lib/cashfree";

const dueId = "due-test-123";

let verifyShouldSucceed = true;
let verifyStatus = 200;
let dueStatus = "pending";

const server = setupServer(
  http.get(`${API_BASE}/tenant/dues/:id/pay`, () => {
    return HttpResponse.json({
      mode: "cashfree",
      payable: true,
      amount_paise: 500000,
      due_code: "RENT-01",
      payment_session_id: "sess_test_123",
      note: "Rent Due",
    });
  }),
  http.post(`${API_BASE}/tenant/dues/:id/pay/verify`, () => {
    if (verifyStatus === 404) {
      return HttpResponse.json({ error: "not found" }, { status: 404 });
    }
    return HttpResponse.json({ paid: verifyShouldSucceed });
  }),
  http.get(`${API_BASE}/tenant/dues`, () => {
    return HttpResponse.json({
      dues: [
        {
          id: dueId,
          due_code: "RENT-01",
          amount: 500000,
          status: dueStatus,
        },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe("usePayDue State Machine", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    verifyShouldSucceed = true;
    verifyStatus = 200;
    dueStatus = "pending";
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("transitions directly to PAID when immediate verify succeeds", async () => {
    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({
      kind: "completed",
      details: { orderId: "ord_1" },
    });

    const { result } = renderHook(() => usePayDue(dueId), { wrapper });

    expect(result.current.state).toBe("READY");

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.state).toBe("PAID");
  });

  it("falls back gracefully to polling dues if verify returns 404", async () => {
    verifyStatus = 404;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({
      kind: "completed",
      details: { orderId: "ord_2" },
    });

    const { result } = renderHook(() => usePayDue(dueId), { wrapper });

    await act(async () => {
      await result.current.startPayment();
    });

    // Enters CONFIRMING because verify returned 404
    expect(result.current.state).toBe("CONFIRMING");

    // Simulate webhook arrival flipping the ledger
    dueStatus = "paid";

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.state).toBe("PAID");
    vi.useRealTimers();
  });

  it("enters CHECKING and quietly returns to READY on modal dismiss if unpaid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({
      kind: "error",
      error: { message: "User closed popup" },
    });

    const { result } = renderHook(() => usePayDue(dueId), { wrapper });

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.state).toBe("CHECKING");

    // Advance through 10s quiet checking deadline
    await act(async () => {
      vi.advanceTimersByTime(11000);
    });

    // Returns to READY with no error banner
    expect(result.current.state).toBe("READY");
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it("transitions to REDIRECTING when checkout requires browser redirection", async () => {
    const onRedirect = vi.fn();
    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({
      kind: "redirect",
    });

    const { result } = renderHook(() => usePayDue(dueId, { onRedirect }), { wrapper });

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.state).toBe("REDIRECTING");
    expect(onRedirect).toHaveBeenCalled();
  });
});
