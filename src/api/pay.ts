import { apiFetch, apiFetchBlob } from "./client";
import type { PayIntent } from "@pg/types";

export const getOwnerDuePay = (dueId: string): Promise<PayIntent> =>
  apiFetch(`/owner/dues/${dueId}/pay`);

export const createOwnerDuePay = (dueId: string, idempotencyKey?: string): Promise<PayIntent> =>
  apiFetch(`/owner/dues/${dueId}/pay`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });

export const getTenantDuePay = (dueId: string): Promise<PayIntent> =>
  apiFetch(`/tenant/dues/${dueId}/pay`);

export const createTenantDuePay = (dueId: string, idempotencyKey?: string): Promise<PayIntent> =>
  apiFetch(`/tenant/dues/${dueId}/pay`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });

export const getPayQrBlob = (qrPngUrl: string): Promise<Blob> => apiFetchBlob(qrPngUrl);

/**
 * Triggers synchronous order verification with Cashfree by provider order ID.
 * Returns { paid: true, status: string, due_ids: string[] } if ledger transitioned to paid.
 */
export const verifyTenantOrderPay = async (
  orderId: string
): Promise<{ paid: boolean; status: string; due_ids?: string[] }> => {
  return await apiFetch<{ paid: boolean; status: string; due_ids?: string[] }>(
    `/tenant/payments/orders/${encodeURIComponent(orderId)}/verify`,
    {
      method: "POST",
      body: "{}",
    }
  );
};

/**
 * Triggers synchronous order verification with Cashfree by order ID across all roles.
 */
export const verifyOrderPay = async (
  orderId: string
): Promise<{ paid: boolean; status: string; due_ids?: string[] }> => {
  return await apiFetch<{ paid: boolean; status: string; due_ids?: string[] }>(
    `/payments/orders/${encodeURIComponent(orderId)}/verify`,
    {
      method: "POST",
      body: "{}",
    }
  );
};

/**
 * Triggers synchronous order verification with Cashfree for a specific due.
 * Returns { paid: true } if ledger transitioned to paid.
 */
export const verifyTenantDuePay = async (dueId: string): Promise<{ paid: boolean }> => {
  return await apiFetch<{ paid: boolean }>(`/tenant/dues/${dueId}/pay/verify`, {
    method: "POST",
    body: "{}",
  });
};
