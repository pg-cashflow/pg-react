import React, { useState } from "react";
import { X, Calculator, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { usePayrollPreview, useFinalizePayroll } from "@/lib/useAttendance";
import { formatPaise } from "@/lib/utils";
import type { StaffProfile } from "@pg/types";

interface PayrollPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleMonth: string;
  staffMap: Map<string, StaffProfile>;
  onFinalized?: () => void;
}

export const PayrollPreviewModal: React.FC<PayrollPreviewModalProps> = ({
  isOpen,
  onClose,
  cycleMonth,
  staffMap,
  onFinalized,
}) => {
  const { data, isLoading, isError, error, refetch } = usePayrollPreview(cycleMonth);
  const finalizeMutation = useFinalizePayroll();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculations = data?.calculations || [];
  const totalNetWagePaise = calculations.reduce((sum, c) => sum + c.net_wage_paise, 0);
  const totalDeductionsPaise = calculations.reduce((sum, c) => sum + c.total_deduction_paise, 0);

  const handleFinalize = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    finalizeMutation.mutate(cycleMonth, {
      onSuccess: () => {
        setSuccessMessage("Payroll finalized successfully! Payout items generated.");
        onFinalized?.();
      },
      onError: (err: any) => {
        setErrorMessage(err.message || "Failed to finalize payroll cycle.");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-text text-base">
              Monthly Payroll Calculation — {cycleMonth}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-sm text-danger-text bg-danger-bg border border-danger-border rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-text-muted flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Calculating payroll based on attendance records...
            </div>
          ) : isError ? (
            <div className="p-6 text-center space-y-3">
              <div className="text-sm text-danger-text">
                {(error as any)?.message || "Failed to calculate payroll preview."}
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 text-xs font-medium bg-surface-elevated border border-border rounded-lg text-text"
              >
                Retry
              </button>
            </div>
          ) : calculations.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No active staff found for this payroll cycle month.
            </div>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-surface-elevated/40 border border-border rounded-xl">
                <div>
                  <div className="text-xs text-text-muted">Total Net Payout</div>
                  <div className="text-lg font-bold text-text mt-0.5">
                    {formatPaise(totalNetWagePaise)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Total Deductions</div>
                  <div className="text-lg font-bold text-warning mt-0.5">
                    {formatPaise(totalDeductionsPaise)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Staff Headcount</div>
                  <div className="text-lg font-bold text-text mt-0.5">
                    {calculations.length}
                  </div>
                </div>
              </div>

              {/* Table Breakdown */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-elevated text-text-muted border-b border-border">
                    <tr>
                      <th className="px-3 py-2 font-medium">Staff Member</th>
                      <th className="px-3 py-2 font-medium">Base Wage</th>
                      <th className="px-3 py-2 font-medium">Att. (P / L / A)</th>
                      <th className="px-3 py-2 font-medium">Deductions</th>
                      <th className="px-3 py-2 font-medium text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {calculations.map((calc) => {
                      const staff = staffMap.get(calc.staff_id);
                      return (
                        <tr key={calc.id || calc.staff_id} className="hover:bg-surface-elevated/20">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text">
                              {staff?.name || "Staff Member"}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {staff?.role || "Staff"}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-text">
                            {formatPaise(calc.base_monthly_wage_paise)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-emerald-600 font-medium">
                              {calc.days_present}P
                            </span>{" "}
                            /{" "}
                            <span className="text-blue-600">
                              {calc.days_paid_leave + calc.days_holiday}L
                            </span>{" "}
                            /{" "}
                            <span className="text-rose-600">
                              {calc.days_absent}A
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {calc.total_deduction_paise > 0 ? (
                              <span className="text-rose-600 font-medium">
                                -{formatPaise(calc.total_deduction_paise)}
                              </span>
                            ) : (
                              <span className="text-text-muted">₹0</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-text text-right">
                            {formatPaise(calc.net_wage_paise)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                Finalizing will lock these calculations and immediately insert unbatched payout items into your Money Out queue for batch approval and bank disbursement.
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated rounded-xl transition-colors"
          >
            {successMessage ? "Close" : "Cancel"}
          </button>

          {!successMessage && calculations.length > 0 && (
            <button
              type="button"
              disabled={finalizeMutation.isPending}
              onClick={handleFinalize}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {finalizeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalizing Cycle...
                </>
              ) : (
                <>
                  <span>Finalize & Push to Payouts</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
