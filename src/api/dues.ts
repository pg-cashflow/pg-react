import { apiFetch, apiFetchBlob, unwrapList } from "./client";
import type { Due, DueTokenResponse, Paise, Payment } from "@pg/types";

export const getDues = async (tenantId?: string, status?: string): Promise<Due[]> => {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenant_id", tenantId);
  if (status && status !== "all") params.set("status", status);
  const qs = params.toString();
  const data = await apiFetch<{ dues: Due[] }>(`/owner/dues${qs ? `?${qs}` : ""}`);
  return unwrapList(data, "dues");
};

export const waiveDue = (id: string): Promise<Due> =>
  apiFetch<Due>(`/owner/dues/${id}/waive`, { method: "POST", body: "{}" });

export const markCashPaid = (
  dueId: string,
  amount: Paise,
  note?: string
): Promise<Payment> =>
  apiFetch<Payment>(`/owner/dues/${dueId}/mark-cash-paid`, {
    method: "POST",
    body: JSON.stringify({ amount, note: note ?? "" }),
  });

export const matchDue = (
  dueId: string,
  amount: Paise,
  upiTxnId: string
): Promise<Payment> =>
  apiFetch<Payment>(`/owner/dues/${dueId}/match`, {
    method: "POST",
    body: JSON.stringify({ amount, upi_txn_id: upiTxnId }),
  });

export const createDueToken = (dueId: string): Promise<DueTokenResponse> =>
  apiFetch<DueTokenResponse>(`/owner/dues/${dueId}/token`, {
    method: "POST",
    body: "{}",
  });

export const getDueQR = (dueId: string): Promise<Blob> =>
  apiFetchBlob(`/owner/dues/${dueId}/qr`);
