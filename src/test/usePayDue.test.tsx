import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { usePayDue } from "@/lib/usePayDue";
import { API_BASE } from "@/lib/constants";
import * as cashfreeModule from "@/lib/cashfree";

function renderHook<T>(callback: () => T, options?: { wrapper?: React.ComponentType<{ children: React.ReactNode }> }) {
  const result = { current: undefined as unknown as T };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  const Wrapper = options?.wrapper || (({ children }: { children: React.ReactNode }) => <>{children}</>);

  act(() => {
    root.render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );
  });

  return {
    result,
    rerender: () => {
      act(() => {
        root.render(
          <Wrapper>
            <TestComponent />
          </Wrapper>
        );
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

const dueId = "due-test-123";

let verifyShouldSucceed = true;
let verifyStatus = 200;
let verifyClassification = "PENDING";
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
  http.post(`${API_BASE}/tenant/dues/:id/pay`, () => {
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
    return HttpResponse.json({
      paid: verifyShouldSucceed,
      status: verifyShouldSucceed ? "PAID" : verifyClassification,
    });
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
    verifyClassification = "PENDING";
    dueStatus = "pending";
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("does not label a policy-blocked non-payable due as paid", async () => {
    verifyShouldSucceed = false;
    server.use(
      http.get(`${API_BASE}/tenant/dues/:id/pay`, () => HttpResponse.json({ payable: false, mode: "manual" })),
      http.post(`${API_BASE}/tenant/dues/:id/pay`, () => HttpResponse.json({ payable: false, mode: "manual" }))
    );
    const hook = renderHook(() => usePayDue(dueId), { wrapper });
    await act(async () => { await hook.result.current.startPayment(); });
    expect(hook.result.current.state).toBe("READY");
    expect(hook.result.current.error).toContain("not available");
    hook.unmount();
  });

  it("opens only one checkout for simultaneous clicks", async () => {
    const checkout = vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({ kind: "completed", details: {} });
    const hook = renderHook(() => usePayDue(dueId), { wrapper });
    await act(async () => { await Promise.all([hook.result.current.startPayment(), hook.result.current.startPayment()]); });
    expect(checkout).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

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
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(result.current.state).toBe("PAID");
    vi.useRealTimers();
  });

  it("keeps STILL_PENDING when modal errors/dismisses and server reports PENDING", async () => {
    verifyShouldSucceed = false;
    verifyClassification = "PENDING";
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    // Must NOT allow retry while Cashfree still reports PENDING
    expect(result.current.state).toBe("STILL_PENDING");
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it("returns to READY only when server confirms RETRYABLE after terminal attempt", async () => {
    verifyShouldSucceed = false;
    verifyClassification = "RETRYABLE";
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(result.current.state).toBe("READY");
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it("transitions to WAIVED without firing onPaid when due is waived", async () => {
    verifyShouldSucceed = false;
    verifyClassification = "WAIVED";
    const onPaid = vi.fn();
    const onWaived = vi.fn();

    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({
      kind: "completed",
      details: { orderId: "ord_waived" },
    });

    const { result } = renderHook(() => usePayDue(dueId, { onPaid, onWaived }), { wrapper });

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.state).toBe("WAIVED");
    expect(onPaid).not.toHaveBeenCalled();
    expect(onWaived).toHaveBeenCalledTimes(1);
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

  it("enters CHECKING when Cashfree SDK throws or rejects after launch (F-10)", async () => {
    verifyShouldSucceed = false;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockRejectedValue(
      new Error("SDK bridge crashed or network timeout")
    );

    const { result } = renderHook(() => usePayDue(dueId), { wrapper });

    await act(async () => {
      await result.current.startPayment();
    });

    // Must NOT immediately fail to READY; enters ambiguous CHECKING state to verify with server
    expect(result.current.state).toBe("CHECKING");

    // Advance through quiet checking window (10s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    // PAY-UI-01: Must hold unresolved STILL_PENDING state rather than resetting to READY
    expect(result.current.state).toBe("STILL_PENDING");
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it("transitions to STILL_PENDING on ambiguous outcome (PAY-UI-01)", async () => {
    verifyShouldSucceed = false;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.spyOn(cashfreeModule, "startCashfreeCheckout").mockResolvedValue({
      kind: "ambiguous",
    });

    const { result } = renderHook(() => usePayDue(dueId), { wrapper });

    await act(async () => {
      await result.current.startPayment();
    });

    expect(result.current.state).toBe("CHECKING");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(result.current.state).toBe("STILL_PENDING");
    vi.useRealTimers();
  });
});
