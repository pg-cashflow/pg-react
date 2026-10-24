import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/api/attendance";
import { QUERY_KEYS } from "./queryKeys";
import type {
  CreateStaffInput,
  UpdateStaffStatusInput,
  LeavePolicyUpdateInput,
  MarkDailyAttendanceInput,
} from "@pg/types";

export function useStaffProfiles(activeOnly = true) {
  return useQuery({
    queryKey: QUERY_KEYS.staffProfiles(activeOnly),
    queryFn: () => getStaffProfiles(activeOnly),
  });
}

export function useCreateStaffProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => createStaffProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "staff"] });
    },
  });
}

export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffStatusInput }) =>
      updateStaffStatus(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "staff"] });
    },
  });
}

export function useLeavePolicy() {
  return useQuery({
    queryKey: QUERY_KEYS.leavePolicy,
    queryFn: getLeavePolicy,
  });
}

export function useUpdateLeavePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeavePolicyUpdateInput) => updateLeavePolicy(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leavePolicy });
      queryClient.invalidateQueries({ queryKey: ["owner", "payroll"] });
    },
  });
}

export function useMonthlyAttendance(month?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.monthlyAttendance(month),
    queryFn: () => getMonthlyAttendance(month),
  });
}

export function useMarkDailyAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkDailyAttendanceInput) => markDailyAttendance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "payroll"] });
    },
  });
}

export function usePayrollPreview(cycleMonth: string) {
  return useQuery({
    queryKey: QUERY_KEYS.payrollPreview(cycleMonth),
    queryFn: () => previewPayroll(cycleMonth),
    enabled: Boolean(cycleMonth),
  });
}

export function useFinalizePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleMonth: string) => finalizePayroll(cycleMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "payroll"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unbatchedPayoutItems });
    },
  });
}
