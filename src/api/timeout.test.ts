import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

function hangingFetch(): typeof fetch {
  return ((_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError"))
      );
    })) as typeof fetch;
}

describe("apiFetch timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("turns a stalled GET into ApiError(0) after the read budget", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const p = apiFetch("/tenant/dues");
    const assertion = expect(p).rejects.toMatchObject({ name: "ApiError", status: 0 });
    await vi.advanceTimersByTimeAsync(20_001);
    await assertion;
  });

  it("gives writes a longer budget than reads", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const p = apiFetch("/owner/dues", { method: "POST", body: "{}" });
    let settled = false;
    p.catch(() => {}).finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(settled).toBe(false);
    const assertion = expect(p).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(15_001);
    await assertion;
  });

  it("keeps a caller abort as AbortError, not ApiError", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const ctrl = new AbortController();
    const p = apiFetch("/tenant/dues", { signal: ctrl.signal });
    const assertion = expect(p).rejects.toMatchObject({ name: "AbortError" });
    ctrl.abort();
    await assertion;
  });
});
