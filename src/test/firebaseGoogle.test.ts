import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const signInWithPopupMock = vi.fn();
const signInWithRedirectMock = vi.fn();
const getRedirectResultMock = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(() => ({
    setCustomParameters: vi.fn(),
  })),
  signInWithPopup: signInWithPopupMock,
  signInWithRedirect: signInWithRedirectMock,
  getRedirectResult: getRedirectResultMock,
  linkWithPopup: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  firebaseAuth: { currentUser: null },
}));

describe("firebaseGoogle mobile & webview handling (F6)", () => {
  const originalUA = navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUA,
      configurable: true,
    });
  });

  it("detects embedded webviews like WhatsApp and blocks Google sign-in with clear guidance", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 WhatsApp/2.23.20.76",
      configurable: true,
    });
    const { isEmbeddedWebView, signInWithGoogle } = await import("@/auth/firebaseGoogle");
    expect(isEmbeddedWebView()).toBe(true);
    await expect(signInWithGoogle()).rejects.toThrow(/in-app browsers/i);
    expect(signInWithPopupMock).not.toHaveBeenCalled();
    expect(signInWithRedirectMock).not.toHaveBeenCalled();
  });

  it("uses signInWithRedirect on mobile browsers", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    signInWithRedirectMock.mockResolvedValueOnce(undefined);
    const { isMobileOrStandalone, signInWithGoogle } = await import("@/auth/firebaseGoogle");
    expect(isMobileOrStandalone()).toBe(true);
    const tok = await signInWithGoogle();
    expect(tok).toBeNull();
    expect(signInWithRedirectMock).toHaveBeenCalledTimes(1);
    expect(signInWithPopupMock).not.toHaveBeenCalled();
  });

  it("uses signInWithPopup on desktop browsers", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
      configurable: true,
    });
    signInWithPopupMock.mockResolvedValueOnce({
      user: { getIdToken: vi.fn().mockResolvedValue("desktop-id-token") },
    });
    const { isEmbeddedWebView, isMobileOrStandalone, signInWithGoogle } = await import("@/auth/firebaseGoogle");
    expect(isEmbeddedWebView()).toBe(false);
    expect(isMobileOrStandalone()).toBe(false);
    const tok = await signInWithGoogle();
    expect(tok).toBe("desktop-id-token");
    expect(signInWithPopupMock).toHaveBeenCalledTimes(1);
  });
});
