import { apiFetch } from "./client";
import type {
  SupportedLocale,
  SupportedTheme,
  LocaleMetadata,
  LocalesResponse,
  PreferencesResponse,
} from "@pg/types";

export type { LocaleMetadata, LocalesResponse, PreferencesResponse };

export async function getSupportedLocales(): Promise<LocalesResponse> {
  return apiFetch<LocalesResponse>("/locales");
}

export async function getMyPreferences(): Promise<PreferencesResponse> {
  return apiFetch<PreferencesResponse>("/me/preferences");
}

export async function updateMyPreferences(
  data: { locale?: SupportedLocale; theme?: SupportedTheme },
  signal?: AbortSignal
): Promise<PreferencesResponse> {
  return apiFetch<PreferencesResponse>("/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(data),
    signal,
  });
}
