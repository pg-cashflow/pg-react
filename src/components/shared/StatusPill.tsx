import React from "react";
import { cn } from "@/lib/utils";
import type { DueStatus } from "@pg/types";

interface StatusPillProps {
  status: DueStatus | string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className }) => {
  const normalized = (status || "").toLowerCase();

  const getStyles = () => {
    switch (normalized) {
      case "paid":
        return {
          backgroundColor: "var(--status-paid-bg)",
          color: "var(--status-paid-text)",
          borderColor: "var(--status-paid-border)",
        };
      case "pending":
        return {
          backgroundColor: "var(--status-pending-bg)",
          color: "var(--status-pending-text)",
          borderColor: "var(--status-pending-border)",
        };
      case "partial":
        return {
          backgroundColor: "var(--status-partial-bg)",
          color: "var(--status-partial-text)",
          borderColor: "var(--status-partial-border)",
        };
      case "overdue":
        return {
          backgroundColor: "var(--status-overdue-bg)",
          color: "var(--status-overdue-text)",
          borderColor: "var(--status-overdue-border)",
        };
      case "waived":
        return {
          backgroundColor: "var(--status-waived-bg)",
          color: "var(--status-waived-text)",
          borderColor: "var(--status-waived-border)",
        };
      default:
        return {
          backgroundColor: "var(--surface-hover)",
          color: "var(--muted-text)",
          borderColor: "var(--surface-border)",
        };
    }
  };

  return (
    <span
      style={getStyles()}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider transition-colors",
        className
      )}
    >
      {status}
    </span>
  );
};
