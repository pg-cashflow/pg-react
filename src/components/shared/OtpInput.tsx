import React, { useRef, useState } from "react";
import clsx from "clsx";

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  hasError?: boolean;
  id?: string;
  className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  hasError = false,
  id,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(digitsOnly);
    if (digitsOnly.length === 6 && onComplete) {
      onComplete(digitsOnly);
    }
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const boxes = Array.from({ length: 6 }, (_, idx) => {
    const digit = value[idx] || "";
    const isCurrent = isFocused && (idx === value.length || (value.length === 6 && idx === 5));

    return (
      <div
        key={idx}
        data-testid={`otp-box-${idx}`}
        className={clsx(
          "w-11 h-12 rounded-[10px] border flex items-center justify-center font-mono text-lg font-semibold transition-all select-none relative",
          disabled && "opacity-50 cursor-not-allowed",
          hasError
            ? "border-danger ring-1 ring-danger/30 bg-surface text-ink"
            : isCurrent && !disabled
            ? "border-accent ring-2 ring-accent/30 bg-surface text-ink"
            : digit
            ? "border-accent/40 bg-surface text-ink"
            : "border-hairline bg-bg text-ink"
        )}
      >
        {digit}
        {isCurrent && !digit && !disabled && (
          <span
            data-testid="otp-caret"
            className="w-0.5 h-5 bg-accent animate-pulse"
          />
        )}
      </div>
    );
  });

  return (
    <div
      data-testid="otp-input-container"
      className={clsx(
        "relative flex items-center justify-center gap-2",
        hasError && "animate-shake",
        className
      )}
      onClick={handleContainerClick}
    >
      <input
        ref={inputRef}
        id={id}
        data-testid="otp-input-control"
        type="tel"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="absolute inset-0 w-full h-full opacity-0 cursor-default text-base"
        aria-label="Verification code"
      />
      {boxes}
    </div>
  );
};
