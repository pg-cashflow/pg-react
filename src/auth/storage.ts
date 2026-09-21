import type { User } from "@pg/types";

const TOKEN_KEY = "pg_jwt";
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

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User | null): void => {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
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
