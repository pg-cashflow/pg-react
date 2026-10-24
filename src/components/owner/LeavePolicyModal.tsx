import React, { useState, useEffect } from "react";
import { X, Calendar, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useLeavePolicy, useUpdateLeavePolicy } from "@/lib/useAttendance";
import type { WorkingDaysBasis } from "@pg/types";

interface LeavePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeavePolicyModal: React.FC<LeavePolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: policy, isLoading } = useLeavePolicy();
  const updateMutation = useUpdateLeavePolicy();

  const [freeLeaves, setFreeLeaves] = useState<number>(2);
  const [basis, setBasis] = useState<WorkingDaysBasis>("calendar_days");
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setFreeLeaves(policy.monthly_free_leave_days ?? 2);
      setBasis(policy.working_days_basis || "calendar_days");
      setHolidays(policy.paid_holidays || []);
    }
  }, [policy]);

  if (!isOpen) return null;

  const handleAddHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) {
      setErrorMessage("Holiday date already added.");
      return;
    }
    setHolidays([...holidays, newHoliday].sort());
    setNewHoliday("");
    setErrorMessage(null);
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays(holidays.filter((d) => d !== date));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (freeLeaves < 0) {
      setErrorMessage("Free leaves cannot be negative.");
      return;
    }

    updateMutation.mutate(
      {
        monthly_free_leave_days: Number(freeLeaves),
        working_days_basis: basis,
        paid_holidays: holidays,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: any) => {
          setErrorMessage(err.message || "Failed to update leave policy.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text text-base">Leave & Working Policy</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-muted flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading policy...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-sm text-danger-text bg-danger-bg border border-danger-border rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Monthly Free Leaves Allowed
              </label>
              <input
                type="number"
                min="0"
                max="15"
                required
                value={freeLeaves}
                onChange={(e) => setFreeLeaves(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Leaves up to this limit do not cause wage deduction. Excess absent days deduct salary proportionally.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Working Days Calculation Basis
              </label>
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value as WorkingDaysBasis)}
                className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="calendar_days">Calendar Days (28-31 days per month)</option>
                <option value="fixed_30">Fixed 30 Days (standard monthly divisor)</option>
                <option value="working_days_excluding_sundays">Excluding Sundays</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Paid Holidays Calendar
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="date"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-surface-elevated border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="px-3 py-2 text-xs font-medium bg-surface-elevated hover:bg-surface border border-border rounded-xl text-text flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {holidays.length === 0 ? (
                <div className="text-xs text-text-muted py-2 text-center bg-surface-elevated/50 rounded-xl border border-dashed border-border">
                  No property holidays configured yet.
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-surface-elevated/30 rounded-xl border border-border">
                  {holidays.map((hDate) => (
                    <div
                      key={hDate}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-surface rounded-lg border border-border"
                    >
                      <span className="font-mono text-text">{hDate}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHoliday(hDate)}
                        className="p-1 text-text-muted hover:text-danger-text transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-text rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {updateMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Save Policy
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
