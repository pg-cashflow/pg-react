import { apiFetch, unwrapList } from "./client";
import type {
  PropertyOccupancyResponse,
  SlotInvite,
  SlotInviteStatus,
} from "@pg/types";

export interface CreateSlotInvitePayload {
  floor_id: string;
  room_id: string;
  rent_paise: number;
  deposit_paise: number;
  due_day: number;
  allow_over_capacity?: boolean;
  reason?: string;
}

export const getOwnerOccupancy = (): Promise<PropertyOccupancyResponse> =>
  apiFetch<PropertyOccupancyResponse>("/owner/occupancy");

export const getSlotInvites = async (status?: SlotInviteStatus): Promise<SlotInvite[]> => {
  const qs = status ? `?status=${status}` : "";
  const data = await apiFetch<{ invites: SlotInvite[] }>(`/owner/slot-invites${qs}`);
  return unwrapList(data, "invites");
};

export const createSlotInvite = (payload: CreateSlotInvitePayload): Promise<{ invite: SlotInvite }> =>
  apiFetch<{ invite: SlotInvite }>("/owner/slot-invites", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const revokeSlotInvite = (id: string): Promise<{ ok: boolean }> =>
  apiFetch(`/owner/slot-invites/${id}/revoke`, {
    method: "POST",
    body: "{}",
  });
