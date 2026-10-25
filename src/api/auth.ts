import { apiFetch, requestTokenRefresh, getLastRefreshError, ApiError } from "./client";
import { getStoredUser } from "@/auth/storage";
import { getAccessToken } from "@/auth/tokenStore";
import type { LoginResponse } from "@pg/types";

export const exchangeFirebaseToken = (
  idToken: string,
  inviteCode?: string
): Promise<LoginResponse> => {
  const body: { id_token: string; invite_code?: string } = { id_token: idToken };
  const code = inviteCode?.trim();
  if (code) body.invite_code = code;
  return apiFetch<LoginResponse>("/auth/firebase", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const refreshSession = async (): Promise<LoginResponse> => {
  const token = await requestTokenRefresh(getAccessToken());
  if (!token) {
    const err = getLastRefreshError();
    if (err) throw err;
    throw new ApiError(401, "Session expired or unauthorized");
  }
  const user = getStoredUser();
  if (!user) {
    throw new ApiError(401, "User profile not available");
  }
  return { token, user };
};

export const logoutSession = (): Promise<{ ok: boolean }> => {
  return apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
  });
};

export interface ActiveSession {
  id: string;
  device_label: string;
  user_agent: string;
  ip_address: string;
  last_seen: string;
  created_at: string;
  is_current: boolean;
}

export const getActiveSessions = (): Promise<{ sessions: ActiveSession[] }> => {
  return apiFetch<{ sessions: ActiveSession[] }>("/auth/sessions");
};

export const deleteSession = (id: string): Promise<{ ok: boolean }> => {
  return apiFetch<{ ok: boolean }>(`/auth/sessions/${id}`, {
    method: "DELETE",
  });
};

export const revokeAllSessions = (): Promise<{ ok: boolean }> => {
  return apiFetch<{ ok: boolean }>("/auth/revoke-sessions", {
    method: "POST",
  });
};
