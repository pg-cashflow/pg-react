import { cn, displayDueStatus } from "@/lib/utils";
import type { Due } from "@pg/types";

interface DuePaymentTimelineProps {
  due: Due;
  utrSubmitted?: boolean;
}

export function DuePaymentTimeline({ due, utrSubmitted }: DuePaymentTimelineProps) {
  const status = displayDueStatus(due);
  const paid = status === "paid";
  const verifying = utrSubmitted && !paid && status !== "waived";
  const steps = [
    { id: "due", label: "Due", on: true },
    { id: "utr", label: "UTR submitted", on: Boolean(utrSubmitted || paid) },
    { id: "verify", label: "Owner verifying", on: Boolean(verifying || paid) },
    { id: "paid", label: "Paid", on: paid },
  ];
  return (
    <ol className="flex flex-col gap-2" aria-label="Payment status">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              s.on ? "bg-accent" : "bg-hairline"
            )}
          />
          <span className={cn("t-caption", s.on ? "text-ink font-semibold" : "text-ink-faint")}>
            {i + 1}. {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
