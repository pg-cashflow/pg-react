import React, { useMemo, useState } from "react";
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
} from "lucide-react";
import {
  useCloseTieOut,
  useReopenTieOut,
  useTieOutState,
} from "@/lib/useFinance";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { FinanceNav } from "@/components/owner/FinanceNav";
import { formatDate } from "@/lib/utils";

function currentPeriodString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const FinanceCloseView: React.FC = () => {
  const [period, setPeriod] = useState<string>(currentPeriodString);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  const tieOutQuery = useTieOutState(period);
  const closeMutation = useCloseTieOut();
  const reopenMutation = useReopenTieOut();

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const tieOut = tieOutQuery.data?.tie_out;
  const isClosed = tieOut?.status === "closed";
  const isBalanced = (tieOut?.difference_paise ?? 0) === 0;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Month Close &amp; Tie-Out</h1>
          <p className="text-sm text-ink-muted">
            Formal accounting period lock, collection tie-out, and audited reopening.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="close-period" className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Period
          </label>
          <select
            id="close-period"
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
        isLoading={tieOutQuery.isLoading}
        isError={tieOutQuery.isError}
        error={tieOutQuery.error}
        onRetry={() => tieOutQuery.refetch()}
      >
        {tieOut && (
          <div className="space-y-6">
            {/* Status Hero Card */}
            <div className="bg-surface border border-hairline rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isClosed ? "bg-accent-tint text-accent" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {isClosed ? <Lock size={20} /> : <Unlock size={20} />}
                    </div>
                    <h2 className="text-lg font-bold text-ink">
                      Period Status: {isClosed ? "Closed & Locked" : "Open for Entries"}
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {isClosed
                      ? `Locked on ${tieOut.closed_at ? formatDate(tieOut.closed_at) : "period close"}. Changes require audited reopening.`
                      : "Entries can still be created, edited, and voided for this month."}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {!isClosed ? (
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
                    >
                      <Lock size={15} /> Close Period {period}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowReopenModal(true)}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-sm font-semibold transition-colors"
                    >
                      <Unlock size={15} /> Reopen Period
                    </button>
                  )}
                </div>
              </div>

              {/* Three Way Balancer Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-hairline">
                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">
                    Reconciliation Collections Total
                  </span>
                  <div>
                    <AmountBadge amount={tieOut.recon_total_paise} className="text-xl font-bold" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">
                    Journal Ledger Total
                  </span>
                  <div>
                    <AmountBadge amount={tieOut.ledger_total_paise} className="text-xl font-bold" />
                  </div>
                </div>

                <div className="bg-surface-muted/30 border border-hairline rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink-muted uppercase">Difference</span>
                    {isBalanced ? (
                      <CheckCircle2 size={14} className="text-success" />
                    ) : (
                      <AlertTriangle size={14} className="text-danger" />
                    )}
                  </div>
                  <div>
                    <AmountBadge
                      amount={tieOut.difference_paise}
                      variant={isBalanced ? "success" : "danger"}
                      className="text-xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tie-Out Items & Adjustments Checklist */}
            <div className="bg-surface border border-hairline rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink">Tie-Out Reconciliation Items</h3>
                  <p className="text-xs text-ink-muted">
                    Itemized timing differences, adjustments, and investigated variances.
                  </p>
                </div>
                <span className="text-xs font-semibold text-ink-muted">
                  {tieOut.items.length} {tieOut.items.length === 1 ? "line item" : "line items"}
                </span>
              </div>

              {tieOut.items.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-muted">
                  No discrepancy or timing items. Collections and ledger balance exactly.
                </div>
              ) : (
                <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden">
                  {tieOut.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink capitalize">
                            {item.category.replace(/_/g, " ")}
                          </span>
                          {item.unresolved_months ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-danger/10 text-danger border border-danger/20">
                              Unresolved for {item.unresolved_months}m
                            </span>
                          ) : null}
                        </div>
                        {item.note && <p className="text-xs text-ink-muted">{item.note}</p>}
                        {item.source_id && (
                          <p className="text-[11px] text-ink-muted">Source: {item.source_id}</p>
                        )}
                      </div>

                      <AmountBadge amount={item.amount_paise} className="font-semibold text-base" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </QueryState>

      {/* Close Period Confirmation Modal */}
      {showCloseModal && (
        <CloseModal
          period={period}
          onClose={() => setShowCloseModal(false)}
          onConfirm={async () => {
            await closeMutation.mutateAsync(period);
            setShowCloseModal(false);
          }}
          isSubmitting={closeMutation.isPending}
          error={closeMutation.error as Error | null}
        />
      )}

      {/* Reopen Period Step-Up Modal */}
      {showReopenModal && (
        <ReopenModal
          period={period}
          onClose={() => setShowReopenModal(false)}
          onConfirm={async (reason, otp) => {
            await reopenMutation.mutateAsync({
              period,
              reason,
              otp: otp || undefined,
            });
            setShowReopenModal(false);
          }}
          isSubmitting={reopenMutation.isPending}
          error={reopenMutation.error as Error | null}
        />
      )}
    </div>
  );
};

function CloseModal({
  period,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: {
  period: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [typedConfirmation, setTypedConfirmation] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-accent" />
            <h2 className="text-base font-bold text-ink">Close Period {period}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed">
          Closing an accounting period locks all ledger lines. New expenses and capital transactions
          targeting {period} will be rejected by the backend database controls.
        </p>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Type &quot;CLOSE&quot; to confirm
          </label>
          <input
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            placeholder="CLOSE"
            className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-xs text-danger font-medium">{error.message}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-hairline text-ink text-sm font-semibold hover:bg-surface-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={typedConfirmation !== "CLOSE" || isSubmitting}
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Locking…" : "Lock Period"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReopenModal({
  period,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: {
  period: string;
  onClose: () => void;
  onConfirm: (reason: string, otp: string) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-danger" />
            <h2 className="text-base font-bold text-ink">Reopen Period {period}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed">
          Reopening an accounting period is an audited, privileged action requiring two-factor authorization
          and an explicit audit reason.
        </p>

        <form
          className="space-y-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            await onConfirm(reason.trim(), otp.trim());
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Reason for Reopening (Required)
            </label>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Audit correction for omitted electricity payment"
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-danger"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Step-Up Auth OTP (If Required)
            </label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP code"
              className="w-full h-11 px-3 rounded-xl border border-hairline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-danger tracking-widest font-mono"
            />
          </div>

          {error && <p className="text-xs text-danger font-medium">{error.message}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-hairline text-ink text-sm font-semibold hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 h-11 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-danger/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? "Reopening…" : "Confirm Reopen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FinanceCloseView;
