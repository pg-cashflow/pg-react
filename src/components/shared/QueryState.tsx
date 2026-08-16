import React from "react";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const QueryState: React.FC<QueryStateProps> = ({
  isLoading,
  isError,
  error,
  isEmpty = false,
  loadingMessage = "Loading...",
  emptyMessage = "No records found.",
  onRetry,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span>{loadingMessage}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 px-6 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-slate-300 font-medium">Failed to load data</p>
        <p className="text-xs text-slate-500 max-w-sm">
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">{emptyMessage}</div>
    );
  }

  return <>{children}</>;
};
