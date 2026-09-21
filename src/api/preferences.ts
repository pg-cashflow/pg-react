import { apiFetch } from "./client";
import type {
  SupportedLocale,
  LocaleMetadata,
  LocalesResponse,
  PreferencesResponse,
} from "@pg/types";

export type { LocaleMetadata, LocalesResponse, PreferencesResponse };

export async function getSupportedLocales(): Promise<LocalesResponse> {
  return apiFetch<LocalesResponse>("/api/locales");
}

export async function getMyPreferences(): Promise<PreferencesResponse> {
  return apiFetch<PreferencesResponse>("/api/me/preferences");
}

export async function updateMyPreferences(
  data: { locale: SupportedLocale },
  signal?: AbortSignal
): Promise<PreferencesResponse> {
  return apiFetch<PreferencesResponse>("/api/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(data),
    signal,
  });
}

