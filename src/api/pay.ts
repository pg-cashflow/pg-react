import { apiFetch, apiFetchBlob, ApiError } from "./client";
import type { PayIntent } from "@pg/types";

export const getOwnerDuePay = (dueId: string): Promise<PayIntent> =>
  apiFetch(`/owner/dues/${dueId}/pay`);

export const getTenantDuePay = (dueId: string): Promise<PayIntent> =>
  apiFetch(`/tenant/dues/${dueId}/pay`);

export const getPayQrBlob = (qrPngUrl: string): Promise<Blob> => apiFetchBlob(qrPngUrl);

/**
 * Triggers synchronous order verification with Cashfree.
 * Returns { paid: true } if ledger transitioned to paid.
 * Tolerates 404 if pg-go verify endpoint has not yet shipped, falling back gracefully to polling.
 */
export const verifyTenantDuePay = async (dueId: string): Promise<{ paid: boolean }> => {
  try {
    return await apiFetch<{ paid: boolean }>(`/tenant/dues/${dueId}/pay/verify`, {
      method: "POST",
      body: "{}",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { paid: false };
    }
    throw err;
  }
};
