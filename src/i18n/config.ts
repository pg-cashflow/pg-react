import type { SupportedLocale } from "@pg/types";

export interface LocaleOption {
  code: SupportedLocale;
  name: string;
  nativeName: string;
}

export const DEFAULT_LOCALE: SupportedLocale = "en-IN";

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "en-IN", name: "English", nativeName: "English" },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ்" },
  { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ" },
];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.some((l) => l.code === locale);
}
