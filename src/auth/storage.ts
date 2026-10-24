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

const PENDING_LOGOUT_KEY = "pg_pending_logout";

export const getInviteCode = (): string => {
  try {
    return localStorage.getItem(INVITE_KEY) || "";
  } catch {
    return "";
  }
};

export const setInviteCode = (code: string): void => {
  try {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      localStorage.removeItem(INVITE_KEY);
      return;
    }
    localStorage.setItem(INVITE_KEY, trimmed);
  } catch {
    // storage disabled or quota exceeded
  }
};

export const isPendingLogout = (): boolean => {
  try {
    return localStorage.getItem(PENDING_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
};

export const setPendingLogout = (pending: boolean): void => {
  try {
    if (pending) {
      localStorage.setItem(PENDING_LOGOUT_KEY, "1");
    } else {
      localStorage.removeItem(PENDING_LOGOUT_KEY);
    }
  } catch {
    // ignore
  }
};

const SESSION_HINT_KEY = "pg_has_session";

export interface SessionHint {
  hasSession: boolean;
  role?: string;
}

export const getSessionHint = (): SessionHint | null => {
  try {
    const raw = localStorage.getItem(SESSION_HINT_KEY);
    return raw ? (JSON.parse(raw) as SessionHint) : null;
  } catch {
    return null;
  }
};

export const setSessionHint = (hint: SessionHint | null): void => {
  try {
    if (!hint) {
      localStorage.removeItem(SESSION_HINT_KEY);
      return;
    }
    localStorage.setItem(SESSION_HINT_KEY, JSON.stringify(hint));
  } catch {
    // ignore
  }
};


