import { apiFetch, unwrapList } from "./client";
import type { Property } from "@pg/types";

export const getProperties = async (): Promise<Property[]> => {
  const data = await apiFetch<{ properties: Property[] }>("/owner/properties");
  return unwrapList(data, "properties");
};
