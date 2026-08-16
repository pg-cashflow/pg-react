import { apiFetch, unwrapList } from "./client";
import type { Event } from "@pg/types";

export const getEvents = async (): Promise<Event[]> => {
  const data = await apiFetch<{ events: Event[] }>("/owner/events");
  return unwrapList(data, "events");
};
