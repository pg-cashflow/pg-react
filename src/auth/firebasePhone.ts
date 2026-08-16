import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;

function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-phone-number":
      return "Invalid phone number. Use +91 format, e.g. +919876543210";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/invalid-verification-code":
      return "Invalid OTP. Please check and try again.";
    case "auth/code-expired":
      return "OTP expired. Request a new code.";
    case "auth/captcha-check-failed":
      return "Security verification failed. Refresh and try again.";
    case "auth/invalid-app-credential":
      return "Phone verification failed. Open http://127.0.0.1:5173 (not localhost) and confirm Phone Auth plus 127.0.0.1 in Firebase Authorized domains.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is not enabled for this Firebase project.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Try again later or use a Firebase test phone number.";
    case "auth/billing-not-enabled":
      return "Real SMS requires a Blaze billing plan. Use a Firebase test phone number on Spark.";
    case "auth/network-request-failed":
      return "Network error talking to Firebase. Open http://127.0.0.1:5173 (not localhost) and try again.";
    case "auth/missing-phone-number":
      return "Phone number is required.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/account-exists-with-different-credential":
    case "auth/credential-already-in-use":
      return "This phone is already linked to another account. Sign in with that method instead.";
    case "auth/provider-already-linked":
      return "This sign-in method is already linked to your account.";
    default:
      return `Authentication failed (${code}). Please try again.`;
  }
}

function logFirebaseAuthError(err: unknown): void {
  const code = (err as { code?: string })?.code;
  const message = err instanceof Error ? err.message : String(err);
  console.error("Firebase auth error", { code, message, err });
}

export function getFirebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code) return mapFirebaseAuthError(code);
  const message = err instanceof Error ? err.message : "";
  if (/already been rendered/i.test(message)) {
    return "Security check was reset. Please tap Send OTP again.";
  }
  if (message) return message;
  return "Authentication failed. Please try again.";
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
      pendingConfirmation = await linkWithPhoneNumber(user, e164Phone, verifier);
      return;
    }
    pendingConfirmation = await signInWithPhoneNumber(firebaseAuth, e164Phone, verifier);
  } catch (err) {
    logFirebaseAuthError(err);
    resetFirebasePhoneAuth();
    throw new Error(getFirebaseErrorMessage(err));
  }
}

export async function confirmFirebasePhoneOtp(otp: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new Error("No OTP request in progress. Send OTP first.");
  }
  try {
    const credential = await pendingConfirmation.confirm(otp);
    const idToken = await credential.user.getIdToken(true);
    pendingConfirmation = null;
    return idToken;
  } catch (err) {
    logFirebaseAuthError(err);
    throw new Error(getFirebaseErrorMessage(err));
  }
}

export function resetFirebasePhoneAuth(): void {
  pendingConfirmation = null;
  clearRecaptchaVerifier();
}
