import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/context";
import { listManagerHazards, resolveManagerHazard } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate } from "@/lib/utils";

export const HazardsView: React.FC = () => {
  const { user } = useAuth();
  const setAction = useManagerAction();
  const queryClient = useQueryClient();
  const propertyId = user?.property_id || "";

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  const q = useQuery({
    queryKey: QUERY_KEYS.managerHazards(propertyId),
    queryFn: () => listManagerHazards(propertyId),
    enabled: !!propertyId,
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveManagerHazard(id, "resolved"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managerHazards(propertyId) }),
  });

  return (
    <QueryState
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error as Error | null}
      isEmpty={!q.isLoading && (q.data?.length ?? 0) === 0}
      emptyMessage="No hazard reports."
      onRetry={() => q.refetch()}
    >
      <div className="space-y-3">
        {(q.data ?? []).map((h) => (
          <div key={h.id} className="rounded-[14px] border border-hairline bg-surface p-4">
            <div className="flex justify-between gap-3">
              <div>
                <div className="t-h3 capitalize">{h.category}</div>
                <p className="t-body-sm mt-1">{h.description}</p>
                <p className="t-caption text-ink-muted mt-1">
                  {formatDate(h.created_at)} · {h.status}
                </p>
              </div>
            </div>
            {h.status === "open" || h.status === "in_progress" ? (
              <button
                type="button"
                onClick={() => resolveMut.mutate(h.id)}
                className="mt-3 h-10 px-3 rounded-[10px] bg-accent text-white t-caption font-semibold"
              >
                Mark resolved
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </QueryState>
  );
};
