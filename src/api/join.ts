import { apiFetch, unwrapList } from "./client";
import type {
  InviteLookup,
  JoinRequest,
  JoinStatus,
  OwnerInvite,
  Paise,
  Tenant,
  User,
} from "@pg/types";

export const lookupInvite = (code: string): Promise<InviteLookup> =>
  apiFetch<InviteLookup>(`/join/invite/${encodeURIComponent(code.trim())}`);

export const getJoinMe = (): Promise<{
  join: JoinRequest;
  user: { id: string; role: string; phone: string; property_id?: string };
  message: string;
}> => apiFetch("/join/me");

export interface JoinProfilePayload {
  name: string;
  phone?: string;
  permanent_address: string;
  current_address: string;
  parent_name: string;
  guardian_relation?: string;
  emergency_phone: string;
  kyc_method?: string;
  aadhaar_last4?: string;
  consent: boolean;
  image?: File | null;
}

export interface SubmitJoinProfileResult {
  join: JoinRequest;
  tenant: Tenant;
  token?: string;
  user?: User;
  message: string;
}

export const submitJoinProfile = (
  body: JoinProfilePayload
): Promise<SubmitJoinProfileResult> => {
  const form = new FormData();
  form.append("name", body.name);
  if (body.phone) {
    form.append("phone", body.phone);
  }
  form.append("permanent_address", body.permanent_address);
  form.append("current_address", body.current_address);
  form.append("parent_name", body.parent_name);
  if (body.guardian_relation) {
    form.append("guardian_relation", body.guardian_relation);
  }
  form.append("emergency_phone", body.emergency_phone);
  if (body.kyc_method) {
    form.append("kyc_method", body.kyc_method);
  }
  if (body.aadhaar_last4) {
    form.append("aadhaar_last4", body.aadhaar_last4);
  }
  form.append("consent", body.consent ? "true" : "false");
  if (body.image) {
    form.append("image", body.image);
  }
  return apiFetch<SubmitJoinProfileResult>("/join", { method: "POST", body: form });
};

export const getOwnerInvite = (): Promise<OwnerInvite> => apiFetch("/owner/invite");

export const rotateInvite = (): Promise<{ invite_code: string }> =>
  apiFetch("/owner/invite/rotate", { method: "POST", body: "{}" });

export const getJoinRequests = async (status?: JoinStatus): Promise<JoinRequest[]> => {
  const qs = status ? `?status=${status}` : "";
  const data = await apiFetch<{ join_requests: JoinRequest[] }>(`/owner/join-requests${qs}`);
  return unwrapList(data, "join_requests");
};

export interface ActivateJoinPayload {
  room_number?: string;
  rent_amount: Paise;
  due_day: number;
  deposit_amount?: Paise;
  notice_period_days?: number;
}

export const activateJoin = (id: string, body: ActivateJoinPayload): Promise<Tenant> =>
  apiFetch(`/owner/join-requests/${id}/activate`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const rejectJoin = (id: string): Promise<{ ok: boolean }> =>
  apiFetch(`/owner/join-requests/${id}/reject`, { method: "POST", body: "{}" });

export const getTenantIdPhotoUrl = (tenantId: string): string =>
  `/owner/tenants/${tenantId}/id-photo`;
