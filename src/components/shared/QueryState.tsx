import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  isFetching?: boolean;
  children: React.ReactNode;
}

function SkeletonList() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-[14px] pg-shimmer" />
      ))}
    </div>
  );
}

export const QueryState: React.FC<QueryStateProps> = ({
  isLoading,
  isError,
  error,
  isEmpty = false,
  loadingMessage = "Loading the ledger…",
  emptyMessage = "Nothing on this ledger yet.",
  emptyAction,
  onRetry,
  isFetching,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="sr-only">{loadingMessage}</p>
        <SkeletonList />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 px-4 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-danger" />
        <p className="t-h3 text-ink">Couldn’t load this page</p>
        <p className="t-body-sm text-ink-muted max-w-sm">
          {error?.message || "Check your connection and try again."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] border border-hairline bg-surface t-body font-semibold text-accent hover:bg-accent-tint"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="py-12 px-4 text-center space-y-3">
        <p className="t-h3 text-ink">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="relative">
      {isFetching && <div className="pg-fetching absolute top-0 left-0 right-0 rounded-full" />}
      {children}
    </div>
  );
};
