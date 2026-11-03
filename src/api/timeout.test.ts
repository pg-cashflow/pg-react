import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, requestTokenRefresh, getLastRefreshError, stopProactiveRefresh } from "./client";
import { getAccessToken, setAccessToken } from "../auth/tokenStore";

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
    stopProactiveRefresh();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("bounds a stalled refresh and releases the shared refresh promise", async () => {
    setAccessToken("existing-token");
    vi.stubGlobal("fetch", hangingFetch());
    const pending = requestTokenRefresh("existing-token");
    await vi.advanceTimersByTimeAsync(45_001);
    expect(await pending).toBeNull();
    expect(getLastRefreshError()).toMatchObject({ status: 0 });
    expect(getAccessToken()).toBe("existing-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "recovered-token" }) }));
    expect(await requestTokenRefresh("existing-token")).toBe("recovered-token");
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
