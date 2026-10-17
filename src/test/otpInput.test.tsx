import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { OtpInput } from "@/components/shared/OtpInput";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

describe("OtpInput component", () => {
  it("renders 6 boxes and a transparent native input for SMS autofill", () => {
    act(() => {
      root?.render(<OtpInput value="" onChange={() => {}} />);
    });

    const input = container?.querySelector("input[data-testid='otp-input-control']") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute("type")).toBe("tel");
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("maxlength")).toBe("6");

    for (let i = 0; i < 6; i++) {
      const box = container?.querySelector(`[data-testid='otp-box-${i}']`);
      expect(box).toBeTruthy();
      expect(box?.textContent).toBe("");
    }
  });

  it("distributes digits across the 6 visual boxes", () => {
    act(() => {
      root?.render(<OtpInput value="123" onChange={() => {}} />);
    });

    expect(container?.querySelector("[data-testid='otp-box-0']")?.textContent).toBe("1");
    expect(container?.querySelector("[data-testid='otp-box-1']")?.textContent).toBe("2");
    expect(container?.querySelector("[data-testid='otp-box-2']")?.textContent).toBe("3");
    expect(container?.querySelector("[data-testid='otp-box-3']")?.textContent).toBe("");
  });

  function setInputValue(input: HTMLInputElement, val: string) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    nativeSetter?.call(input, val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  it("handles native autofill / paste and strips non-digits", () => {
    const handleChange = vi.fn();
    const handleComplete = vi.fn();

    act(() => {
      root?.render(
        <OtpInput value="" onChange={handleChange} onComplete={handleComplete} />
      );
    });

    const input = container?.querySelector("input[data-testid='otp-input-control']") as HTMLInputElement;

    // Simulate autofill or paste event: "98-76 54"
    act(() => {
      setInputValue(input, "98-76 54");
    });

    expect(handleChange).toHaveBeenCalledWith("987654");
    expect(handleComplete).toHaveBeenCalledWith("987654");
  });

  it("triggers onComplete exactly when the 6th digit is entered", () => {
    const handleChange = vi.fn();
    const handleComplete = vi.fn();

    act(() => {
      root?.render(
        <OtpInput value="12345" onChange={handleChange} onComplete={handleComplete} />
      );
    });

    const input = container?.querySelector("input[data-testid='otp-input-control']") as HTMLInputElement;

    // Type 6th digit: "123456"
    act(() => {
      setInputValue(input, "123456");
    });

    expect(handleChange).toHaveBeenCalledWith("123456");
    expect(handleComplete).toHaveBeenCalledWith("123456");

    // Fewer than 6 digits should not call onComplete
    handleComplete.mockClear();
    act(() => {
      setInputValue(input, "1234");
    });
    expect(handleComplete).not.toHaveBeenCalled();
  });

  it("reflects backspace navigation when digits are deleted", () => {
    const handleChange = vi.fn();

    act(() => {
      root?.render(<OtpInput value="1234" onChange={handleChange} />);
    });

    const input = container?.querySelector("input[data-testid='otp-input-control']") as HTMLInputElement;

    act(() => {
      setInputValue(input, "123");
    });

    expect(handleChange).toHaveBeenCalledWith("123");
  });

  it("disables the native input and marks boxes when disabled prop is set", () => {
    act(() => {
      root?.render(<OtpInput value="12" disabled={true} onChange={() => {}} />);
    });

    const input = container?.querySelector("input[data-testid='otp-input-control']") as HTMLInputElement;
    expect(input.disabled).toBe(true);

    const box = container?.querySelector("[data-testid='otp-box-0']");
    expect(box?.className).toContain("opacity-50");
  });

  it("applies animate-shake and error border styling when hasError is true", () => {
    act(() => {
      root?.render(<OtpInput value="123456" hasError={true} onChange={() => {}} />);
    });

    const containerEl = container?.querySelector("[data-testid='otp-input-container']");
    expect(containerEl?.className).toContain("animate-shake");

    const box = container?.querySelector("[data-testid='otp-box-0']");
    expect(box?.className).toContain("border-danger");
  });
});
