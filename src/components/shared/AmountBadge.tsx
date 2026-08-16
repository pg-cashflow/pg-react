import React from "react";
import { formatPaise, cn } from "@/lib/utils";
import type { Paise } from "@pg/types";

interface AmountBadgeProps {
  amount: Paise;
  className?: string;
  variant?: "default" | "success" | "danger" | "warning";
}

export const AmountBadge: React.FC<AmountBadgeProps> = ({
  amount,
  className,
  variant = "default",
}) => {
  const getStyle = () => {
    switch (variant) {
      case "success":
        return { color: "var(--amount-success)" };
      case "danger":
        return { color: "var(--amount-danger)" };
      case "warning":
        return { color: "var(--amount-warning)" };
      default:
        return { color: "inherit" };
    }
  };

  return (
    <span
      style={getStyle()}
      className={cn("tracking-tight font-mono font-semibold", className)}
    >
      {formatPaise(amount)}
    </span>
  );
};
