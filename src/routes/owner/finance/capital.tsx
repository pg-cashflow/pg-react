import React, { useState } from "react";
import { Plus, X, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useCapitalEntries, useCreateCapitalEntry } from "@/lib/useFinance";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { FinanceNav } from "@/components/owner/FinanceNav";
import { formatDate, rupeesToPaise } from "@/lib/utils";
import type { CapitalKind, CapitalTransaction } from "@pg/types";

const KIND_LABEL: Record<CapitalKind, string> = {
  initial: "Initial Equity",
  additional: "Capital Injection",
  withdrawal: "Capital Withdrawal",
};

export const FinanceCapitalView: React.FC = () => {
  const [showAdd, setShowAdd] = useState(false);
  const capitalQuery = useCapitalEntries();
  const createMutation = useCreateCapitalEntry();

  const entries: CapitalTransaction[] = capitalQuery.data ?? [];

  const totalInjectedPaise = entries
    .filter((e) => e.kind === "initial" || e.kind === "additional")
    .reduce((acc, e) => acc + e.amount_paise, 0);

  const totalWithdrawnPaise = entries
    .filter((e) => e.kind === "withdrawal")
    .reduce((acc, e) => acc + e.amount_paise, 0);

  const netDeployedPaise = totalInjectedPaise - totalWithdrawnPaise;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Owner Capital</h1>
          <p className="text-sm text-ink-muted">
            Track equity contributions, property renovations, and capital drawings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Record Capital
        </button>
      </div>

      <FinanceNav />

      {/* Aggregate Equity Position */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Total Capital Injected
          </span>
          <div>
            <AmountBadge amount={totalInjectedPaise} className="text-2xl font-bold text-ink" />
          </div>
          <p className="text-xs text-ink-muted">Initial equity + subsequent injections</p>
        </div>

        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Total Capital Withdrawn
          </span>
          <div>
            <AmountBadge amount={totalWithdrawnPaise} className="text-2xl font-bold text-ink" />
          </div>
          <p className="text-xs text-ink-muted">Owner distributions and drawings</p>
        </div>

        <div className="bg-surface border border-hairline rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Net Capital Deployed
          </span>
          <div>
            <AmountBadge
              amount={netDeployedPaise}
              variant={netDeployedPaise >= 0 ? "success" : "danger"}
              className="text-2xl font-bold"
            />
          </div>
          <p className="text-xs text-ink-muted">Net equity currently committed</p>
        </div>
      </div>

      <QueryState
        isLoading={capitalQuery.isLoading}
        isError={capitalQuery.isError}
        error={capitalQuery.error}
        isEmpty={entries.length === 0}
        emptyMessage="No capital entries recorded yet. Click 'Record Capital' to record your initial injection."
        onRetry={() => capitalQuery.refetch()}
      >
        <div className="space-y-3">
          {entries.map((tx) => {
            const isWithdrawal = tx.kind === "withdrawal";
            return (
              <div
                key={tx.id}
                className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isWithdrawal
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {isWithdrawal ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-ink truncate">
                        {tx.purpose || KIND_LABEL[tx.kind]}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-ink-muted border border-hairline">
                        {KIND_LABEL[tx.kind]}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Ref: {tx.reference || tx.id.slice(0, 8)} · {formatDate(tx.occurred_at || tx.created_at)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <AmountBadge
                    amount={tx.amount_paise}
                    variant={isWithdrawal ? "warning" : "success"}
                    className="text-lg font-bold"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </QueryState>

      {showAdd && (
        <CapitalModal
          onClose={() => setShowAdd(false)}
          onSubmit={async (input) => {
            await createMutation.mutateAsync(input);
            setShowAdd(false);
          }}
          isSubmitting={createMutation.isPending}
          error={createMutation.error as Error | null}
        />
      )}
    </div>
  );
};

function CapitalModal({
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  onClose: () => void;
  onSubmit: (input: { kind: CapitalKind; amount_paise: number; purpose: string }) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [kind, setKind] = useState<CapitalKind>("additional");
  const [amountRupees, setAmountRupees] = useState("");
  const [purpose, setPurpose] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <h2 className="text-base font-bold text-ink">Record Owner Capital</h2>
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
              kind,
              amount_paise: rupeesToPaise(amountRupees),
              purpose: purpose.trim(),
            });
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Transaction Type
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CapitalKind)}
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="initial">Initial Equity Contribution</option>
              <option value="additional">Additional Capital Injection</option>
              <option value="withdrawal">Capital Withdrawal (Owner Drawing)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Amount (₹)
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Purpose / Note
            </label>
            <input
              required
              placeholder="e.g. Renovation deposit, Solar panel capital, Owner drawdown"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p className="text-xs text-danger font-medium">{error.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !purpose.trim()}
            className="w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Recording…" : "Save Capital Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FinanceCapitalView;
