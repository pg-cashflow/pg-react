import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { toAuthFlowError } from "@/auth/firebasePhone";

/**
 * Detects embedded in-app webviews (WhatsApp, Instagram, Facebook, Line, Android WebView)
 * where Google OAuth returns 403 disallowed_useragent.
 */
export function isEmbeddedWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /WhatsApp|Instagram|FBAN|FBAV|Line\/|Twitter|; wv\)/i.test(ua);
}

/**
 * Detects mobile browsers or installed standalone PWAs where signInWithRedirect
 * is more reliable than popup windows.
 */
export function isMobileOrStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  return Boolean(isStandalone || isMobileUA);
}

function buildGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Starts Google sign-in. Returns an ID token immediately on desktop (popup),
 * or null on mobile/PWA after initiating a full-page redirect.
 */
export async function signInWithGoogle(): Promise<string | null> {
  if (isEmbeddedWebView()) {
    throw new Error(
      "Google sign-in is blocked inside in-app browsers (like WhatsApp). Please open this link in Chrome or Safari, or sign in with Phone OTP."
    );
  }
  const provider = buildGoogleProvider();
  try {
    if (isMobileOrStandalone()) {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    }
    const credential = await signInWithPopup(firebaseAuth, provider);
    return await credential.user.getIdToken(true);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    }
    throw toAuthFlowError(err);
  }
}

/**
 * Completes a pending Google redirect sign-in on app boot if one occurred.
 */
export async function completeGoogleRedirectSignIn(): Promise<string | null> {
  try {
    const result = await getRedirectResult(firebaseAuth);
    if (!result?.user) return null;
    return await result.user.getIdToken(true);
  } catch (err) {
    throw toAuthFlowError(err);
  }
}

/**
 * Links a Google account to the currently signed-in Firebase user using linkWithPopup,
 * preserving the same Firebase UID when possible and signaling credential-already-in-use
 * so the caller can guide the user through an explicit verified merge.
 */
export async function linkGoogleToCurrentUser(): Promise<
  { status: "linked"; idToken: string } | { status: "already_in_use" }
> {
  if (isEmbeddedWebView()) {
    throw new Error(
      "Google linking is blocked inside in-app browsers. Please open this page in Chrome or Safari."
    );
  }
  const current = firebaseAuth.currentUser;
  if (!current) {
    throw new Error("Please re-authenticate with your current sign-in method first.");
  }
  const provider = buildGoogleProvider();
  try {
    const res = await linkWithPopup(current, provider);
    const idToken = await res.user.getIdToken(true);
    return { status: "linked", idToken };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/credential-already-in-use") {
      return { status: "already_in_use" };
    }
    throw toAuthFlowError(err);
  }
}
