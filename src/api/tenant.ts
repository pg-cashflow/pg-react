import { apiFetch, apiFetchBlob, unwrapList } from "./client";
import type { AadhaarPreview, Due, Payment, TenantMeResponse } from "@pg/types";

export const getMyProfile = (): Promise<TenantMeResponse> =>
  apiFetch<TenantMeResponse>("/tenant/me");

export const getMyDues = async (): Promise<Due[]> => {
  const data = await apiFetch<{ dues: Due[] }>("/tenant/dues");
  return unwrapList(data, "dues");
};

export const getMyPayments = async (): Promise<Payment[]> => {
  const data = await apiFetch<{ payments: Payment[] }>("/tenant/payments");
  return unwrapList(data, "payments");
};

export const getMyDueQR = (dueId: string): Promise<Blob> =>
  apiFetchBlob(`/tenant/dues/${dueId}/qr`);

export const submitUtrReport = (
  dueId: string,
  upiTxnId: string,
  image?: File
): Promise<unknown> => {
  if (image) {
    const fd = new FormData();
    fd.append("upi_txn_id", upiTxnId);
    fd.append("image", image);
    return apiFetch(`/tenant/dues/${dueId}/reports`, { method: "POST", body: fd });
  }
  return apiFetch(`/tenant/dues/${dueId}/reports`, {
    method: "POST",
    body: JSON.stringify({ upi_txn_id: upiTxnId }),
  });
};

export interface AadhaarPayload {
  consent: boolean;
  qr_payload?: string;
  uid_last4?: string;
  confirm?: boolean;
  name?: string;
  dob?: string;
  gender?: string;
  channel?: string;
}

export const submitAadhaar = (body: AadhaarPayload): Promise<AadhaarPreview & { aadhaar_last4?: string }> =>
  apiFetch("/tenant/aadhaar", { method: "POST", body: JSON.stringify(body) });
