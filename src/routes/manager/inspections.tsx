import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { listManagerInspections } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { formatDate } from "@/lib/utils";
import { QueryState } from "@/components/shared/QueryState";

export const InspectionsListView: React.FC = () => {
  const { user } = useAuth();
  const setAction = useManagerAction();
  const propertyId = user?.property_id || "";

  useEffect(() => {
    setAction({ label: "New inspection", to: "/manager/inspections/new" });
    return () => setAction(null);
  }, [setAction]);

  const q = useQuery({
    queryKey: QUERY_KEYS.managerInspections(propertyId),
    queryFn: () => listManagerInspections(propertyId),
    enabled: !!propertyId,
  });

  return (
    <QueryState
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error as Error | null}
      isEmpty={!q.isLoading && (q.data?.length ?? 0) === 0}
      emptyMessage="No inspections yet."
      emptyAction={
        <Link to="/manager/inspections/new" className="inline-flex h-11 items-center px-4 rounded-[10px] bg-accent text-white font-semibold">
          Start a round
        </Link>
      }
      onRetry={() => q.refetch()}
    >
      <div className="rounded-[14px] border border-hairline bg-surface overflow-hidden">
        {(q.data ?? []).map((ins) => (
          <Link
            key={ins.id}
            to="/manager/inspections/$id"
            params={{ id: ins.id }}
            className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="t-body font-semibold capitalize">{ins.inspection_type}</div>
              <div className="t-caption text-ink-muted">{formatDate(ins.inspected_at)}</div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 t-caption font-medium ${
                ins.passed ? "bg-success-tint text-success" : "bg-danger-tint text-danger"
              }`}
            >
              {ins.passed ? "Pass" : "Fail"} {ins.score_percent}%
            </span>
          </Link>
        ))}
      </div>
    </QueryState>
  );
};
