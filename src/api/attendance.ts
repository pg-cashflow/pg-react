import { apiFetch } from "./client";
import type {
  StaffProfile,
  CreateStaffInput,
  UpdateStaffStatusInput,
  LeavePolicy,
  LeavePolicyUpdateInput,
  AttendanceRecord,
  MarkDailyAttendanceInput,
  WageCalculation,
} from "@pg/types";

export const getStaffProfiles = async (activeOnly = true): Promise<StaffProfile[]> => {
  const query = activeOnly ? "?active_only=true" : "?active_only=false";
  const data = await apiFetch<{ staff: StaffProfile[] }>(`/owner/staff${query}`);
  return data.staff ?? [];
};

export const createStaffProfile = async (
  input: CreateStaffInput
): Promise<StaffProfile> => {
  return apiFetch<StaffProfile>("/owner/staff", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const updateStaffStatus = async (
  id: string,
  input: UpdateStaffStatusInput
): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>(`/owner/staff/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
};

export const getLeavePolicy = async (): Promise<LeavePolicy> => {
  return apiFetch<LeavePolicy>("/owner/attendance/leave-policy");
};

export const updateLeavePolicy = async (
  input: LeavePolicyUpdateInput
): Promise<LeavePolicy> => {
  return apiFetch<LeavePolicy>("/owner/attendance/leave-policy", {
    method: "PUT",
    body: JSON.stringify(input),
  });
};

export const markDailyAttendance = async (
  input: MarkDailyAttendanceInput
): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>("/owner/attendance/daily", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const getMonthlyAttendance = async (
  month?: string
): Promise<{ month: string; records: AttendanceRecord[] }> => {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return apiFetch<{ month: string; records: AttendanceRecord[] }>(
    `/owner/attendance/monthly${query}`
  );
};

export const previewPayroll = async (
  cycleMonth: string
): Promise<{ cycle_month: string; calculations: WageCalculation[] }> => {
  return apiFetch<{ cycle_month: string; calculations: WageCalculation[] }>(
    "/owner/payroll/calculate",
    {
      method: "POST",
      body: JSON.stringify({ cycle_month: cycleMonth }),
    }
  );
};

export const finalizePayroll = async (
  cycleMonth: string
): Promise<{ cycle_month: string; finalized: WageCalculation[] }> => {
  return apiFetch<{ cycle_month: string; finalized: WageCalculation[] }>(
    "/owner/payroll/finalize",
    {
      method: "POST",
      body: JSON.stringify({ cycle_month: cycleMonth }),
    }
  );
};
