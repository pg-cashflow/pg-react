import React, { useState, useMemo } from "react";
import {
  Users,
  CalendarCheck2,
  Calculator,
  Plus,
  Sliders,
  CheckCircle2,
  XCircle,
  Calendar,
  Send,
  Loader2,
  RefreshCw,
  Phone,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import {
  useStaffProfiles,
  useMonthlyAttendance,
  usePayrollPreview,
  useUpdateStaffStatus,
} from "@/lib/useAttendance";
import { usePayees } from "@/lib/usePayouts";
import { formatPaise } from "@/lib/utils";
import { QueryState } from "@/components/shared/QueryState";
import { CreateStaffModal } from "@/components/owner/CreateStaffModal";
import { LeavePolicyModal } from "@/components/owner/LeavePolicyModal";
import { MarkAttendanceModal } from "@/components/owner/MarkAttendanceModal";
import { PayrollPreviewModal } from "@/components/owner/PayrollPreviewModal";
import { useNavigate } from "@tanstack/react-router";
import type { StaffProfile, AttendanceStatus } from "@pg/types";

export const AttendanceView: React.FC = () => {
  const navigate = useNavigate();

  // Current month string default: "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [activeTab, setActiveTab] = useState<"roster" | "grid" | "payroll">("roster");

  // Modals state
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [isLeavePolicyOpen, setIsLeavePolicyOpen] = useState(false);
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isPayrollPreviewOpen, setIsPayrollPreviewOpen] = useState(false);

  // Queries
  const {
    data: staffList = [],
    isLoading: isStaffLoading,
    isError: isStaffError,
    error: staffError,
    refetch: refetchStaff,
  } = useStaffProfiles(false);

  const {
    data: attendanceData,
    isLoading: isAttendanceLoading,
    refetch: refetchAttendance,
  } = useMonthlyAttendance(selectedMonth);

  const {
    data: payrollData,
    isLoading: isPayrollLoading,
    refetch: refetchPayroll,
  } = usePayrollPreview(selectedMonth);

  const { data: payees = [] } = usePayees();
  const updateStatusMutation = useUpdateStaffStatus();

  // Active staff filter
  const activeStaffList = useMemo(
    () => staffList.filter((s) => s.status === "active"),
    [staffList]
  );

  const staffMap = useMemo(
    () => new Map(staffList.map((s) => [s.id, s])),
    [staffList]
  );

  const payeeMap = useMemo(
    () => new Map(payees.map((p) => [p.id, p])),
    [payees]
  );

  // Map monthly attendance by staff_id -> work_date (YYYY-MM-DD) -> record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceStatus>>();
    const records = attendanceData?.records || [];
    records.forEach((r) => {
      if (!map.has(r.staff_id)) {
        map.set(r.staff_id, new Map());
      }
      const dateKey = typeof r.work_date === "string" ? r.work_date.split("T")[0] : "";
      if (dateKey) {
        map.get(r.staff_id)!.set(dateKey, r.status);
      }
    });
    return map;
  }, [attendanceData]);

  // Generate calendar days for the selected month
  const monthDays = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dayStr = String(dayNum).padStart(2, "0");
      const dateStr = `${selectedMonth}-${dayStr}`;
      const d = new Date(year, month - 1, dayNum);
      const isSunday = d.getDay() === 0;
      return { dayNum, dateStr, isSunday };
    });
  }, [selectedMonth]);

  const handleToggleStaffStatus = (staff: StaffProfile) => {
    const newStatus = staff.status === "active" ? "inactive" : "active";
    updateStatusMutation.mutate({
      id: staff.id,
      input: {
        status: newStatus,
        effective_to: newStatus === "inactive" ? new Date().toISOString().split("T")[0] : undefined,
      },
    });
  };

  const calculations = payrollData?.calculations || [];
  const totalNetWagePaise = calculations.reduce((sum, c) => sum + c.net_wage_paise, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="t-h2 font-bold text-text tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            Staff Attendance & Wages
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track daily attendance, manage leave policies, and calculate automated monthly payroll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month selector */}
          <div className="flex items-center gap-1.5 bg-surface-elevated border border-border px-3 py-1.5 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-text text-sm font-medium focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsLeavePolicyOpen(true)}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-surface-elevated hover:bg-surface border border-border rounded-xl text-text flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-4 h-4 text-text-muted" />
            <span>Policy</span>
          </button>

          <button
            onClick={() => setIsCreateStaffOpen(true)}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-surface-elevated hover:bg-surface border border-border rounded-xl text-text flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-accent" />
            <span>Add Staff</span>
          </button>

          <button
            onClick={() => setIsMarkAttendanceOpen(true)}
            disabled={activeStaffList.length === 0}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>

          <button
            onClick={() => setIsPayrollPreviewOpen(true)}
            disabled={activeStaffList.length === 0}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculate Payroll</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface border border-border rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Active Staff</span>
            <span className="p-2 bg-accent-tint text-accent rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="t-display-num font-bold text-text mt-2">
            {activeStaffList.length}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {staffList.length - activeStaffList.length} inactive
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Total Monthly Payroll</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Calculator className="w-4 h-4" />
            </span>
          </div>
          <div className="t-display-num font-bold text-text mt-2">
            {formatPaise(totalNetWagePaise)}
          </div>
          <div className="text-xs text-text-muted mt-1">
            For cycle month {selectedMonth}
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Money Out Integration</span>
              <span className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Send className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xs text-text-muted mt-2">
              Finalizing payroll pushes staff salary records directly into Payouts.
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/owner/payouts" })}
            className="mt-2 text-xs font-medium text-accent hover:underline flex items-center gap-1"
          >
            <span>Open Money Out Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("roster")}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            activeTab === "roster"
              ? "bg-surface-elevated text-text shadow-xs"
              : "text-text-muted hover:text-text hover:bg-surface-elevated/50"
          }`}
        >
          Staff Roster ({staffList.length})
        </button>
        <button
          onClick={() => setActiveTab("grid")}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            activeTab === "grid"
              ? "bg-surface-elevated text-text shadow-xs"
              : "text-text-muted hover:text-text hover:bg-surface-elevated/50"
          }`}
        >
          Monthly Attendance Grid
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            activeTab === "payroll"
              ? "bg-surface-elevated text-text shadow-xs"
              : "text-text-muted hover:text-text hover:bg-surface-elevated/50"
          }`}
        >
          Payroll Breakdown
        </button>
      </div>

      {/* Tab 1: Staff Roster */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <QueryState
            isLoading={isStaffLoading}
            isError={isStaffError}
            error={staffError as Error}
            onRetry={() => refetchStaff()}
          >
            {staffList.length === 0 ? (
              <div className="p-12 text-center bg-surface border border-dashed border-border rounded-2xl">
                <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <h3 className="font-semibold text-text text-base">No staff members enrolled</h3>
                <p className="text-sm text-text-muted max-w-sm mx-auto mt-1 mb-4">
                  Add cooks, wardens, security guards, and cleaners to record attendance and compute monthly wages.
                </p>
                <button
                  onClick={() => setIsCreateStaffOpen(true)}
                  className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  Add First Staff Member
                </button>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-elevated text-text-muted border-b border-border text-xs">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name & Role</th>
                        <th className="px-4 py-3 font-medium">Monthly Wage</th>
                        <th className="px-4 py-3 font-medium">Disbursement Payee</th>
                        <th className="px-4 py-3 font-medium">Start Date</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {staffList.map((staff) => {
                        const payee = payeeMap.get(staff.payee_id);
                        return (
                          <tr key={staff.id} className="hover:bg-surface-elevated/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-text">{staff.name}</div>
                              <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                                <span>{staff.role}</span>
                                {staff.phone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="w-3 h-3" />
                                    {staff.phone}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-text">
                              {formatPaise(staff.base_monthly_wage_paise)}
                            </td>
                            <td className="px-4 py-3">
                              {payee ? (
                                <div className="text-xs">
                                  <div className="font-medium text-text">{payee.name}</div>
                                  <div className="text-text-muted font-mono text-[11px]">
                                    {payee.upi_vpa ? `UPI: ${payee.upi_vpa}` : `A/C: ****${payee.account_number_last4 || ""}`}
                                    {payee.is_verified ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 ml-1">✓ Verified</span>
                                    ) : (
                                      <span className="text-warning ml-1">⚠ Unverified</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted">Linked Payee Missing</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-text-muted font-mono">
                              {typeof staff.effective_from === "string" ? staff.effective_from.split("T")[0] : ""}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  staff.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-surface-elevated text-text-muted border border-border"
                                }`}
                              >
                                {staff.status === "active" ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                <span className="capitalize">{staff.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleToggleStaffStatus(staff)}
                                disabled={updateStatusMutation.isPending}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-surface-elevated text-text transition-colors"
                              >
                                {staff.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </QueryState>
        </div>
      )}

      {/* Tab 2: Monthly Attendance Grid */}
      {activeTab === "grid" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text text-sm">
                  Attendance Grid for {selectedMonth}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Green: Present · Rose: Absent · Blue: Leave · Purple: Holiday · Amber: Half Day
                </p>
              </div>
              <button
                onClick={() => refetchAttendance()}
                className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-elevated"
                title="Refresh Grid"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {isAttendanceLoading ? (
              <div className="p-12 text-center text-text-muted flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading attendance records...
              </div>
            ) : activeStaffList.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                No active staff to display.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="bg-surface-elevated text-text-muted border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left sticky left-0 bg-surface-elevated z-10 font-medium">
                        Staff Member
                      </th>
                      {monthDays.map((d) => (
                        <th
                          key={d.dateStr}
                          className={`px-1.5 py-2 font-mono ${
                            d.isSunday ? "text-rose-500 font-bold bg-rose-500/5" : ""
                          }`}
                        >
                          {d.dayNum}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeStaffList.map((staff) => {
                      const staffDays = attendanceMap.get(staff.id);
                      return (
                        <tr key={staff.id} className="hover:bg-surface-elevated/20">
                          <td className="px-3 py-2 text-left font-medium text-text sticky left-0 bg-surface z-10 border-r border-border">
                            <div>{staff.name}</div>
                            <div className="text-[10px] text-text-muted">{staff.role}</div>
                          </td>
                          {monthDays.map((d) => {
                            const status = staffDays?.get(d.dateStr);
                            let content = "-";
                            let cellClass = "text-text-muted/40";

                            if (status === "present") {
                              content = "P";
                              cellClass = "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 rounded";
                            } else if (status === "absent") {
                              content = "A";
                              cellClass = "text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 rounded";
                            } else if (status === "half_day") {
                              content = "½";
                              cellClass = "text-warning font-bold bg-warning-tint rounded";
                            } else if (status === "paid_leave") {
                              content = "L";
                              cellClass = "text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 rounded";
                            } else if (status === "holiday") {
                              content = "H";
                              cellClass = "text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 rounded";
                            }

                            return (
                              <td
                                key={d.dateStr}
                                className={`px-1 py-1.5 font-mono text-[11px] ${
                                  d.isSunday ? "bg-rose-500/5" : ""
                                }`}
                              >
                                <span className={`inline-block w-5 h-5 leading-5 text-center ${cellClass}`}>
                                  {content}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Payroll Breakdown */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text text-sm">
                  Calculated Monthly Wages — {selectedMonth}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Real-time computation based on logged attendance, leave policy allowances, and unexcused absences.
                </p>
              </div>
              <button
                onClick={() => setIsPayrollPreviewOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Review & Finalize</span>
              </button>
            </div>

            {isPayrollLoading ? (
              <div className="p-12 text-center text-text-muted flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Calculating wages...
              </div>
            ) : calculations.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                No payroll calculations available for {selectedMonth}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-elevated text-text-muted border-b border-border text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Staff Member</th>
                      <th className="px-4 py-3 font-medium">Base Wage</th>
                      <th className="px-4 py-3 font-medium">Employed Days</th>
                      <th className="px-4 py-3 font-medium">Present</th>
                      <th className="px-4 py-3 font-medium">Paid Leaves / Free</th>
                      <th className="px-4 py-3 font-medium">Deductions</th>
                      <th className="px-4 py-3 font-medium text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {calculations.map((calc) => {
                      const staff = staffMap.get(calc.staff_id);
                      return (
                        <tr key={calc.id || calc.staff_id} className="hover:bg-surface-elevated/20">
                          <td className="px-4 py-3">
                            <div className="font-medium text-text">{staff?.name || "Staff Member"}</div>
                            <div className="text-xs text-text-muted">{staff?.role || "Staff"}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {formatPaise(calc.base_monthly_wage_paise)}
                          </td>
                          <td className="px-4 py-3 text-text-muted">
                            {calc.employed_basis_days} / {calc.total_basis_days}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-600 font-medium">{calc.days_present} days</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">
                            {calc.days_paid_leave + calc.days_holiday} (Allowed: {calc.free_leave_days_allowed})
                          </td>
                          <td className="px-4 py-3">
                            {calc.total_deduction_paise > 0 ? (
                              <span className="text-rose-600 font-medium flex items-center gap-1">
                                <TrendingDown className="w-3.5 h-3.5" />
                                -{formatPaise(calc.total_deduction_paise)}
                              </span>
                            ) : (
                              <span className="text-text-muted">₹0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-text text-right">
                            {formatPaise(calc.net_wage_paise)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateStaffModal
        isOpen={isCreateStaffOpen}
        onClose={() => setIsCreateStaffOpen(false)}
        onCreated={() => {
          refetchStaff();
          refetchPayroll();
        }}
      />

      <LeavePolicyModal
        isOpen={isLeavePolicyOpen}
        onClose={() => {
          setIsLeavePolicyOpen(false);
          refetchPayroll();
        }}
      />

      <MarkAttendanceModal
        isOpen={isMarkAttendanceOpen}
        onClose={() => setIsMarkAttendanceOpen(false)}
        staffList={activeStaffList}
        initialDate={`${selectedMonth}-01`}
        onRecorded={() => {
          refetchAttendance();
          refetchPayroll();
        }}
      />

      <PayrollPreviewModal
        isOpen={isPayrollPreviewOpen}
        onClose={() => setIsPayrollPreviewOpen(false)}
        cycleMonth={selectedMonth}
        staffMap={staffMap}
        onFinalized={() => {
          refetchPayroll();
          refetchStaff();
        }}
      />
    </div>
  );
};
