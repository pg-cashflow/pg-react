import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPaymentReport, getPaymentReports, rejectPaymentReport } from "@/api/reports";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { formatDate } from "@/lib/utils";

export const ReportsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const tenantsQuery = useQuery({ queryKey: QUERY_KEYS.tenants, queryFn: getTenants });
  const reportsQuery = useQuery({
    queryKey: QUERY_KEYS.paymentReports,
    queryFn: () => getPaymentReports("pending_review"),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentReports });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dues() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
  };

  const confirmMutation = useMutation({
    mutationFn: confirmPaymentReport,
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, n }: { id: string; n?: string }) => rejectPaymentReport(id, n),
    onSuccess: () => {
      invalidate();
      setRejectId(null);
      setNote("");
    },
  });

  const tenantMap = new Map((tenantsQuery.data ?? []).map((t) => [t.id, t.name]));
  const rows = reportsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">Confirm a UTR only after you see it in the bank. Cash is a separate action on Dues.</p>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <QueryState
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          error={reportsQuery.error as Error | null}
          isEmpty={!reportsQuery.isLoading && rows.length === 0}
          emptyMessage="No UTR reports waiting."
          onRetry={() => reportsQuery.refetch()}
        >
          <div className="divide-y divide-slate-800">
            {rows.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{tenantMap.get(r.tenant_id) || "Tenant"}</p>
                    <p className="text-xs font-mono text-slate-400">{r.upi_txn_id}</p>
                    <p className="text-xs text-slate-500">{formatDate(r.created_at)}</p>
                    {r.has_image && <p className="text-xs text-slate-500">Screenshot attached</p>}
                  </div>
                  <AmountBadge amount={r.amount} />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={confirmMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Confirm this UTR and match the due?")) confirmMutation.mutate(r.id);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setRejectId(r.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-rose-400 text-sm"
                  >
                    Reject
                  </button>
                </div>
                {rejectId === r.id && (
                  <div className="flex gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Reject note (optional)"
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100"
                    />
                    <button
                      onClick={() => rejectMutation.mutate({ id: r.id, n: note })}
                      className="px-3 py-2 rounded-xl bg-rose-500 text-slate-950 text-sm font-semibold"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </div>
  );
};
