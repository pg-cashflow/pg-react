import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccessToken,
  setAccessToken,
  onAccessTokenChange,
  handleSyncMessage,
  getAuthSyncChannelForTest,
} from "./tokenStore";

describe("tokenStore", () => {
  beforeEach(() => {
    setAccessToken(null, false);
    localStorage.clear();
  });

  it("holds access token in memory only and does not write to localStorage", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("test-token-123", false);
    expect(getAccessToken()).toBe("test-token-123");
    expect(localStorage.getItem("pg_jwt")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("notifies listeners when access token changes", () => {
    const listener = vi.fn();
    const unsubscribe = onAccessTokenChange(listener);

    setAccessToken("jwt-abc", false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("jwt-abc");

    setAccessToken(null, false);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(null);

    unsubscribe();
    setAccessToken("jwt-def", false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("handles malformed BroadcastChannel messages gracefully without crashing or altering state", () => {
    setAccessToken("jwt-initial", false);

    // Test malformed events directly against the message handler
    handleSyncMessage(null as any);
    handleSyncMessage(undefined as any);
    handleSyncMessage({} as any);
    handleSyncMessage({ data: null });
    handleSyncMessage({ data: undefined });
    handleSyncMessage({ data: "raw-string" });
    handleSyncMessage({ data: 12345 });
    handleSyncMessage({ data: {} });
    handleSyncMessage({ data: { type: null } });
    handleSyncMessage({ data: { type: 999 } });
    handleSyncMessage({ data: { type: "UNKNOWN_ARBITRARY_TYPE" } });

    expect(getAccessToken()).toBe("jwt-initial");
  });

  it("clears access token on SESSION_ENDED broadcast message and dispatches pg:session_ended", () => {
    setAccessToken("jwt-active", false);
    expect(getAccessToken()).toBe("jwt-active");

    const onSessionEnded = vi.fn();
    window.addEventListener("pg:session_ended", onSessionEnded);

    handleSyncMessage({ data: { type: "SESSION_ENDED" } });

    expect(getAccessToken()).toBeNull();
    expect(onSessionEnded).toHaveBeenCalledTimes(1);

    window.removeEventListener("pg:session_ended", onSessionEnded);
  });

  it("dispatches pg:session_changed event on SESSION_ACTIVE and REFRESH_REQUIRED broadcast messages", () => {
    const onSessionChanged = vi.fn();
    window.addEventListener("pg:session_changed", onSessionChanged);

    handleSyncMessage({ data: { type: "SESSION_ACTIVE" } });
    expect(onSessionChanged).toHaveBeenCalledTimes(1);

    handleSyncMessage({ data: { type: "REFRESH_REQUIRED" } });
    expect(onSessionChanged).toHaveBeenCalledTimes(2);

    window.removeEventListener("pg:session_changed", onSessionChanged);
  });

  it("broadcasts session state when broadcast=true and suppresses when broadcast=false", () => {
    const channel = getAuthSyncChannelForTest();
    if (!channel) return;

    const postSpy = vi.spyOn(channel, "postMessage").mockImplementation(() => {});

    // Silent update: broadcast = false
    setAccessToken("silent-token", false);
    expect(postSpy).not.toHaveBeenCalled();

    // Active update: broadcast = true
    setAccessToken("broadcast-token", true);
    expect(postSpy).toHaveBeenCalledWith({ type: "SESSION_ACTIVE" });

    // Logout update: broadcast = true
    setAccessToken(null, true);
    expect(postSpy).toHaveBeenCalledWith({ type: "SESSION_ENDED" });

    postSpy.mockRestore();
  });
});
