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


