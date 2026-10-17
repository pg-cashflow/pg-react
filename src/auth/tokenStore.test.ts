import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken, onAccessTokenChange } from "./tokenStore";

describe("tokenStore", () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
  });

  it("holds access token in memory only and does not write to localStorage", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("test-token-123");
    expect(getAccessToken()).toBe("test-token-123");
    expect(localStorage.getItem("pg_jwt")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("notifies listeners when access token changes", () => {
    const listener = vi.fn();
    const unsubscribe = onAccessTokenChange(listener);

    setAccessToken("jwt-abc");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("jwt-abc");

    setAccessToken(null);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(null);

    unsubscribe();
    setAccessToken("jwt-def");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
