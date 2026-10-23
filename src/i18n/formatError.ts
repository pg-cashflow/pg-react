import { ApiError } from "@/api/client";
import type { MessageKey } from "./messages/en-IN";

/**
 * Translates an ApiError code into a localized user-facing message,
 * falling back to the error's message or a localized generic error string.
 */
export function formatApiError(
  err: unknown,
  t: (key: MessageKey, values?: Record<string, any>) => string,
  fallbackKey: MessageKey = "common.error"
): string {
  if (err instanceof ApiError && err.code) {
    const errorKey = `error.${err.code}` as MessageKey;
    try {
      const msg = t(errorKey);
      if (msg && msg !== errorKey) {
        return msg;
      }
    } catch {
      // fallback below
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "string" && err.trim().length > 0) {
    return err;
  }

  return t(fallbackKey);
}
