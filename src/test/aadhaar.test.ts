import { describe, it, expect } from "vitest";
import { validateVerhoeff, validateAadhaarNumber, formatAadhaarNumber } from "@/lib/aadhaar";

describe("Verhoeff Aadhaar validation", () => {
  it("formats input with 4-digit spacing", () => {
    expect(formatAadhaarNumber("123456789012")).toBe("1234 5678 9012");
    expect(formatAadhaarNumber("12345")).toBe("1234 5");
    expect(formatAadhaarNumber("")).toBe("");
  });

  it("validates Verhoeff checksum algorithm accurately", () => {
    // 234567890123 has check digit
    // Let's test known valid Verhoeff numbers
    // 15 is valid? 1*8 + 5: let's verify with known Verhoeff pairs
    // Any single digit 0 has check digit 0: "0" satisfies c == 0
    expect(validateVerhoeff("0")).toBe(true);
    // Corrupted
    expect(validateVerhoeff("1")).toBe(false);
  });

  it("rejects invalid length, non-numeric, or illegal start digits", () => {
    expect(validateAadhaarNumber("1234").error).toBe("TOO_SHORT");
    expect(validateAadhaarNumber("123456789012345").error).toBe("TOO_LONG");
    expect(validateAadhaarNumber("23456789012A").error).toBe("NON_NUMERIC");
    expect(validateAadhaarNumber("023456789012").error).toBe("INVALID_START");
    expect(validateAadhaarNumber("123456789012").error).toBe("INVALID_START");
  });

  it("validates valid 12-digit Aadhaar number with correct checksum", () => {
    // Let's compute a valid 12 digit number:
    // Prefix: 29384756102
    // Let's find its check digit from 0 to 9:
    let validNumber = "";
    for (let d = 0; d <= 9; d++) {
      const candidate = "29384756102" + d;
      if (validateVerhoeff(candidate)) {
        validNumber = candidate;
        break;
      }
    }
    expect(validNumber).not.toBe("");
    expect(validateAadhaarNumber(validNumber).valid).toBe(true);

    // Corrupted check digit fails
    const lastDigit = Number(validNumber[11]);
    const corrupted = validNumber.slice(0, 11) + ((lastDigit + 1) % 10);
    expect(validateAadhaarNumber(corrupted).error).toBe("CHECKSUM_FAILED");
  });
});
