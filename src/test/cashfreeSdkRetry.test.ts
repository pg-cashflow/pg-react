import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preloadCashfreeSdk, _resetCashfreeInstanceForTests } from "../lib/cashfree";

describe("Cashfree SDK loading recovery", () => {
  beforeEach(() => {
    _resetCashfreeInstanceForTests();
    delete window.Cashfree;
    document.querySelectorAll("script[data-pg-cashfree]").forEach((s) => s.remove());
  });
  afterEach(() => { vi.useRealTimers(); delete window.Cashfree; });

  it("creates a fresh script after a network failure", async () => {
    const first = preloadCashfreeSdk();
    const assertion = expect(first).rejects.toThrow("failed to load");
    const old = document.querySelector("script[data-pg-cashfree]")!;
    old.dispatchEvent(new Event("error"));
    await assertion;
    expect(old.isConnected).toBe(false);
    const retry = preloadCashfreeSdk();
    const fresh = document.querySelector("script[data-pg-cashfree]")!;
    expect(fresh).not.toBe(old);
    window.Cashfree = vi.fn();
    fresh.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBeUndefined();
  });

  it("removes timed-out scripts and rejects a load without the SDK global", async () => {
    vi.useFakeTimers();
    const first = preloadCashfreeSdk();
    const assertion = expect(first).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(10_001);
    await assertion;
    expect(document.querySelector("script[data-pg-cashfree]")).toBeNull();
    const retry = preloadCashfreeSdk();
    const rejected = expect(retry).rejects.toThrow("did not initialize");
    document.querySelector("script[data-pg-cashfree]")!.dispatchEvent(new Event("load"));
    await rejected;
  });
});
