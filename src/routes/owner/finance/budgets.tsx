import React, { useMemo, useState } from "react";
import { Plus, X, Edit2 } from "lucide-react";
import { useBudgets, useSaveBudget } from "@/lib/useFinance";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { FinanceNav } from "@/components/owner/FinanceNav";
import { rupeesToPaise } from "@/lib/utils";
import type { Budget } from "@pg/types";

const CATEGORY_PRESETS = [
  { code: "vendor", label: "Vendor & Supplies" },
  { code: "utility", label: "Electricity & Water" },
  { code: "maintenance", label: "Repairs & Maintenance" },
  { code: "food", label: "Groceries & Kitchen" },
  { code: "cleaning", label: "Housekeeping" },
  { code: "salary", label: "Staff Salary" },
  { code: "marketing", label: "Marketing & Acquisition" },
  { code: "other", label: "Other Operational" },
];

function currentPeriodString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const FinanceBudgetsView: React.FC = () => {
  const [period, setPeriod] = useState<string>(currentPeriodString);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const budgetsQuery = useBudgets(period);
  const saveMutation = useSaveBudget();

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const budgets = budgetsQuery.data ?? [];
  const totalBudgetPaise = budgets.reduce((acc, b) => acc + b.amount_paise, 0);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Budgets</h1>
          <p className="text-sm text-ink-muted">
            Set and allocate monthly spending targets per operational category.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="budget-period" className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Period
            </label>
            <select
              id="budget-period"
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

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Budget
          </button>
        </div>
      </div>

      <FinanceNav />

      {/* Aggregate Overview Card */}
      <div className="bg-surface border border-hairline rounded-2xl p-5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Total Budget ({period})
          </span>
          <p className="text-xs text-ink-muted">
            {budgets.length} {budgets.length === 1 ? "category target" : "category targets"} configured
          </p>
        </div>
        <AmountBadge amount={totalBudgetPaise} className="text-2xl font-bold" />
      </div>

      <QueryState
        isLoading={budgetsQuery.isLoading}
        isError={budgetsQuery.isError}
        error={budgetsQuery.error}
        isEmpty={budgets.length === 0}
        emptyMessage={`No budgets defined for ${period}. Click 'Add Budget' to set a target.`}
        onRetry={() => budgetsQuery.refetch()}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <div
              key={b.id || `${b.category_code}-${b.period_month}`}
              className="bg-surface border border-hairline rounded-2xl p-5 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink capitalize truncate">
                    {b.category_code}
                  </h3>
                  <p className="text-xs text-ink-muted">Target for {b.period_month}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
                  aria-label={`Edit ${b.category_code} budget`}
                >
                  <Edit2 size={15} />
                </button>
              </div>

              <div className="pt-2 border-t border-hairline flex items-baseline justify-between">
                <span className="text-xs text-ink-muted">Allocated Target</span>
                <AmountBadge amount={b.amount_paise} className="text-lg font-bold" />
              </div>
            </div>
          ))}
        </div>
      </QueryState>

      {showAdd && (
        <BudgetModal
          title={`Set Budget Target (${period})`}
          periodMonth={period}
          onClose={() => setShowAdd(false)}
          onSubmit={async (input) => {
            await saveMutation.mutateAsync(input);
            setShowAdd(false);
          }}
          isSubmitting={saveMutation.isPending}
          error={saveMutation.error as Error | null}
        />
      )}

      {editing && (
        <BudgetModal
          title={`Edit ${editing.category_code} Budget`}
          periodMonth={editing.period_month}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await saveMutation.mutateAsync(input);
            setEditing(null);
          }}
          isSubmitting={saveMutation.isPending}
          error={saveMutation.error as Error | null}
        />
      )}
    </div>
  );
};

function BudgetModal({
  title,
  periodMonth,
  initial,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  title: string;
  periodMonth: string;
  initial?: Budget;
  onClose: () => void;
  onSubmit: (input: { category_code: string; period_month: string; amount_paise: number }) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [categoryCode, setCategoryCode] = useState(initial?.category_code ?? "vendor");
  const [amountRupees, setAmountRupees] = useState(
    initial ? String(initial.amount_paise / 100) : ""
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            await onSubmit({
              category_code: categoryCode,
              period_month: periodMonth,
              amount_paise: rupeesToPaise(amountRupees),
            });
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Category
            </label>
            <select
              disabled={!!initial}
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
            >
              {CATEGORY_PRESETS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Period Month
            </label>
            <input
              disabled
              value={periodMonth}
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface-muted text-ink-muted text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Budget Target (₹)
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p className="text-xs text-danger font-medium">{error.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Saving…" : "Save Budget"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FinanceBudgetsView;
