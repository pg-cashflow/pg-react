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
  const color =
    variant === "success"
      ? "text-success"
      : variant === "danger"
        ? "text-danger"
        : variant === "warning"
          ? "text-accent"
          : "text-ink";

  return (
    <span className={cn("t-amount tracking-tight", color, className)}>
      {formatPaise(amount)}
    </span>
  );
};
