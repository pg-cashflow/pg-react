/**
 * Aadhaar number validation and formatting utilities.
 * Implements the Verhoeff checksum algorithm matching pg-go/internal/aadhaar/verhoeff.go.
 */

const verhoeffD: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffP: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates whether a numeric string satisfies the Verhoeff checksum algorithm.
 */
export function validateVerhoeff(num: string): boolean {
  if (!num) return false;
  let c = 0;
  for (let i = 0; i < num.length; i++) {
    const ch = num[num.length - 1 - i];
    if (ch < "0" || ch > "9") {
      return false;
    }
    const digit = Number(ch);
    c = verhoeffD[c][verhoeffP[i % 8][digit]];
  }
  return c === 0;
}

export interface AadhaarValidationResult {
  valid: boolean;
  cleanNumber: string;
  error?: "TOO_SHORT" | "TOO_LONG" | "NON_NUMERIC" | "INVALID_START" | "CHECKSUM_FAILED";
}

/**
 * Validates a 12-digit Aadhaar number:
 * 1. Must be exactly 12 numeric digits.
 * 2. Cannot begin with '0' or '1'.
 * 3. Must satisfy the Verhoeff checksum algorithm.
 */
export function validateAadhaarNumber(val: string): AadhaarValidationResult {
  const clean = val.replace(/\s+/g, "");
  if (!clean) {
    return { valid: false, cleanNumber: clean, error: "TOO_SHORT" };
  }
  if (!/^\d+$/.test(clean)) {
    return { valid: false, cleanNumber: clean, error: "NON_NUMERIC" };
  }
  if (clean.length < 12) {
    return { valid: false, cleanNumber: clean, error: "TOO_SHORT" };
  }
  if (clean.length > 12) {
    return { valid: false, cleanNumber: clean, error: "TOO_LONG" };
  }
  if (clean[0] === "0" || clean[0] === "1") {
    return { valid: false, cleanNumber: clean, error: "INVALID_START" };
  }
  if (!validateVerhoeff(clean)) {
    return { valid: false, cleanNumber: clean, error: "CHECKSUM_FAILED" };
  }
  return { valid: true, cleanNumber: clean };
}

/**
 * Formats a numeric input string as "XXXX XXXX XXXX".
 */
export function formatAadhaarNumber(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}
