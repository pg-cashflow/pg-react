import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getTenants } from "@/api/tenants";
import { getDues } from "@/api/dues";
import { getPayments, getReconciliation } from "@/api/payments";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QueryState } from "@/components/shared/QueryState";
import {
  formatDate,
  formatMatchedBy,
  countOverdueDues,
  sumOverdueAmount,
  displayDueStatus,
} from "@/lib/utils";
import {
  Users,
  Receipt,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ onNavigate }) => {
  const tenantsQuery = useQuery({ queryKey: QUERY_KEYS.tenants, queryFn: getTenants });
  const duesQuery = useQuery({
    queryKey: QUERY_KEYS.dues(),
    queryFn: () => getDues(),
    refetchInterval: 30000,
  });
  const paymentsQuery = useQuery({
    queryKey: QUERY_KEYS.payments(),
    queryFn: () => getPayments(),
    refetchInterval: 30000,
  });
  const reconciliationQuery = useQuery({
    queryKey: QUERY_KEYS.reconciliation(),
    queryFn: () => getReconciliation(),
    refetchInterval: 30000,
  });

  const isLoading =
    tenantsQuery.isLoading ||
    duesQuery.isLoading ||
    paymentsQuery.isLoading ||
    reconciliationQuery.isLoading;
  const isError =
    tenantsQuery.isError ||
    duesQuery.isError ||
    paymentsQuery.isError ||
    reconciliationQuery.isError;
  const error =
    tenantsQuery.error ||
    duesQuery.error ||
    paymentsQuery.error ||
    reconciliationQuery.error;

  const tenants = tenantsQuery.data ?? [];
  const dues = duesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const summary = reconciliationQuery.data;

  const activeTenants = tenants.filter((t) => t.status === "active");
  const overdueCount = countOverdueDues(dues);
  const totalOverduePaise = sumOverdueAmount(dues);

  const recentDues = [...dues]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime())
    .slice(0, 5);

  const tenantMap = React.useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
      onRetry={() => {
        tenantsQuery.refetch();
        duesQuery.refetch();
        paymentsQuery.refetch();
        reconciliationQuery.refetch();
      }}
      loadingMessage="Loading dashboard..."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Rent Collected</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <AmountBadge amount={summary?.rent_collected_paise ?? 0} variant="success" />
            <p className="text-xs text-slate-500 mt-1">Period {summary?.period ?? "—"}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Outstanding</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <AmountBadge amount={summary?.outstanding_paise ?? 0} variant="warning" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Overdue</span>
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <AmountBadge amount={totalOverduePaise} variant="danger" />
            <p className="text-xs text-slate-500 mt-1">{overdueCount} overdue dues</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Active Tenants</span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{activeTenants.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Latest Dues
              </h3>
              <button onClick={() => onNavigate("dues")} className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentDues.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No dues yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentDues.map((due) => (
                  <div key={due.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{tenantMap.get(due.tenant_id) || "Tenant"}</p>
                      <p className="text-xs text-slate-500">{due.due_code} · Due {formatDate(due.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AmountBadge amount={due.amount} />
                      <StatusPill status={displayDueStatus(due)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Recent Payments
              </h3>
              <button onClick={() => onNavigate("payments")} className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No payments yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentPayments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{tenantMap.get(p.tenant_id) || "Tenant"}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(p.matched_at)} · {formatMatchedBy(p.matched_by)}
                        {p.upi_txn_id ? ` (${p.upi_txn_id})` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AmountBadge amount={p.amount} variant="success" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </QueryState>
  );
};
