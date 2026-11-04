import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { AuthFlowError } from "@/auth/authFlowError";
import type { MessageKey } from "@/i18n/messages/en-IN";

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;

const FIREBASE_ERROR_KEYS: Record<string, MessageKey> = {
  "auth/invalid-phone-number": "auth.err.invalidPhone",
  "auth/too-many-requests": "auth.err.tooManyRequests",
  "auth/invalid-verification-code": "auth.err.invalidCode",
  "auth/code-expired": "auth.err.codeExpired",
  "auth/captcha-check-failed": "auth.err.captchaFailed",
  "auth/invalid-app-credential": "auth.err.initFailed",
  "auth/operation-not-allowed": "auth.err.unavailable",
  "auth/quota-exceeded": "auth.err.unavailable",
  "auth/billing-not-enabled": "auth.err.unavailable",
  "auth/network-request-failed": "auth.err.network",
  "auth/missing-phone-number": "auth.err.missingPhone",
  "auth/popup-closed-by-user": "auth.err.cancelled",
  "auth/cancelled-popup-request": "auth.err.cancelled",
  "auth/account-exists-with-different-credential": "auth.err.linkedElsewhere",
  "auth/credential-already-in-use": "auth.err.linkedElsewhere",
  "auth/provider-already-linked": "auth.err.alreadyLinked",
};

const ENGLISH_FALLBACK = "Sign-in failed. Please try again.";

/** Maps any thrown value to an AuthFlowError whose key the UI translates. Never exposes raw Firebase codes. */
export function toAuthFlowError(err: unknown): AuthFlowError {
  if (err instanceof AuthFlowError) return err;
  const code = (err as { code?: string })?.code;
  if (code && FIREBASE_ERROR_KEYS[code]) {
    return new AuthFlowError(FIREBASE_ERROR_KEYS[code], code);
  }
  const message = err instanceof Error ? err.message : "";
  if (/already been rendered/i.test(message)) {
    return new AuthFlowError("auth.err.resetCaptcha", "recaptcha already rendered");
  }
  return new AuthFlowError("auth.err.generic", code ?? ENGLISH_FALLBACK);
}

// Log the error code only. Full error objects can carry the phone number (PII).
function logFirebaseAuthError(err: unknown): void {
  const code = (err as { code?: string })?.code ?? "unknown";
  if (import.meta.env.DEV) {
    console.error("Firebase auth error", { code, message: err instanceof Error ? err.message : String(err) });
  } else {
    console.error("Firebase auth error", { code });
  }
}

function replaceRecaptchaContainer(): HTMLElement {
  const existing = document.getElementById(RECAPTCHA_CONTAINER_ID);
  const next = document.createElement("div");
  next.id = RECAPTCHA_CONTAINER_ID;
  if (existing) {
    existing.replaceWith(next);
  } else {
    document.body.appendChild(next);
  }
  return next;
}

function clearRecaptchaVerifier(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Widget may already be gone after HMR, expiry, or a previous send.
    }
    recaptchaVerifier = null;
  }
  replaceRecaptchaContainer();
}

async function createRecaptchaVerifier(): Promise<RecaptchaVerifier> {
  clearRecaptchaVerifier();
  const verifier = new RecaptchaVerifier(firebaseAuth, RECAPTCHA_CONTAINER_ID, {
    size: "invisible",
    "expired-callback": () => {
      clearRecaptchaVerifier();
    },
  });
  recaptchaVerifier = verifier;
  await verifier.render();
  return verifier;
}

export async function sendFirebasePhoneOtp(e164Phone: string): Promise<void> {
  try {
    const verifier = await createRecaptchaVerifier();
    const user = firebaseAuth.currentUser;
    if (user && !user.phoneNumber) {
      try {
        pendingConfirmation = await linkWithPhoneNumber(user, e164Phone, verifier);
        return;
      } catch (linkErr: unknown) {
        const code = (linkErr as { code?: string })?.code;
        if (code === "auth/credential-already-in-use" || code === "auth/account-exists-with-different-credential") {
          const fallbackVerifier = await createRecaptchaVerifier();
          pendingConfirmation = await signInWithPhoneNumber(firebaseAuth, e164Phone, fallbackVerifier);
          return;
        }
        throw linkErr;
      }
    }
    pendingConfirmation = await signInWithPhoneNumber(firebaseAuth, e164Phone, verifier);
  } catch (err) {
    logFirebaseAuthError(err);
    resetFirebasePhoneAuth();
    throw toAuthFlowError(err);
  }
}

export async function confirmFirebasePhoneOtp(otp: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new AuthFlowError("auth.err.noOtpInProgress", "No OTP request in progress. Send OTP first.");
  }
  try {
    const credential = await pendingConfirmation.confirm(otp);
    const idToken = await credential.user.getIdToken(true);
    pendingConfirmation = null;
    return idToken;
  } catch (err) {
    logFirebaseAuthError(err);
    throw toAuthFlowError(err);
  }
}

export function resetFirebasePhoneAuth(): void {
  pendingConfirmation = null;
  clearRecaptchaVerifier();
}
