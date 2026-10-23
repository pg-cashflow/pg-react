import React, { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Coins,
  CreditCard,
  Lock,
  FileSpreadsheet,
} from "lucide-react";
import { FinanceNav } from "@/components/owner/FinanceNav";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { QueryState } from "@/components/shared/QueryState";
import { useFinanceSummary } from "@/lib/useFinance";

function currentPeriodString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const FinanceOverviewView: React.FC = () => {
  const [period, setPeriod] = useState<string>(currentPeriodString);
  const summaryQuery = useFinanceSummary(period);

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const op = summaryQuery.data?.operating;
  const col = summaryQuery.data?.collections;

  const isOcfPositive = (op?.ocf_paise ?? 0) >= 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t-h1 tracking-tight text-ink">Finance & Ledger</h1>
          <p className="text-sm text-ink-muted">
            Double-entry financial health, operational cash flow, and ledger integrity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="finance-period" className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Period
          </label>
          <select
            id="finance-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-10 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FinanceNav />

      <QueryState
        isLoading={summaryQuery.isLoading}
        isError={summaryQuery.isError}
        error={summaryQuery.error}
        onRetry={() => summaryQuery.refetch()}
      >
        {op && col && (
          <div className="space-y-6">
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* OCF */}
              <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Operating Cash Flow
                  </span>
                  <div
                    className={`p-2 rounded-xl ${
                      isOcfPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    }`}
                  >
                    {isOcfPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <AmountBadge
                    amount={op.ocf_paise}
                    variant={isOcfPositive ? "success" : "danger"}
                    className="t-amount-lg"
                  />
                </div>
                <p className="text-xs text-ink-muted">
                  Revenue ({<AmountBadge amount={op.operating_revenue_paise} className="text-xs font-semibold" />}) − Opex (
                  {<AmountBadge amount={op.opex_paise} className="text-xs font-semibold" />})
                </p>
              </div>

              {/* Collections Rent */}
              <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Rent Collected
                  </span>
                  <div className="p-2 rounded-xl bg-accent-tint text-accent">
                    <Coins size={18} />
                  </div>
                </div>
                <AmountBadge amount={col.rent_collected_paise} className="t-amount-lg text-ink" />
                <p className="text-xs text-ink-muted">
                  Outstanding rent:{" "}
                  <AmountBadge
                    amount={col.outstanding_paise}
                    variant={col.outstanding_paise > 0 ? "warning" : "default"}
                    className="text-xs font-semibold"
                  />
                </p>
              </div>

              {/* Operating Expenses */}
              <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Operating Expenses
                  </span>
                  <div className="p-2 rounded-xl bg-warning/10 text-warning">
                    <CreditCard size={18} />
                  </div>
                </div>
                <AmountBadge amount={op.opex_paise} className="t-amount-lg text-ink" />
                <p className="text-xs text-ink-muted">
                  Includes TDR: <AmountBadge amount={op.tdr_expense_paise} className="text-xs font-semibold" />
                  {op.tdr_is_estimated && " (est.)"}
                </p>
              </div>
            </div>

            {/* Secondary Controls & Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Balances & Advances */}
              <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Ledger Working Capital
                </h2>
                <div className="divide-y divide-hairline">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Manager Advances Outstanding</span>
                    <AmountBadge
                      amount={op.manager_advance_outstanding_paise}
                      variant={op.manager_advance_outstanding_paise > 0 ? "warning" : "default"}
                      className="font-semibold"
                    />
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Deposits Held (Liability)</span>
                    <AmountBadge amount={col.deposits_held_paise} className="font-semibold" />
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Deposits Refunded (Period)</span>
                    <AmountBadge amount={col.deposits_refunded_paise} className="font-semibold" />
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Tenant Credits Held</span>
                    <AmountBadge amount={col.credits_held_paise} className="font-semibold" />
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Gamification Loyalty Issued</span>
                    <AmountBadge amount={op.loyalty_issued_paise} className="font-semibold" />
                  </div>
                </div>
              </div>

              {/* Collections by Channel */}
              <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Collections by Channel
                </h2>
                {Object.keys(col.by_channel).length === 0 ? (
                  <p className="text-sm text-ink-muted py-6 text-center">
                    No channel collections recorded for {period}.
                  </p>
                ) : (
                  <div className="divide-y divide-hairline">
                    {Object.entries(col.by_channel).map(([ch, amt]) => (
                      <div key={ch} className="py-2.5 flex items-center justify-between">
                        <span className="text-sm text-ink-muted capitalize">
                          {ch.replace(/_/g, " ")}
                        </span>
                        <AmountBadge amount={amt} className="font-semibold" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Link
                to="/owner/finance/statements"
                className="group bg-surface border border-hairline hover:border-accent rounded-2xl p-4 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-tint text-accent">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-accent transition-colors">
                      Statements
                    </h3>
                    <p className="text-xs text-ink-muted">P&amp;L, Balance Sheet, Cash Flow</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to="/owner/finance/reports"
                className="group bg-surface border border-hairline hover:border-accent rounded-2xl p-4 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-tint text-accent">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-accent transition-colors">
                      Integrity Reports
                    </h3>
                    <p className="text-xs text-ink-muted">T+3 Drift, Deposit Reserve</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to="/owner/finance/close"
                className="group bg-surface border border-hairline hover:border-accent rounded-2xl p-4 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-tint text-accent">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-accent transition-colors">
                      Month Close
                    </h3>
                    <p className="text-xs text-ink-muted">Tie-out and period lock</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
};

export default FinanceOverviewView;
