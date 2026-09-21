import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { listManagerInspections, resolveInspectionItem } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate } from "@/lib/utils";

export const InspectionDetailView: React.FC = () => {
  const { id } = useParams({ strict: false }) as { id: string };
  const { user } = useAuth();
  const setAction = useManagerAction();
  const queryClient = useQueryClient();
  const propertyId = user?.property_id || "";

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  const q = useQuery({
    queryKey: QUERY_KEYS.managerInspections(propertyId),
    queryFn: () => listManagerInspections(propertyId),
    enabled: !!propertyId,
  });

  const resolveMut = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: "upheld" | "overturned" }) =>
      resolveInspectionItem(itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managerInspections(propertyId) }),
  });

  const ins = (q.data ?? []).find((r) => r.id === id);

  return (
    <QueryState
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error as Error | null}
      isEmpty={!q.isLoading && !ins}
      emptyMessage="Inspection not found."
      onRetry={() => q.refetch()}
    >
      {ins && (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-hairline bg-surface p-4">
            <div className="t-h2 capitalize">{ins.inspection_type}</div>
            <div className="t-body-sm text-ink-muted mt-1">{formatDate(ins.inspected_at)}</div>
            <div className={`t-h3 mt-2 ${ins.passed ? "text-success" : "text-danger"}`}>
              {ins.passed ? "Passed" : "Failed"} · {ins.score_percent}%
            </div>
            {ins.notes && <p className="t-body mt-2">{ins.notes}</p>}
          </div>
          <ul className="rounded-[14px] border border-hairline bg-surface divide-y divide-hairline">
            {(ins.items ?? []).map((item) => (
              <li key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="t-body">{item.description}</span>
                  <span className={item.passed ? "text-success" : "text-danger"}>{item.passed ? "Pass" : "Fail"}</span>
                </div>
                {item.notes && <p className="t-caption text-ink-muted">{item.notes}</p>}
                {item.resolution_status === "disputed" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => resolveMut.mutate({ itemId: item.id, status: "upheld" })}
                      className="h-10 px-3 rounded-[10px] border border-hairline t-caption font-semibold"
                    >
                      Uphold
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveMut.mutate({ itemId: item.id, status: "overturned" })}
                      className="h-10 px-3 rounded-[10px] bg-accent text-white t-caption font-semibold"
                    >
                      Overturn
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </QueryState>
  );
};
