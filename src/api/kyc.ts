import { apiFetch, apiFetchBlob, apiUpload } from "./client";
import type {
  KYCStatusResponse,
  KYCVerification,
  OwnerKYCVerificationView,
} from "@pg/types";

export interface KYCConsentPayload {
  purpose: string;
  consent_version: string;
  consent_text?: string;
  locale?: string;
}

export interface RejectKYCPayload {
  reason: string;
}

export interface UploadKYCOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

// --- Tenant KYC Endpoints ---

export const getTenantKYCStatus = (): Promise<KYCStatusResponse> =>
  apiFetch<KYCStatusResponse>("/tenant/kyc/status");

export const submitKYCConsent = (payload: KYCConsentPayload): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>("/tenant/kyc/consent", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const verifySecureQR = (
  qrPayload: string
): Promise<KYCVerification> =>
  apiFetch<KYCVerification>("/tenant/kyc/qr/verify", {
    method: "POST",
    body: JSON.stringify({ qr_payload: qrPayload }),
  });


export const uploadKYCDocument = (
  file: File,
  options?: UploadKYCOptions
): Promise<KYCVerification> => {
  const fd = new FormData();
  fd.append("file", file);
  if (options?.onProgress) {
    return apiUpload<KYCVerification>("/tenant/kyc/upload", fd, {
      onProgress: (p) => options.onProgress?.(p.percent),
      signal: options.signal,
    });
  }
  return apiFetch<KYCVerification>("/tenant/kyc/upload", {
    method: "POST",
    body: fd,
    signal: options?.signal,
  });
};

export const revokeKYCConsent = (): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>("/tenant/kyc/revoke", {
    method: "POST",
  });

// --- Owner KYC Endpoints ---

export const getOwnerKYCQueue = (): Promise<{ items: OwnerKYCVerificationView[] }> =>
  apiFetch<{ items: OwnerKYCVerificationView[] }>("/owner/kyc/queue");

export const approveOwnerKYC = (
  id: string
): Promise<OwnerKYCVerificationView> =>
  apiFetch<OwnerKYCVerificationView>(`/owner/kyc/${id}/approve`, {
    method: "POST",
  });

export const rejectOwnerKYC = (
  id: string,
  reason: string
): Promise<OwnerKYCVerificationView> =>
  apiFetch<OwnerKYCVerificationView>(`/owner/kyc/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const getOwnerTenantKYC = (
  tenantId: string
): Promise<OwnerKYCVerificationView> =>
  apiFetch<OwnerKYCVerificationView>(`/owner/tenants/${tenantId}/kyc`);

export const getOwnerTenantKYCPhoto = (tenantId: string, signal?: AbortSignal): Promise<Blob> =>
  apiFetchBlob(`/owner/tenants/${tenantId}/kyc/photo`, { signal });

export const getOwnerKYCDocumentBlob = (id: string, signal?: AbortSignal): Promise<Blob> =>
  apiFetchBlob(`/owner/kyc/${id}/document`, { signal });



// --- Manager KYC Endpoints ---

export const getManagerKYCDocumentBlob = (id: string, signal?: AbortSignal): Promise<Blob> =>
  apiFetchBlob(`/manager/kyc/${id}/document`, { signal });
