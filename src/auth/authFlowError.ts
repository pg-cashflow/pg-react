import type { MessageKey } from "@/i18n/messages/en-IN";

/**
 * Error raised by the Firebase sign-in helpers. Carries a message key so the UI
 * can translate it; `message` stays English for logs and tests. Kept free of any
 * firebase import so i18n code can use it without pulling the SDK into its chunk.
 */
export class AuthFlowError extends Error {
  readonly messageKey: MessageKey;
  constructor(messageKey: MessageKey, message: string) {
    super(message);
    this.name = "AuthFlowError";
    this.messageKey = messageKey;
  }
}

