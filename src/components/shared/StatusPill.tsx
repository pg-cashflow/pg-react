import { CheckCircle2, Clock, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DueStatus } from "@pg/types";

interface StatusPillProps {
  status: DueStatus | string;
  className?: string;
}

const MAP: Record<
  string,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  paid: {
    label: "Paid",
    className: "bg-[var(--status-paid-bg)] text-[var(--status-paid-text)] border-[var(--status-paid-border)]",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Due",
    className:
      "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] border-[var(--status-pending-border)]",
    Icon: Clock,
  },
  due: {
    label: "Due",
    className:
      "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] border-[var(--status-pending-border)]",
    Icon: Clock,
  },
  partial: {
    label: "Partial",
    className:
      "bg-[var(--status-partial-bg)] text-[var(--status-partial-text)] border-[var(--status-partial-border)]",
    Icon: Clock,
  },
  overdue: {
    label: "Overdue",
    className:
      "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)] border-[var(--status-overdue-border)]",
    Icon: AlertTriangle,
  },
  waived: {
    label: "Waived",
    className:
      "bg-[var(--status-waived-bg)] text-[var(--status-waived-text)] border-[var(--status-waived-border)]",
    Icon: Minus,
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, className }) => {
  const normalized = (status || "").toLowerCase();
  const s = MAP[normalized] || {
    label: status || "Unknown",
    className: "bg-surface text-ink-muted border-hairline",
    Icon: Clock,
  };
  const Icon = s.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 t-caption font-medium border",
        s.className,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {s.label}
    </span>
  );
};
