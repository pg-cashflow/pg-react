import { apiFetch } from "@/api/client";

export type SearchResultType =
  | "tenant"
  | "due"
  | "payment"
  | "payment_report"
  | "join_request"
  | "event"
  | "inspection"
  | "hazard"
  | "violation"
  | "document";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export interface SearchResponse {
  q: string;
  mode: "lexical" | "hybrid";
  results: SearchResult[];
}

export async function searchGlobal(q: string, limit = 20, mode?: "lexical" | "hybrid"): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (mode) params.set("mode", mode);
  return apiFetch<SearchResponse>(`/search?${params.toString()}`);
}
