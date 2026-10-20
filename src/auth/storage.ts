import type { User } from "@pg/types";

const USER_KEY = "pg_user";
const INVITE_KEY = "pg_invite";
const LOCALE_KEY = "pg_locale";

export const getStoredLocale = (): string => {
  try {
    return localStorage.getItem(LOCALE_KEY) || "en-IN";
  } catch {
    return "en-IN";
  }
};

export const setStoredLocale = (locale: string): void => {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
};

export const getStoredUser = (): User | null => {
  try {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(USER_KEY);
    } catch {
      // sessionStorage unavailable
    }
    if (!raw) {
      try {
        raw = localStorage.getItem(USER_KEY);
        if (raw) {
          localStorage.removeItem(USER_KEY);
          try {
            sessionStorage.setItem(USER_KEY, raw);
          } catch {
            // ignore
          }
        }
      } catch {
        // localStorage unavailable
      }
    }
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User | null): void => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  try {
    if (!user) {
      sessionStorage.removeItem(USER_KEY);
      return;
    }
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
};

export const getInviteCode = (): string => localStorage.getItem(INVITE_KEY) || "";

export const setInviteCode = (code: string): void => {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    localStorage.removeItem(INVITE_KEY);
    return;
  }
  localStorage.setItem(INVITE_KEY, trimmed);
};
