import { apiFetch, unwrapList } from "./client";
import type {
  InviteLookup,
  JoinRequest,
  JoinStatus,
  OwnerInvite,
  Paise,
  Tenant,
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
  permanent_address: string;
  current_address: string;
  parent_name: string;
  emergency_phone: string;
  consent: boolean;
  image: File;
}

export const submitJoinProfile = (
  body: JoinProfilePayload
): Promise<{ join: JoinRequest; tenant: Tenant; message: string }> => {
  const form = new FormData();
  form.append("name", body.name);
  form.append("permanent_address", body.permanent_address);
  form.append("current_address", body.current_address);
  form.append("parent_name", body.parent_name);
  form.append("emergency_phone", body.emergency_phone);
  form.append("consent", body.consent ? "true" : "false");
  form.append("image", body.image);
  return apiFetch("/join", { method: "POST", body: form });
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
