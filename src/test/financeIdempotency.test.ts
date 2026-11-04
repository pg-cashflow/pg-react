import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExpense, recordExpensePayment, createCapitalEntry, createIdempotencyKey } from "../api/finance";

describe("finance API idempotency key handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("createExpense passes supplied custom idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ expense: { id: "exp-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createExpense(
      {
        category_code: "vendor",
        description: "Test Expense",
        amount_paise: 10000,
      },
      "custom-idem-exp-123"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBe("custom-idem-exp-123");
  });

  it("recordExpensePayment passes supplied custom idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ payment: { id: "pay-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await recordExpensePayment(
      "exp-1",
      {
        amount_paise: 10000,
        method: "bank_transfer",
      },
      "custom-idem-pay-456"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/owner/finance/expenses/exp-1/payments");
    expect(init.headers["Idempotency-Key"]).toBe("custom-idem-pay-456");
  });

  it("createCapitalEntry passes supplied custom idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ capital: { id: "cap-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createCapitalEntry(
      {
        kind: "additional",
        amount_paise: 500000,
        purpose: "Maintenance fund",
      },
      "custom-idem-cap-789"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/owner/finance/capital");
    expect(init.headers["Idempotency-Key"]).toBe("custom-idem-cap-789");
  });

  it("generates a valid non-empty idempotency key when none is supplied", () => {
    const key = createIdempotencyKey();
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(5);
  });
});

