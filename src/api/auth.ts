import { apiFetch } from "./client";
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
