import { apiFetch, apiFetchBlob } from "./client";
import type { PayIntent } from "@pg/types";

export const getOwnerDuePay = (dueId: string): Promise<PayIntent> =>
  apiFetch(`/owner/dues/${dueId}/pay`);

export const getTenantDuePay = (dueId: string): Promise<PayIntent> =>
  apiFetch(`/tenant/dues/${dueId}/pay`);

export const getPayQrBlob = (qrPngUrl: string): Promise<Blob> => apiFetchBlob(qrPngUrl);
