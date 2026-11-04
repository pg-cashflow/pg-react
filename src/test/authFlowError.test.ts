import { describe, it, expect } from "vitest";
import { toAuthFlowError } from "@/auth/firebasePhone";
import { AuthFlowError } from "@/auth/authFlowError";
import { formatAuthFlowError } from "@/i18n";
import { teIN } from "@/i18n/messages/te-IN";
import type { MessageKey } from "@/i18n/messages/en-IN";

const t = (k: MessageKey) => teIN[k];

describe("toAuthFlowError", () => {
  it("maps known Firebase codes to message keys", () => {
    expect(toAuthFlowError({ code: "auth/invalid-verification-code" }).messageKey).toBe("auth.err.invalidCode");
    expect(toAuthFlowError({ code: "auth/quota-exceeded" }).messageKey).toBe("auth.err.unavailable");
  });
  it("never exposes unknown codes to the user", () => {
    const e = toAuthFlowError({ code: "auth/something-new" });
    expect(e.messageKey).toBe("auth.err.generic");
    expect(formatAuthFlowError(e, t)).toBe(teIN["auth.err.generic"]);
  });
  it("detects the reCAPTCHA re-render error", () => {
    expect(toAuthFlowError(new Error("reCAPTCHA has already been rendered")).messageKey).toBe("auth.err.resetCaptcha");
  });
  it("passes AuthFlowError through unchanged", () => {
    const e = new AuthFlowError("auth.err.network", "x");
    expect(toAuthFlowError(e)).toBe(e);
  });
});

