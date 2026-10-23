import React, { useMemo, useState } from "react";
import { FileText, Scale, DollarSign, Activity } from "lucide-react";
import {
  useBalanceSheet,
  useCashFlowStatement,
  useIncomeStatement,
  useTrialBalance,
} from "@/lib/useFinance";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { FinanceNav } from "@/components/owner/FinanceNav";
import { formatDate } from "@/lib/utils";

type StatementType = "income" | "balance_sheet" | "cash_flow" | "trial_balance";

function currentPeriodString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const FinanceStatementsView: React.FC = () => {
  const [activeStatement, setActiveStatement] = useState<StatementType>("income");
  const [period, setPeriod] = useState<string>(currentPeriodString);

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const incomeQuery = useIncomeStatement(period);
  const balanceSheetQuery = useBalanceSheet(period);
  const cashFlowQuery = useCashFlowStatement(period);
  const trialBalanceQuery = useTrialBalance(period);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Financial Statements</h1>
          <p className="text-sm text-ink-muted">
            Formal double-entry accounting statements generated directly from journal entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="stmt-period" className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Period
          </label>
          <select
            id="stmt-period"
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

      {/* Statement Sub-Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveStatement("income")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
            activeStatement === "income"
              ? "bg-ink text-surface border-ink"
              : "border-hairline text-ink-muted hover:text-ink hover:bg-surface"
          }`}
        >
          <FileText size={14} /> Income Statement (P&amp;L)
        </button>

        <button
          type="button"
          onClick={() => setActiveStatement("balance_sheet")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
            activeStatement === "balance_sheet"
              ? "bg-ink text-surface border-ink"
              : "border-hairline text-ink-muted hover:text-ink hover:bg-surface"
          }`}
        >
          <Scale size={14} /> Balance Sheet
        </button>

        <button
          type="button"
          onClick={() => setActiveStatement("cash_flow")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
            activeStatement === "cash_flow"
              ? "bg-ink text-surface border-ink"
              : "border-hairline text-ink-muted hover:text-ink hover:bg-surface"
          }`}
        >
          <DollarSign size={14} /> Cash Flow (Direct)
        </button>

        <button
          type="button"
          onClick={() => setActiveStatement("trial_balance")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
            activeStatement === "trial_balance"
              ? "bg-ink text-surface border-ink"
              : "border-hairline text-ink-muted hover:text-ink hover:bg-surface"
          }`}
        >
          <Activity size={14} /> Trial Balance
        </button>
      </div>

      {/* 1. Income Statement */}
      {activeStatement === "income" && (
        <QueryState
          isLoading={incomeQuery.isLoading}
          isError={incomeQuery.isError}
          error={incomeQuery.error}
          isEmpty={(incomeQuery.data?.lines ?? []).length === 0}
          emptyMessage={`No income statement ledger entries for ${period}.`}
          onRetry={() => incomeQuery.refetch()}
        >
          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-hairline bg-surface-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Income Statement</h2>
                <p className="text-xs text-ink-muted">
                  Operating period {incomeQuery.data?.from ? formatDate(incomeQuery.data.from) : ""} to{" "}
                  {incomeQuery.data?.to ? formatDate(incomeQuery.data.to) : ""}
                </p>
              </div>
            </div>

            <div className="divide-y divide-hairline">
              {incomeQuery.data?.lines.map((line, idx) => (
                <div
                  key={`${line.section}-${line.account_code || idx}`}
                  className="p-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {line.section}
                    </span>
                    <p className="text-sm font-medium text-ink capitalize">
                      {line.account_code?.replace(/_/g, " ") || "Total"}
                    </p>
                  </div>
                  <AmountBadge amount={line.amount_paise} className="font-semibold text-base" />
                </div>
              ))}
            </div>
          </div>
        </QueryState>
      )}

      {/* 2. Balance Sheet */}
      {activeStatement === "balance_sheet" && (
        <QueryState
          isLoading={balanceSheetQuery.isLoading}
          isError={balanceSheetQuery.isError}
          error={balanceSheetQuery.error}
          isEmpty={(balanceSheetQuery.data?.lines ?? []).length === 0}
          emptyMessage={`No balance sheet entries as of ${period}.`}
          onRetry={() => balanceSheetQuery.refetch()}
        >
          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-hairline bg-surface-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Balance Sheet</h2>
                <p className="text-xs text-ink-muted">
                  As of {balanceSheetQuery.data?.as_of ? formatDate(balanceSheetQuery.data.as_of) : period}
                </p>
              </div>
            </div>

            <div className="divide-y divide-hairline">
              {balanceSheetQuery.data?.lines.map((line, idx) => (
                <div
                  key={`${line.section}-${line.account_code || idx}`}
                  className="p-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {line.section}
                    </span>
                    <p className="text-sm font-medium text-ink capitalize">
                      {line.account_code?.replace(/_/g, " ") || "Total"}
                    </p>
                  </div>
                  <AmountBadge amount={line.amount_paise} className="font-semibold text-base" />
                </div>
              ))}
            </div>
          </div>
        </QueryState>
      )}

      {/* 3. Cash Flow Statement */}
      {activeStatement === "cash_flow" && (
        <QueryState
          isLoading={cashFlowQuery.isLoading}
          isError={cashFlowQuery.isError}
          error={cashFlowQuery.error}
          isEmpty={(cashFlowQuery.data?.lines ?? []).length === 0}
          emptyMessage={`No cash flow entries for ${period}.`}
          onRetry={() => cashFlowQuery.refetch()}
        >
          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-hairline bg-surface-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Direct Cash Flow Statement</h2>
                <p className="text-xs text-ink-muted">Cash receipts and operational disbursements</p>
              </div>
            </div>

            <div className="divide-y divide-hairline">
              {cashFlowQuery.data?.lines.map((line, idx) => (
                <div
                  key={`${line.section}-${line.label || idx}`}
                  className="p-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {line.section}
                    </span>
                    <p className="text-sm font-medium text-ink">
                      {line.label || "Operating Cash"}
                    </p>
                  </div>
                  <AmountBadge amount={line.amount_paise} className="font-semibold text-base" />
                </div>
              ))}
            </div>
          </div>
        </QueryState>
      )}

      {/* 4. Trial Balance */}
      {activeStatement === "trial_balance" && (
        <QueryState
          isLoading={trialBalanceQuery.isLoading}
          isError={trialBalanceQuery.isError}
          error={trialBalanceQuery.error}
          isEmpty={(trialBalanceQuery.data?.lines ?? []).length === 0}
          emptyMessage={`No trial balance data as of ${period}.`}
          onRetry={() => trialBalanceQuery.refetch()}
        >
          <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-hairline bg-surface-muted/30">
              <h2 className="text-base font-bold text-ink">Trial Balance</h2>
              <p className="text-xs text-ink-muted">Debit and credit balances per account</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface-muted/10 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Debit</th>
                    <th className="py-3 px-4 text-right">Credit</th>
                    <th className="py-3 px-4 text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {trialBalanceQuery.data?.lines.map((row) => (
                    <tr key={row.account_code} className="hover:bg-surface-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink capitalize">
                        {row.account_code.replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-ink-muted capitalize">
                        {row.account_class}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <AmountBadge amount={row.debit_paise} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <AmountBadge amount={row.credit_paise} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <AmountBadge amount={row.balance_paise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </QueryState>
      )}
    </div>
  );
};

export default FinanceStatementsView;
