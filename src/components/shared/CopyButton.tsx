import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard, cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-[10px] border border-hairline hover:bg-accent-tint",
        className
      )}
      onClick={async () => {
        const copied = await copyToClipboard(value);
        if (copied) {
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        }
      }}
    >
      {ok ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-ink-muted" />}
    </button>
  );
}
