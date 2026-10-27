import { beforeEach, describe, expect, it, vi } from "vitest";
import { refundPayment } from "./payments";
import { apiFetch } from "./client";
import { setAccessToken } from "../auth/tokenStore";

describe("refundPayment API and client headers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it("refundPayment dispatches POST /owner/payments/:id/refund with Idempotency-Key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "rf_123",
        payment_id: "pay_456",
        amount_paise: 50000,
        status: "initiated",
        reason: "Tenant deposit refund",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refundPayment(
      "pay_456",
      {
        amount_paise: 50000,
        reason: "Tenant deposit refund",
      },
      "custom-idempotency-key-789"
    );

    expect(result.id).toBe("rf_123");
    expect(result.status).toBe("initiated");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/owner/payments/pay_456/refund");
    expect(init.method).toBe("POST");
    expect(init.headers["Idempotency-Key"]).toBe("custom-idempotency-key-789");
    expect(init.headers["Content-Type"]).toBe("application/json");

    const parsedBody = JSON.parse(init.body);
    expect(parsedBody.amount_paise).toBe(50000);
    expect(parsedBody.reason).toBe("Tenant deposit refund");
  });

  it("refundPayment unwraps nested refund object on HTTP 202 Accepted response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "refund processing or gateway response ambiguous; reconciliation in progress",
        refund: {
          id: "rf_202_accepted",
          payment_id: "pay_456",
          amount_paise: 25000,
          status: "initiated",
          reason: "Ambiguous timeout retry",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refundPayment("pay_456", {
      amount_paise: 25000,
      reason: "Ambiguous timeout retry",
    });

    expect(result.id).toBe("rf_202_accepted");
    expect(result.status).toBe("initiated");
    expect(result.amount_paise).toBe(25000);
  });

  it("apiFetch omits Content-Type on GET requests to prevent CORS preflight", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/owner/payments");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("apiFetch includes Content-Type on POST requests with JSON payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/owner/payments/test", {
      method: "POST",
      body: JSON.stringify({ test: 123 }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
  });
});
