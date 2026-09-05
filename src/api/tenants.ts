import { apiFetch, apiFetchBlob, unwrapList } from "./client";
import type { Paise, Tenant } from "@pg/types";

export interface CreateTenantPayload {
  name: string;
  phone?: string;
  room_number?: string;
  rent_amount: Paise;
  due_day: number;
  notice_period_days?: number;
  deposit_amount?: Paise;
}

export interface UpdateTenantPayload {
  name?: string;
  room_number?: string;
  rent_amount?: Paise;
  due_day?: number;
  notice_period_days?: number;
}

export const getTenants = async (): Promise<Tenant[]> => {
  const data = await apiFetch<{ tenants: Tenant[] }>("/owner/tenants");
  return unwrapList(data, "tenants");
};

export const createTenant = (data: CreateTenantPayload): Promise<Tenant> =>
  apiFetch<Tenant>("/owner/tenants", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateTenant = (id: string, data: UpdateTenantPayload): Promise<Tenant> =>
  apiFetch<Tenant>(`/owner/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const giveNotice = (id: string, noticeGivenAt?: string): Promise<{ ok: boolean }> =>
  apiFetch(`/owner/tenants/${id}/notice`, {
    method: "POST",
    body: JSON.stringify(noticeGivenAt ? { notice_given_at: noticeGivenAt } : {}),
  });

export const vacateTenant = (id: string): Promise<{ ok: boolean }> =>
  apiFetch(`/owner/tenants/${id}/vacate`, { method: "POST", body: "{}" });

export const attachPhone = (id: string, phone: string): Promise<{ ok: boolean }> =>
  apiFetch(`/owner/tenants/${id}/attach-phone`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const prorateTenant = (id: string, vacateDate: string): Promise<unknown> =>
  apiFetch(`/owner/tenants/${id}/prorate`, {
    method: "POST",
    body: JSON.stringify({ vacate_date: vacateDate }),
  });

export const settleDeposit = (
  id: string,
  refundedAmountPaise: Paise,
  reason?: string
): Promise<{ ok: boolean }> =>
  apiFetch(`/owner/tenants/${id}/deposit/settle`, {
    method: "POST",
    body: JSON.stringify({ refunded_amount_paise: refundedAmountPaise, reason }),
  });

export const getTenantIdPhotoBlob = (id: string): Promise<Blob> =>
  apiFetchBlob(`/owner/tenants/${id}/id-photo`);
