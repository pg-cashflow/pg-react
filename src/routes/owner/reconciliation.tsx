import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDailySettlementBalance,
  getDailySettlementHistory,
  getReconciliation,
  runDailySettlementBalance,
} from "@/api/payments";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { formatMatchedBy } from "@/lib/utils";
import type { DailySettlementBalance, DiscrepancyItem } from "@pg/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  RotateCcw,
  Scale,
  ShieldCheck,
} from "lucide-react";

function todayDateString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const ReconciliationView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"balancer" | "monthly">("balancer");

  // Balancer state
  const [balanceDate, setBalanceDate] = useState(todayDateString);

  // Monthly digest state
  const [period, setPeriod] = useState(currentPeriod);

  // Queries
  const eodQuery = useQuery({
    queryKey: QUERY_KEYS.settlementEOD(balanceDate),
    queryFn: () => getDailySettlementBalance(balanceDate),
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.settlementHistory(7),
    queryFn: () => getDailySettlementHistory(7),
    refetchInterval: 30000,
  });

  const monthlyQuery = useQuery({
    queryKey: QUERY_KEYS.reconciliation(period),
    queryFn: () => getReconciliation(period),
    refetchInterval: 30000,
  });

  // Run audit mutation
  const runMutation = useMutation({
    mutationFn: () => runDailySettlementBalance(balanceDate),
    onSuccess: (data: DailySettlementBalance) => {
      queryClient.setQueryData(QUERY_KEYS.settlementEOD(balanceDate), data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settlementHistory() });
    },
  });

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const channels = monthlyQuery.data ? Object.entries(monthlyQuery.data.by_channel) : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-hairline pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("balancer")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "balancer"
                ? "bg-ink text-surface shadow-sm"
                : "text-ink-muted hover:text-ink hover:bg-surface"
            }`}
          >
            Multi-Way Balancer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "monthly"
                ? "bg-ink text-surface shadow-sm"
                : "text-ink-muted hover:text-ink hover:bg-surface"
            }`}
          >
            Monthly Collections Digest
          </button>
        </div>

        {activeTab === "balancer" ? (
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={balanceDate}
              onChange={(e) => setBalanceDate(e.target.value)}
              className="px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink"
            />
            <button
              type="button"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="px-4 py-2 bg-accent text-surface rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {runMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Run Audit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-surface border border-hairline rounded-xl text-sm text-ink"
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* BALANCER TAB */}
      {activeTab === "balancer" && (
        <div className="space-y-6">
          <div className="bg-surface/60 border border-hairline rounded-2xl p-4 flex items-center gap-3 text-xs text-ink-muted">
            <Scale className="w-5 h-5 text-accent flex-shrink-0" />
            <span>
              Tri-party End-of-Day balancer verifies double-entry conservation between Cashfree
              gateway gross/fees, bank statement cleared credits/debits, and general ledger journal
              lines.
            </span>
          </div>

          <QueryState
            isLoading={eodQuery.isLoading}
            isError={eodQuery.isError}
            error={eodQuery.error as Error | null}
            isEmpty={!eodQuery.isLoading && !eodQuery.isError && !eodQuery.data}
            loadingMessage="Auditing multi-way settlement balances..."
            emptyMessage={`No snapshot recorded for ${balanceDate}. Click 'Run Audit' to compute balance.`}
            onRetry={() => eodQuery.refetch()}
          >
            {eodQuery.data && <EODBalanceDetails balance={eodQuery.data} />}
          </QueryState>

          {/* Recent Audit History */}
          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink-muted" />
                Recent Settlement Audit Trail (Last 7 Days)
              </h3>
            </div>
            {historyQuery.isLoading ? (
              <div className="p-6 text-xs text-ink-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading audit trail...
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <p className="p-6 text-xs text-ink-muted">No audit snapshots available yet.</p>
            ) : (
              <div className="divide-y divide-hairline">
                {historyQuery.data.map((row) => (
                  <div
                    key={row.id}
                    onClick={() => setBalanceDate(row.balance_date)}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-surface/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {row.is_balanced ? (
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-ink">{row.balance_date}</p>
                        <p className="text-xs text-ink-muted">
                          Net Settled: <AmountBadge amount={row.gateway_net_settled_paise} /> | Bank
                          Inflow: <AmountBadge amount={row.bank_credits_paise} />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {row.is_balanced ? (
                        <span className="text-xs font-medium text-success bg-surface px-2.5 py-1 rounded-full border border-hairline">
                          Balanced
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-danger bg-surface px-2.5 py-1 rounded-full border border-hairline">
                            Discrepancy:
                          </span>
                          <AmountBadge amount={row.discrepancy_paise} variant="danger" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY DIGEST TAB */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <div className="bg-surface/60 border border-hairline rounded-2xl p-4 flex items-center gap-3 text-xs text-ink-muted">
            <Scale className="w-5 h-5 text-accent flex-shrink-0" />
            <span>
              Monthly collections digest for period {monthlyQuery.data?.period ?? "current month"}.
              Outstanding reflects pending and partial rent dues.
            </span>
          </div>

          <QueryState
            isLoading={monthlyQuery.isLoading}
            isError={monthlyQuery.isError}
            error={monthlyQuery.error as Error | null}
            isEmpty={!monthlyQuery.isLoading && !monthlyQuery.isError && !monthlyQuery.data}
            loadingMessage="Loading reconciliation summary..."
            emptyMessage="No reconciliation data available"
            onRetry={() => monthlyQuery.refetch()}
          >
            {monthlyQuery.data && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    label="Rent Collected"
                    amount={monthlyQuery.data.rent_collected_paise}
                    variant="success"
                  />
                  <MetricCard
                    label="Outstanding Rent"
                    amount={monthlyQuery.data.outstanding_paise}
                    variant="warning"
                  />
                  <MetricCard label="Credits Held" amount={monthlyQuery.data.credits_held_paise} />
                  <MetricCard
                    label="Deposits Held"
                    amount={monthlyQuery.data.deposits_held_paise}
                  />
                  <MetricCard
                    label="Deposits Refunded"
                    amount={monthlyQuery.data.deposits_refunded_paise}
                  />
                </div>

                <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-hairline">
                    <h3 className="text-sm font-bold text-ink">Collected by Channel</h3>
                  </div>
                  {channels.length === 0 ? (
                    <p className="p-6 text-xs text-ink-muted">No payments recorded this period.</p>
                  ) : (
                    <div className="divide-y divide-hairline">
                      {channels.map(([channel, amount]) => (
                        <div key={channel} className="px-6 py-4 flex items-center justify-between">
                          <span className="text-sm text-ink capitalize">
                            {formatMatchedBy(channel)}
                          </span>
                          <AmountBadge amount={amount} variant="success" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </QueryState>
        </div>
      )}
    </div>
  );
};

function EODBalanceDetails({ balance }: { balance: DailySettlementBalance }) {
  return (
    <div className="space-y-6">
      {/* Primary Status Banner */}
      <div
        className={`border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
          balance.is_balanced
            ? "bg-surface border-hairline"
            : "bg-surface border-danger/40"
        }`}
      >
        <div className="flex items-center gap-3">
          {balance.is_balanced ? (
            <ShieldCheck className="w-8 h-8 text-success flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-danger flex-shrink-0" />
          )}
          <div>
            <h2 className="text-base font-bold text-ink">
              {balance.is_balanced
                ? "Tri-Party Balancer in Strict Equilibrium"
                : "Tri-Party Discrepancy Detected"}
            </h2>
            <p className="text-xs text-ink-muted">
              Snapshot for {balance.balance_date} | Generated{" "}
              {new Date(balance.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Total Variance:
          </span>
          <AmountBadge
            amount={balance.discrepancy_paise}
            variant={balance.is_balanced ? "success" : "danger"}
          />
        </div>
      </div>

      {/* 4 Architectural Balancer Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Gateway Gross Decomposition */}
        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            1. Gateway Clearing
          </p>
          <div>
            <span className="text-xs text-ink-muted">Gross Paired:</span>
            <div>
              <AmountBadge amount={balance.gateway_gross_paise} />
            </div>
          </div>
          <div className="text-xs text-ink-muted space-y-1 border-t border-hairline pt-2">
            <div className="flex justify-between">
              <span>Net Settled:</span>
              <AmountBadge amount={balance.gateway_net_settled_paise} />
            </div>
            <div className="flex justify-between">
              <span>Fees:</span>
              <AmountBadge amount={balance.gateway_fees_paise} />
            </div>
            <div className="flex justify-between">
              <span>Tax (GST):</span>
              <AmountBadge amount={balance.gateway_tax_paise} />
            </div>
            <div className="flex justify-between">
              <span>Adjustment:</span>
              <AmountBadge amount={balance.gateway_adjustment_paise} />
            </div>
          </div>
        </div>

        {/* Pillar 2: Gateway In-Transit */}
        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            2. Gateway In-Transit
          </p>
          <div>
            <span className="text-xs text-ink-muted">Clearing In-Flight:</span>
            <div>
              <AmountBadge
                amount={balance.gateway_in_transit_paise}
                variant={balance.gateway_in_transit_paise < 0 ? "danger" : "default"}
              />
            </div>
          </div>
          <p className="text-xs text-ink-muted border-t border-hairline pt-2">
            {balance.gateway_in_transit_paise < 0
              ? "Critical: Over-settled / refund deficit detected."
              : "Gateway collections awaiting standard payout settlement batch."}
          </p>
        </div>

        {/* Pillar 3: Bank Statement vs General Ledger */}
        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            3. Bank vs General Ledger
          </p>
          <div className="text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-ink-muted">Bank Statement Cr:</span>
              <AmountBadge amount={balance.bank_credits_paise} />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Ledger Bank Dr:</span>
              <AmountBadge amount={balance.ledger_bank_dr_paise} />
            </div>
            <div className="flex justify-between border-t border-hairline pt-1">
              <span className="text-ink-muted">Bank Statement Dr:</span>
              <AmountBadge amount={balance.bank_debits_paise} />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Ledger Bank Cr:</span>
              <AmountBadge amount={balance.ledger_bank_cr_paise} />
            </div>
          </div>
        </div>

        {/* Pillar 4: Unapplied Quarantine */}
        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            4. Unapplied Quarantine
          </p>
          <div>
            <span className="text-xs text-ink-muted">Tier 2 Quarantined:</span>
            <div>
              <AmountBadge amount={balance.unapplied_quarantine_paise} />
            </div>
          </div>
          <p className="text-xs text-ink-muted border-t border-hairline pt-2">
            Unidentified bank statement deposits held in suspense liability pending owner confirmation.
          </p>
        </div>
      </div>

      {/* Discrepancy Items / Explanations */}
      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Audit Variances & Discrepancies</h3>
          <span className="text-xs text-ink-muted">
            {balance.discrepancies.length} item(s) detected
          </span>
        </div>

        {balance.discrepancies.length === 0 ? (
          <div className="p-6 flex items-center gap-3 text-xs text-ink-muted">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <span>
              All tri-party balance equations satisfied. No mathematical discrepancy between gateway,
              bank, and ledger.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {balance.discrepancies.map((item: DiscrepancyItem, idx: number) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="text-sm font-semibold text-ink capitalize">
                      {item.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  {item.note && <p className="text-xs text-ink-muted">{item.note}</p>}
                </div>
                <AmountBadge
                  amount={item.amount_paise}
                  variant={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "default"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") {
    return (
      <span className="text-[10px] font-bold text-danger bg-surface border border-hairline px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-danger" />
        Critical
      </span>
    );
  }
  if (severity === "warning") {
    return (
      <span className="text-[10px] font-bold text-accent bg-surface border border-hairline px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-accent" />
        Warning
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-ink-muted bg-surface border border-hairline px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
      <Info className="w-3 h-3 text-ink-muted" />
      Info
    </span>
  );
}

function MetricCard({
  label,
  amount,
  variant = "default",
}: {
  label: string;
  amount: number;
  variant?: "default" | "success" | "warning";
}) {
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-5">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">{label}</p>
      <AmountBadge amount={amount} variant={variant} />
    </div>
  );
}
