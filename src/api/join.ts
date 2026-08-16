import { apiFetch, unwrapList } from "./client";
import type {
  AadhaarPreview,
  InviteLookup,
  JoinRequest,
  JoinStatus,
  OwnerInvite,
  Paise,
  Tenant,
} from "@pg/types";

export const lookupInvite = (code: string): Promise<InviteLookup> =>
  apiFetch<InviteLookup>(`/join/invite/${encodeURIComponent(code.trim())}`);

export const getJoinMe = (): Promise<{ join: JoinRequest; user: { id: string; role: string; phone: string; property_id?: string }; message: string }> =>
  apiFetch("/join/me");

export interface JoinProfilePayload {
  name?: string;
  qr_payload?: string;
  uid_last4?: string;
  consent: boolean;
  confirm?: boolean;
  aadhaar_name?: string;
}

export const submitJoinProfile = (
  body: JoinProfilePayload
): Promise<{ join?: JoinRequest; aadhaar?: AadhaarPreview; needs_confirm?: boolean }> =>
  apiFetch("/join", { method: "POST", body: JSON.stringify(body) });

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
