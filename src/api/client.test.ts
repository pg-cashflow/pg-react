import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scheduleProactiveRefresh,
  stopProactiveRefresh,
  executeRefresh,
  checkBiometricGate,
} from "./client";
import { getAccessToken, setAccessToken } from "@/auth/tokenStore";
import { getStoredUser, setStoredUser } from "@/auth/storage";

describe("api/client proactive refresh & biometric gate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopProactiveRefresh();
    setAccessToken(null);
    setStoredUser(null);
    delete (window as unknown as { pgBiometricGate?: unknown }).pgBiometricGate;
  });

  afterEach(() => {
    stopProactiveRefresh();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("checkBiometricGate returns true by default when no gate is configured", async () => {
    const ok = await checkBiometricGate();
    expect(ok).toBe(true);
  });

  it("checkBiometricGate delegates to window.pgBiometricGate", async () => {
    (window as unknown as { pgBiometricGate: () => Promise<boolean> }).pgBiometricGate = vi
      .fn()
      .mockResolvedValue(true);
    expect(await checkBiometricGate()).toBe(true);

    (window as unknown as { pgBiometricGate: () => Promise<boolean> }).pgBiometricGate = vi
      .fn()
      .mockResolvedValue(false);
    expect(await checkBiometricGate()).toBe(false);

    (window as unknown as { pgBiometricGate: () => Promise<boolean> }).pgBiometricGate = vi
      .fn()
      .mockRejectedValue(new Error("Biometric hardware failure"));
    expect(await checkBiometricGate()).toBe(false);
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

  it("biometric rejection blocks proactive refresh and dispatches pg:unauthorized", async () => {
    setAccessToken("token-to-protect");
    setStoredUser({ id: "u1", role: "owner", phone: "+918008281429" });

    (window as unknown as { pgBiometricGate: () => Promise<boolean> }).pgBiometricGate = vi
      .fn()
      .mockResolvedValue(false);

    const unauthorizedSpy = vi.fn();
    window.addEventListener("pg:unauthorized", unauthorizedSpy);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    scheduleProactiveRefresh(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
    const eventDetail = unauthorizedSpy.mock.calls[0][0].detail;
    expect(eventDetail).toEqual({ reason: "biometric_failed" });

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
});
