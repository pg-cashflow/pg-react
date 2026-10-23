import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  useCapitalPaybackReport,
  useClearingDriftReport,
  useDepositReserveReport,
  useReconcilingItems,
  useVarianceBridge,
} from "@/lib/useFinance";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { FinanceNav } from "@/components/owner/FinanceNav";

function currentPeriodString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const FinanceReportsView: React.FC = () => {
  const [period, setPeriod] = useState<string>(currentPeriodString);

  const driftQuery = useClearingDriftReport();
  const reserveQuery = useDepositReserveReport();
  const paybackQuery = useCapitalPaybackReport();
  const varianceQuery = useVarianceBridge(period);
  const reconItemsQuery = useReconcilingItems();

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const drift = driftQuery.data;
  const reserve = reserveQuery.data;
  const payback = paybackQuery.data;
  const variance = varianceQuery.data?.variance_bridge;
  const reconItems = reconItemsQuery.data?.items ?? [];

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Integrity & Audit Reports</h1>
          <p className="text-sm text-ink-muted">
            Bank reserve compliance, clearing drift, capital recovery, and ledger variance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="report-period" className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Period
          </label>
          <select
            id="report-period"
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

      {/* 1. Gateway Clearing Drift (T+3 Invariant) */}
      <div className="bg-surface border border-hairline rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">T+3 Gateway Clearing Drift</h2>
              {drift && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    drift.has_drift_breach
                      ? "bg-danger/10 text-danger border border-danger/20"
                      : "bg-success/10 text-success border border-success/20"
                  }`}
                >
                  {drift.has_drift_breach ? (
                    <>
                      <AlertTriangle size={12} /> Drift Breach
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} /> Reconciled
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Audits the gateway clearing balance for unsettled transactions older than 3 business days.
            </p>
          </div>
        </div>

        <QueryState
          isLoading={driftQuery.isLoading}
          isError={driftQuery.isError}
          error={driftQuery.error}
          onRetry={() => driftQuery.refetch()}
        >
          {drift && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-ink-muted uppercase">Gross Collected</span>
                <div>
                  <AmountBadge amount={drift.total_gross_collected_paise} className="font-bold text-base" />
                </div>
              </div>

              <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-ink-muted uppercase">Gross Settled</span>
                <div>
                  <AmountBadge amount={drift.total_gross_settled_paise} className="font-bold text-base" />
                </div>
              </div>

              <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-ink-muted uppercase">Net Uncleared</span>
                <div>
                  <AmountBadge amount={drift.net_uncleared_paise} className="font-bold text-base" />
                </div>
              </div>

              <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-ink-muted uppercase">Aging &gt; 3 Days</span>
                <div>
                  <AmountBadge
                    amount={drift.aging_past_3_days_paise}
                    variant={drift.aging_past_3_days_paise > 0 ? "danger" : "default"}
                    className="font-bold text-base"
                  />
                </div>
              </div>
            </div>
          )}
        </QueryState>
      </div>

      {/* 2. Tenant Deposit Reserve Coverage */}
      <div className="bg-surface border border-hairline rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Deposit Reserve Ring-Fencing</h2>
              {reserve && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    reserve.is_deficit
                      ? "bg-danger/10 text-danger border border-danger/20"
                      : "bg-success/10 text-success border border-success/20"
                  }`}
                >
                  {reserve.is_deficit ? (
                    <>
                      <AlertTriangle size={12} /> Reserve Deficit
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={12} /> 100% Ring-Fenced
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Compares the dedicated bank balance against total tenant deposit liability obligations.
            </p>
          </div>
        </div>

        <QueryState
          isLoading={reserveQuery.isLoading}
          isError={reserveQuery.isError}
          error={reserveQuery.error}
          onRetry={() => reserveQuery.refetch()}
        >
          {reserve && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">
                    Deposit Liability
                  </span>
                  <div>
                    <AmountBadge amount={reserve.total_deposit_liability_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">
                    Bank Cash Balance
                  </span>
                  <div>
                    <AmountBadge amount={reserve.bank_cash_balance_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">
                    {reserve.is_deficit ? "Deficit" : "Surplus"}
                  </span>
                  <div>
                    <AmountBadge
                      amount={Math.abs(reserve.reserve_surplus_deficit_paise)}
                      variant={reserve.is_deficit ? "danger" : "success"}
                      className="font-bold text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-semibold text-ink-muted">
                  <span>Coverage</span>
                  <span>{(reserve.coverage_percentage_bps / 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      reserve.is_deficit ? "bg-danger" : "bg-success"
                    }`}
                    style={{
                      width: `${Math.min(100, reserve.coverage_percentage_bps / 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </QueryState>
      </div>

      {/* 3. Capital Payback Analysis */}
      <div className="bg-surface border border-hairline rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Capital Payback &amp; Break-Even</h2>
              {payback && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    payback.is_breakeven_achieved
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-accent-tint text-accent border border-accent/20"
                  }`}
                >
                  {payback.is_breakeven_achieved ? "Break-Even Achieved" : "Payback In Progress"}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Cumulative operating cash flows versus initial and additional capital invested.
            </p>
          </div>
        </div>

        <QueryState
          isLoading={paybackQuery.isLoading}
          isError={paybackQuery.isError}
          error={paybackQuery.error}
          onRetry={() => paybackQuery.refetch()}
        >
          {payback && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Invested</span>
                  <div>
                    <AmountBadge amount={payback.total_invested_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Withdrawn</span>
                  <div>
                    <AmountBadge amount={payback.total_withdrawn_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Cumulative OCF</span>
                  <div>
                    <AmountBadge amount={payback.cumulative_ocf_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Unrecovered Capital</span>
                  <div>
                    <AmountBadge
                      amount={payback.unrecovered_capital_paise}
                      variant={payback.unrecovered_capital_paise > 0 ? "warning" : "success"}
                      className="font-bold text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-semibold text-ink-muted">
                  <span>Payback Progress</span>
                  <span>{(payback.payback_percentage_bps / 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: `${Math.min(100, payback.payback_percentage_bps / 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </QueryState>
      </div>

      {/* 4. Plan vs Actual Variance Bridge */}
      <div className="bg-surface border border-hairline rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-ink">Plan vs Actual Variance Bridge ({period})</h2>
          <p className="text-xs text-ink-muted">
            Deconstructs the variance drivers between budgeted and actual Operating Cash Flow.
          </p>
        </div>

        <QueryState
          isLoading={varianceQuery.isLoading}
          isError={varianceQuery.isError}
          error={varianceQuery.error}
          isEmpty={!variance}
          emptyMessage={`No variance bridge model for ${period}.`}
          onRetry={() => varianceQuery.refetch()}
        >
          {variance && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Budgeted OCF</span>
                  <div>
                    <AmountBadge amount={variance.budgeted_ocf_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Actual OCF</span>
                  <div>
                    <AmountBadge amount={variance.actual_ocf_paise} className="font-bold text-base" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">Residual Unexplained</span>
                  <div>
                    <AmountBadge amount={variance.residual_paise} className="font-bold text-base" />
                  </div>
                </div>
              </div>

              {variance.lines.length > 0 && (
                <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
                  {variance.lines.map((l, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-sm">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-ink capitalize">{l.driver}</span>
                        <p className="text-xs text-ink-muted capitalize">Kind: {l.kind}</p>
                      </div>
                      <AmountBadge amount={l.amount_paise} className="font-semibold" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </QueryState>
      </div>

      {/* 5. Reconciling Items Review */}
      <div className="bg-surface border border-hairline rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-ink">Aged Ledger Reconciling Items</h2>
          <p className="text-xs text-ink-muted">
            Unresolved money integrity items requiring manual review or classification.
          </p>
        </div>

        <QueryState
          isLoading={reconItemsQuery.isLoading}
          isError={reconItemsQuery.isError}
          error={reconItemsQuery.error}
          isEmpty={reconItems.length === 0}
          emptyMessage="No open reconciling items found. All ledger controls balanced."
          onRetry={() => reconItemsQuery.refetch()}
        >
          <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
            {reconItems.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink">{item.item_type}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/10 text-warning border border-warning/20">
                      {item.age_bucket} ({item.age_days}d)
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Ref: {item.ref} · Escalation: {item.escalation}
                  </p>
                </div>

                {item.amount_paise !== undefined && (
                  <AmountBadge amount={item.amount_paise} className="font-bold text-base" />
                )}
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </div>
  );
};

export default FinanceReportsView;
