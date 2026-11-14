import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scheduleProactiveRefresh,
  stopProactiveRefresh,
  executeRefresh,
  requestTokenRefresh,
  apiFetch,
} from "./client";
import { getAccessToken, setAccessToken } from "../auth/tokenStore";
import { getStoredUser, setStoredUser } from "../auth/storage";

describe("api/client proactive refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopProactiveRefresh();
    setAccessToken(null);
    setStoredUser(null);
    delete (navigator as unknown as { locks?: unknown }).locks;
  });

  afterEach(() => {
    stopProactiveRefresh();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (navigator as unknown as { locks?: unknown }).locks;
  });

  it("proactive refresh fires at minute 12 and rotates token into tokenStore", async () => {
    setAccessToken("old-access-token");
    setStoredUser({ id: "u1", role: "owner", phone: "+918008281429" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "fresh-access-token-12m",
        user: { id: "u1", role: "owner", phone: "+918008281429" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    scheduleProactiveRefresh(); // 12 minutes

    // Minute 11: should not have refreshed yet
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("old-access-token");

    // Advance to minute 12: fires
    await vi.advanceTimersByTimeAsync(1 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("fresh-access-token-12m");
    expect(getStoredUser()?.id).toBe("u1");

    // Re-arms for next cycle: advance another 12 minutes
    await vi.advanceTimersByTimeAsync(12 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("proactive refresh routes through navigator.locks to prevent cross-tab refresh race", async () => {
    const lockRequestSpy = vi.fn().mockImplementation((_name, cb) => cb());
    Object.defineProperty(navigator, "locks", {
      value: { request: lockRequestSpy },
      configurable: true,
      writable: true,
    });

    setAccessToken("token-to-rotate");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "new-token-locked",
        user: { id: "u1", role: "owner", phone: "+918008281429" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    scheduleProactiveRefresh(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(lockRequestSpy).toHaveBeenCalledWith("pg_token_refresh", expect.any(Function));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("new-token-locked");
  });

  it("reactive refresh re-arms proactive refresh timer (Bug 3 fix)", async () => {
    setAccessToken("stale-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "reactive-refreshed-token",
        user: { id: "u1", role: "owner", phone: "+918008281429" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Call reactive refresh directly
    const res = await requestTokenRefresh("stale-token");
    expect(res).toBe("reactive-refreshed-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Proactive refresh should now be armed for minute 12
    await vi.advanceTimersByTimeAsync(12 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("apiFetch 401 dispatches pg:unauthorized exactly once when refresh fails (Bug 4 fix)", async () => {
    setAccessToken("bad-token");
    const unauthorizedSpy = vi.fn();
    window.addEventListener("pg:unauthorized", unauthorizedSpy);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: "AUTH_ACCESS_REVOKED" }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/owner/properties")).rejects.toThrow("Session expired or unauthorized");

    // Exactly one pg:unauthorized event should have been dispatched
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener("pg:unauthorized", unauthorizedSpy);
  });

  it("apiFetch throws the 503 error when refresh fails with 503 instead of false session expiration", async () => {
    setAccessToken("current-token");
    setStoredUser({ id: "u1", role: "tenant", phone: "+919000000000" });
    const unauthorizedSpy = vi.fn();
    window.addEventListener("pg:unauthorized", unauthorizedSpy);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve({
          ok: false,
          status: 503,
          json: async () => ({ error: "Database unavailable", message: "Database unavailable" }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/tenant/dues")).rejects.toMatchObject({
      status: 503,
      message: "Database unavailable",
    });

    // Session should remain preserved
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    expect(getStoredUser()).not.toBeNull();

    window.removeEventListener("pg:unauthorized", unauthorizedSpy);
  });


  it("executeRefresh handles revoked session (AUTH_ACCESS_REVOKED) without retry loop", async () => {
    setAccessToken("expiring-token");
    setStoredUser({ id: "u1", role: "tenant", phone: "+919000000000" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "AUTH_ACCESS_REVOKED" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const unauthorizedSpy = vi.fn();
    window.addEventListener("pg:unauthorized", unauthorizedSpy);

    const result = await executeRefresh("expiring-token");
    expect(result).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener("pg:unauthorized", unauthorizedSpy);
  });

  it("stopProactiveRefresh cancels any scheduled timer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    scheduleProactiveRefresh(5000);
    stopProactiveRefresh();

    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not restore a token after logout during refresh", async () => {
    setAccessToken("old-token");
    let respond!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { respond = resolve; })));
    const pending = executeRefresh("old-token");
    setAccessToken(null);
    setStoredUser(null);
    respond({ ok: true, json: async () => ({ token: "late-token", user: { id: "old-user", role: "owner" } }) });
    expect(await pending).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("does not clear a newer session when an older refresh is rejected", async () => {
    setAccessToken("old-token");
    let respond!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { respond = resolve; })));
    const pending = executeRefresh("old-token");
    setAccessToken("new-login-token");
    respond({ ok: false, status: 401, json: async () => ({ error: "old session revoked" }) });
    expect(await pending).toBe("new-login-token");
    expect(getAccessToken()).toBe("new-login-token");
  });

  it("converts SyntaxError into clean ApiError when server returns non-JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token '<', \"<!doctype \"... is not valid JSON");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/test-path")).rejects.toThrow(
      "Server returned an invalid response (expected JSON, received HTML or malformed body). Ensure pg-go is running with the latest routes."
    );
  });

  it("apiFetch retried 401 does not clear session or dispatch pg:unauthorized if token refresh succeeded", async () => {
    setAccessToken("valid-token");
    setStoredUser({ id: "u1", role: "tenant", phone: "+919000000000" });
    const unauthorizedSpy = vi.fn();
    window.addEventListener("pg:unauthorized", unauthorizedSpy);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ token: "new-valid-token", user: { id: "u1", role: "tenant", phone: "+919000000000" } }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Scoped unauthorized on this resource", code: "auth.scopedUnauthorized" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/restricted-endpoint")).rejects.toThrow();

    // pg:unauthorized should NOT have been dispatched
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    // Access token should still exist (refreshed token)
    expect(getAccessToken()).toBe("new-valid-token");
    expect(getStoredUser()).not.toBeNull();

    window.removeEventListener("pg:unauthorized", unauthorizedSpy);
  });

  it("apiFetch handles step-up 401 without clearing session or triggering refresh", async () => {
    setAccessToken("owner-token");
    setStoredUser({ id: "owner-1", role: "owner", phone: "+919000000000" });
    const unauthorizedSpy = vi.fn();
    window.addEventListener("pg:unauthorized", unauthorizedSpy);

    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url.includes("/auth/refresh")) {
        throw new Error("Refresh should not be called on step-up challenge");
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        clone: () => ({
          json: async () => ({
            error: "step-up authentication required: valid otp must be provided",
            code: "auth.stepUpRequired",
          }),
        }),
        json: async () => ({
          error: "step-up authentication required: valid otp must be provided",
          code: "auth.stepUpRequired",
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch("/owner/refunds", {
        method: "POST",
        body: JSON.stringify({ amount_paise: 5000 }),
      })
    ).rejects.toMatchObject({
      status: 401,
      code: "auth.stepUpRequired",
      message: "step-up authentication required: valid otp must be provided",
    });

    expect(unauthorizedSpy).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("owner-token");
    expect(getStoredUser()).not.toBeNull();

    window.removeEventListener("pg:unauthorized", unauthorizedSpy);
  });

  it("apiFetch replays idempotent writes after token refresh", async () => {
    setAccessToken("expired-token");
    setStoredUser({ id: "owner-1", role: "owner", phone: "+919000000000" });

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url, init) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ token: "new-token-after-refresh", user: { id: "owner-1", role: "owner" } }),
        });
      }
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          clone: () => ({ json: async () => ({ error: "Token expired", code: "auth.invalidToken" }) }),
          json: async () => ({ error: "Token expired", code: "auth.invalidToken" }),
        });
      }
      const auth = init && init.headers ? init.headers["Authorization"] : "";
      expect(auth).toBe("Bearer new-token-after-refresh");
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, refund_id: "ref-123" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch("/owner/refunds", {
      method: "POST",
      headers: { "Idempotency-Key": "idemp-key-xyz" },
      body: JSON.stringify({ amount_paise: 1000 }),
    });

    expect(result).toEqual({ success: true, refund_id: "ref-123" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBe("new-token-after-refresh");
  });

  it("normalizes Headers instance and tuple array headers without dropping custom headers", async () => {
    setAccessToken("initial-token");
    setStoredUser({ id: "user-1", role: "tenant", phone: "+919000000000" });
    let capturedHeadersInstance: any;
    let capturedTupleHeaders: any;

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (!capturedHeadersInstance) {
        capturedHeadersInstance = init?.headers;
      } else {
        capturedTupleHeaders = init?.headers;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Call 1: With a Headers instance
    const h = new Headers();
    h.set("Idempotency-Key", "headers-instance-key-1");
    h.set("X-Custom-Trace", "trace-123");
    await apiFetch("/test/headers-instance", { method: "POST", headers: h, body: "{}" });

    // Call 2: With a tuple array
    const tuples: [string, string][] = [
      ["Idempotency-Key", "tuple-key-2"],
      ["X-Custom-Tuple", "tuple-456"],
    ];
    await apiFetch("/test/tuples", { method: "POST", headers: tuples, body: "{}" });

    expect(capturedHeadersInstance["idempotency-key"]).toBe("headers-instance-key-1");
    expect(capturedHeadersInstance["x-custom-trace"]).toBe("trace-123");
    expect(capturedHeadersInstance["Authorization"]).toBe("Bearer initial-token");

    expect(capturedTupleHeaders["Idempotency-Key"]).toBe("tuple-key-2");
    expect(capturedTupleHeaders["X-Custom-Tuple"]).toBe("tuple-456");
    expect(capturedTupleHeaders["Authorization"]).toBe("Bearer initial-token");
  });
});


describe("api/client non-JSON error bodies", () => {
  beforeEach(() => {
    setAccessToken("tok");
    setStoredUser({ id: "u1", role: "tenant", phone: "+918008281429" });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
    setStoredUser(null);
  });

  it("turns an HTML 502 from the edge into a friendly ApiError, not a raw TypeError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><body>Bad gateway</body></html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        })
      )
    );
    await expect(apiFetch("/tenant/dues")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      message: expect.stringMatching(/temporarily unavailable/i),
    });
  });

  it("keeps a short plain-text error body as the message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream timeout", { status: 504 }))
    );
    await expect(apiFetch("/tenant/dues")).rejects.toMatchObject({
      name: "ApiError",
      status: 504,
      message: "upstream timeout",
    });
  });

  it("still surfaces JSON error code and message unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "nope", code: "request.invalidBody" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        })
      )
    );
    await expect(apiFetch("/tenant/dues")).rejects.toMatchObject({
      status: 400,
      code: "request.invalidBody",
      message: "nope",
    });
  });
});


