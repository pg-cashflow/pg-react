import React, { useState } from "react";
import { Plus, X, Ban, CreditCard, AlertCircle } from "lucide-react";
import {
  useCreateExpense,
  useExpenses,
  useRecordExpensePayment,
  useVoidExpense,
} from "@/lib/useFinance";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { FinanceNav } from "@/components/owner/FinanceNav";
import { formatDate, localDateInputValue, rupeesToPaise } from "@/lib/utils";
import type { Expense, ExpenseStatus } from "@pg/types";

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled / Void",
};

const STATUS_BADGE_STYLE: Record<ExpenseStatus, string> = {
  draft: "bg-surface-muted text-ink-muted border-hairline",
  pending_approval: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-accent-tint text-accent border-accent/20",
  paid: "bg-success/10 text-success border-success/20",
  cancelled: "bg-danger/10 text-danger border-danger/20",
};

const CATEGORY_PRESETS = [
  { code: "vendor", label: "Vendor / Supplier" },
  { code: "utility", label: "Electricity / Water" },
  { code: "maintenance", label: "Repairs & Maintenance" },
  { code: "food", label: "Groceries & Kitchen" },
  { code: "cleaning", label: "Housekeeping & Cleaning" },
  { code: "salary", label: "Staff Salary" },
  { code: "other", label: "Other Operating Expense" },
];

export const FinanceExpensesView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [payFor, setPayFor] = useState<Expense | null>(null);
  const [voidFor, setVoidFor] = useState<Expense | null>(null);

  const expensesQuery = useExpenses(100);
  const createMutation = useCreateExpense();
  const payMutation = useRecordExpensePayment();
  const voidMutation = useVoidExpense();

  const allExpenses = expensesQuery.data?.expenses ?? [];
  const filtered =
    statusFilter === "all"
      ? allExpenses
      : allExpenses.filter((e) => e.status === statusFilter);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Expenses</h1>
          <p className="text-sm text-ink-muted">
            Track operational spending, vendor disbursements, and payments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Record Expense
        </button>
      </div>

      <FinanceNav />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {["all", "draft", "pending_approval", "approved", "paid", "cancelled"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
              statusFilter === s
                ? "bg-ink text-surface border-ink"
                : "border-hairline text-ink-muted hover:text-ink hover:bg-surface"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s as ExpenseStatus]}
          </button>
        ))}
      </div>

      <QueryState
        isLoading={expensesQuery.isLoading}
        isError={expensesQuery.isError}
        error={expensesQuery.error}
        isEmpty={filtered.length === 0}
        emptyMessage="No expenses found matching the selected filter."
        onRetry={() => expensesQuery.refetch()}
      >
        <div className="space-y-3">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-ink truncate">
                    {e.description || "Expense"}
                  </h3>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      STATUS_BADGE_STYLE[e.status]
                    }`}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                  {e.emergency && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-danger/10 text-danger border border-danger/20">
                      <AlertCircle size={10} /> Emergency
                    </span>
                  )}
                  {e.is_recurring && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-muted text-ink-muted">
                      Recurring
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-muted">
                  <span className="font-medium text-ink capitalize">{e.category_code}</span>
                  {e.vendor_name ? ` · ${e.vendor_name}` : ""} · Incurred on{" "}
                  {formatDate(e.occurred_at)}
                </p>

                {e.status === "paid" && e.paid_paise !== undefined && (
                  <p className="text-xs text-success font-medium">
                    Fully settled: <AmountBadge amount={e.paid_paise} className="text-xs font-semibold" />
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-hairline">
                <AmountBadge amount={e.amount_paise} className="text-lg font-bold" />

                {e.status !== "paid" && e.status !== "cancelled" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPayFor(e)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors p-1"
                    >
                      <CreditCard size={14} /> Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoidFor(e)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:text-danger/80 transition-colors p-1"
                    >
                      <Ban size={14} /> Void
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </QueryState>

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onSubmit={async (input) => {
            await createMutation.mutateAsync(input);
            setShowAdd(false);
          }}
          isSubmitting={createMutation.isPending}
          error={createMutation.error as Error | null}
        />
      )}

      {payFor && (
        <PayExpenseModal
          expense={payFor}
          onClose={() => setPayFor(null)}
          onSubmit={async (input) => {
            await payMutation.mutateAsync({ expenseId: payFor.id, input });
            setPayFor(null);
          }}
          isSubmitting={payMutation.isPending}
          error={payMutation.error as Error | null}
        />
      )}

      {voidFor && (
        <VoidExpenseModal
          expense={voidFor}
          onClose={() => setVoidFor(null)}
          onSubmit={async (reason) => {
            await voidMutation.mutateAsync({ expenseId: voidFor.id, reason });
            setVoidFor(null);
          }}
          isSubmitting={voidMutation.isPending}
          error={voidMutation.error as Error | null}
        />
      )}
    </div>
  );
};

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
        {children}
      </div>
    </div>
  );
}

function AddExpenseModal({
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  onClose: () => void;
  onSubmit: (input: {
    category_code: string;
    vendor_name?: string;
    description: string;
    amount_paise: number;
    emergency?: boolean;
    is_recurring?: boolean;
    occurred_at?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [categoryCode, setCategoryCode] = useState("vendor");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDateInputValue());
  const [emergency, setEmergency] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  return (
    <ModalShell title="Record Operating Expense" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (ev) => {
          ev.preventDefault();
          await onSubmit({
            category_code: categoryCode,
            vendor_name: vendorName.trim() || undefined,
            description: description.trim(),
            amount_paise: rupeesToPaise(amountRupees),
            emergency,
            is_recurring: isRecurring,
            occurred_at: new Date(occurredAt).toISOString(),
          });
        }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Category
          </label>
          <select
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
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
            Description
          </label>
          <input
            required
            placeholder="e.g. October Water Tanker supply"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              Date Incurred
            </label>
            <input
              required
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Vendor Name (Optional)
          </label>
          <input
            placeholder="e.g. Kaveri Water Supplies"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
            <input
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
              className="rounded border-hairline text-accent focus:ring-accent"
            />
            Emergency bypass
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-hairline text-accent focus:ring-accent"
            />
            Recurring monthly
          </label>
        </div>

        {error && <p className="text-xs text-danger font-medium">{error.message}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSubmitting ? "Recording…" : "Save Expense"}
        </button>
      </form>
    </ModalShell>
  );
}

function PayExpenseModal({
  expense,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  expense: Expense;
  onClose: () => void;
  onSubmit: (input: { amount_paise: number; method: string }) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [amountRupees, setAmountRupees] = useState(String(expense.amount_paise / 100));
  const [method, setMethod] = useState("bank_transfer");

  return (
    <ModalShell title={`Record Payment: ${expense.description}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (ev) => {
          ev.preventDefault();
          await onSubmit({
            amount_paise: rupeesToPaise(amountRupees),
            method,
          });
        }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Payment Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Amount Paid (₹)
          </label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
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
          {isSubmitting ? "Disbursing…" : "Confirm Payment"}
        </button>
      </form>
    </ModalShell>
  );
}

function VoidExpenseModal({
  expense,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  expense: Expense;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [reason, setReason] = useState("");

  return (
    <ModalShell title={`Void Expense: ${expense.description}`} onClose={onClose}>
      <p className="text-xs text-ink-muted leading-relaxed">
        Voiding cancels the expense and creates an audit entry in the ledger. This action cannot be undone.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (ev) => {
          ev.preventDefault();
          await onSubmit(reason.trim());
        }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Reason for Voiding
          </label>
          <input
            required
            placeholder="e.g. Duplicate bill, vendor cancelled order"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-danger"
          />
        </div>

        {error && <p className="text-xs text-danger font-medium">{error.message}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !reason.trim()}
          className="w-full h-11 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-danger/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSubmitting ? "Voiding…" : "Void Expense"}
        </button>
      </form>
    </ModalShell>
  );
}

export default FinanceExpensesView;
