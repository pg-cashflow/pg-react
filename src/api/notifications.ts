import { apiFetch } from "./client";

export interface NotificationItem {
  id: string;
  source_event_id?: number | null;
  recipient_id: string;
  property_id: string;
  type: string;
  title: string;
  deep_link: string;
  is_action_required: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
  next_cursor?: string;
}

export const getNotifications = async (
  cursor?: string,
  limit?: number
): Promise<NotificationsResponse> => {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", limit.toString());
  const qs = params.toString();
  return apiFetch<NotificationsResponse>(`/notifications${qs ? `?${qs}` : ""}`);
};

export const markNotificationRead = (id: string): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });

export const markAllNotificationsRead = (): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>("/notifications/read-all", {
    method: "PATCH",
  });
