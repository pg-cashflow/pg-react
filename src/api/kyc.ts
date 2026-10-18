import { apiFetch, apiFetchBlob } from "./client";
import type {
  KYCStatusResponse,
  KYCVerification,
  OwnerKYCVerificationView,
} from "@pg/types";

export interface KYCConsentPayload {
  purpose: string;
  consent_version: string;
  consent_text: string;
}

export interface AadhaarOTPRequestPayload {
  aadhaar_number: string;
}

export interface AadhaarOTPVerifyPayload {
  ref_id: string;
  otp: string;
}

export interface DigiLockerInitiatePayload {
  return_url?: string;
}

export interface DigiLockerInitiateResponse {
  verification_url?: string;
  verification_id?: string;
}

export interface RejectKYCPayload {
  reason: string;
}

// --- Tenant KYC Endpoints ---

export const getTenantKYCStatus = (): Promise<KYCStatusResponse> =>
  apiFetch<KYCStatusResponse>("/tenant/kyc/status");

export const submitKYCConsent = (payload: KYCConsentPayload): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>("/tenant/kyc/consent", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const requestAadhaarOTP = (
  aadhaarNumber: string
): Promise<{ ref_id: string }> =>
  apiFetch<{ ref_id: string }>("/tenant/kyc/aadhaar/otp/request", {
    method: "POST",
    body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
  });

export const verifyAadhaarOTP = (
  refId: string,
  otp: string
): Promise<KYCVerification> =>
  apiFetch<KYCVerification>("/tenant/kyc/aadhaar/otp/verify", {
    method: "POST",
    body: JSON.stringify({ ref_id: refId, otp }),
  });

export const initiateDigiLockerKYC = (
  returnUrl?: string
): Promise<DigiLockerInitiateResponse> =>
  apiFetch<DigiLockerInitiateResponse>("/tenant/kyc/initiate", {
    method: "POST",
    body: JSON.stringify(returnUrl ? { return_url: returnUrl } : {}),
  });

export const uploadKYCDocument = (file: File): Promise<KYCVerification> => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<KYCVerification>("/tenant/kyc/upload", {
    method: "POST",
    body: fd,
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

export const getOwnerTenantKYCPhoto = (tenantId: string): Promise<Blob> =>
  apiFetchBlob(`/owner/tenants/${tenantId}/kyc/photo`);
