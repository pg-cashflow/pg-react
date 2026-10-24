import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getStaffProfiles,
  createStaffProfile,
  updateStaffStatus,
  getLeavePolicy,
  updateLeavePolicy,
  getMonthlyAttendance,
  markDailyAttendance,
  previewPayroll,
  finalizePayroll,
} from "../api/attendance";
import * as client from "../api/client";
import type { StaffProfile, WageCalculation, LeavePolicy } from "@pg/types";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

const mockStaff: StaffProfile = {
  id: "staff-1",
  property_id: "prop-1",
  payee_id: "payee-1",
  name: "Ramesh Cook",
  role: "Cook",
  phone: "+919876543210",
  base_monthly_wage_paise: 1500000,
  effective_from: "2026-10-01",
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCalc: WageCalculation = {
  id: "calc-1",
  property_id: "prop-1",
  staff_id: "staff-1",
  cycle_month: "2026-10",
  base_monthly_wage_paise: 1500000,
  prorated_base_wage_paise: 1500000,
  total_basis_days: 31,
  employed_basis_days: 31,
  days_present: 28,
  days_paid_leave: 2,
  days_holiday: 0,
  days_absent: 1,
  days_unrecorded: 0,
  free_leave_days_allowed: 2,
  excess_absent_days: 0,
  per_day_rate_paise: 48387,
  total_deduction_paise: 0,
  net_wage_paise: 1500000,
  status: "calculated",
  calculated_at: new Date().toISOString(),
  finalized_by: "user-1",
};

const mockPolicy: LeavePolicy = {
  id: "pol-1",
  property_id: "prop-1",
  monthly_free_leave_days: 2,
  paid_holidays: ["2026-10-02"],
  working_days_basis: "calendar_days",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  if (container && document.body.contains(container)) {
    document.body.removeChild(container);
  }
  container = null;
  root = null;
  queryClient.clear();
});

describe("Track M: Staff Attendance & Payroll API Client", () => {
  it("getStaffProfiles calls /owner/staff and returns staff array", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValue({
      staff: [mockStaff],
    });

    const result = await getStaffProfiles(true);
    expect(fetchSpy).toHaveBeenCalledWith("/owner/staff?active_only=true");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Ramesh Cook");
  });

  it("createStaffProfile calls POST /owner/staff", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValue(mockStaff);

    const result = await createStaffProfile({
      payee_id: "payee-1",
      name: "Ramesh Cook",
      role: "Cook",
      base_monthly_wage_paise: 1500000,
      effective_from: "2026-10-01",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/owner/staff", {
      method: "POST",
      body: JSON.stringify({
        payee_id: "payee-1",
        name: "Ramesh Cook",
        role: "Cook",
        base_monthly_wage_paise: 1500000,
        effective_from: "2026-10-01",
      }),
    });
    expect(result.id).toBe("staff-1");
  });

  it("updateStaffStatus calls PUT /owner/staff/:id/status", async () => {
    const fetchSpy = vi
      .spyOn(client, "apiFetch")
      .mockResolvedValue({ message: "staff status updated" });

    const result = await updateStaffStatus("staff-1", {
      status: "inactive",
      effective_to: "2026-10-31",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/owner/staff/staff-1/status", {
      method: "PUT",
      body: JSON.stringify({
        status: "inactive",
        effective_to: "2026-10-31",
      }),
    });
    expect(result.message).toBe("staff status updated");
  });

  it("getLeavePolicy & updateLeavePolicy interact with /owner/attendance/leave-policy", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValue(mockPolicy);

    const policy = await getLeavePolicy();
    expect(fetchSpy).toHaveBeenCalledWith("/owner/attendance/leave-policy");
    expect(policy.monthly_free_leave_days).toBe(2);

    await updateLeavePolicy({
      monthly_free_leave_days: 3,
      paid_holidays: ["2026-10-02"],
      working_days_basis: "calendar_days",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/owner/attendance/leave-policy", {
      method: "PUT",
      body: JSON.stringify({
        monthly_free_leave_days: 3,
        paid_holidays: ["2026-10-02"],
        working_days_basis: "calendar_days",
      }),
    });
  });

  it("markDailyAttendance posts bulk check-in records", async () => {
    const fetchSpy = vi
      .spyOn(client, "apiFetch")
      .mockResolvedValue({ message: "attendance recorded successfully" });

    const result = await markDailyAttendance({
      work_date: "2026-10-24",
      entries: [{ staff_id: "staff-1", status: "present" }],
    });

    expect(fetchSpy).toHaveBeenCalledWith("/owner/attendance/daily", {
      method: "POST",
      body: JSON.stringify({
        work_date: "2026-10-24",
        entries: [{ staff_id: "staff-1", status: "present" }],
      }),
    });
    expect(result.message).toBe("attendance recorded successfully");
  });

  it("getMonthlyAttendance queries records for specified month", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValue({
      month: "2026-10",
      records: [],
    });

    const result = await getMonthlyAttendance("2026-10");
    expect(fetchSpy).toHaveBeenCalledWith("/owner/attendance/monthly?month=2026-10");
    expect(result.month).toBe("2026-10");
  });

  it("previewPayroll and finalizePayroll invoke wage computation and finalization", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValue({
      cycle_month: "2026-10",
      calculations: [mockCalc],
      finalized: [mockCalc],
    });

    const preview = await previewPayroll("2026-10");
    expect(fetchSpy).toHaveBeenCalledWith("/owner/payroll/calculate", {
      method: "POST",
      body: JSON.stringify({ cycle_month: "2026-10" }),
    });
    expect(preview.calculations).toHaveLength(1);

    const finalized = await finalizePayroll("2026-10");
    expect(fetchSpy).toHaveBeenCalledWith("/owner/payroll/finalize", {
      method: "POST",
      body: JSON.stringify({ cycle_month: "2026-10" }),
    });
    expect(finalized.finalized).toHaveLength(1);
  });
});
