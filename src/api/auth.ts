import { apiFetch, requestTokenRefresh, getLastRefreshError, ApiError } from "./client";
import { getStoredUser, isPendingLogout } from "@/auth/storage";
import { getAccessToken } from "@/auth/tokenStore";
import type { LoginResponse } from "@pg/types";

export const exchangeFirebaseToken = async (
  idToken: string,
  inviteCode?: string
): Promise<LoginResponse> => {
  // Do not overwrite the refresh cookie while a previous logout still needs
  // that cookie to retry server-side session-family revocation.
  if (isPendingLogout()) {
    throw new ApiError(503, "Previous session logout is still being finalized. Reconnect and retry.");
  }
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

export const logoutSession = async (): Promise<{ ok: boolean }> => {
  const result = await apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
  });
  // Some older servers return a 2xx response with ok=false when revocation
  // fails. Treat that as a retryable failure, not a completed logout.
  if (result?.ok !== true) {
    throw new ApiError(503, "Server-side session revocation is still pending.");
  }
  return result;
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
