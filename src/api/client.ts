import { API_BASE } from "@/lib/constants";
import { getStoredLocale, getStoredUser, setStoredUser } from "@/auth/storage";
import { getAccessToken, setAccessToken } from "@/auth/tokenStore";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }
}

let activeRefreshPromise: Promise<string | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleProactiveRefresh(delayMs = 12 * 60 * 1000): void {
  stopProactiveRefresh();
  refreshTimer = setTimeout(async () => {
    await requestTokenRefresh(getAccessToken());
  }, delayMs);
}

export function stopProactiveRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

let lastRefreshError: Error | null = null;

export function getLastRefreshError(): Error | null {
  return lastRefreshError;
}

export async function executeRefresh(failedToken: string | null): Promise<string | null> {
  const currentToken = getAccessToken();
  if (currentToken && currentToken !== failedToken) {
    lastRefreshError = null;
    return currentToken;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      let errorMsg = "Session expired or unauthorized";
      let errorCode: string | undefined;
      try {
        const body = await res.json();
        errorMsg = body.message || body.error || errorMsg;
        if (typeof body.code === "string") errorCode = body.code;
      } catch {
        // ignore non-json errors
      }
      lastRefreshError = new ApiError(res.status, errorMsg, errorCode);

      if (res.status === 401 || res.status === 403) {
        const hadPriorSession = Boolean(currentToken || getStoredUser());
        setAccessToken(null);
        setStoredUser(null);
        stopProactiveRefresh();
        if (hadPriorSession) {
          window.dispatchEvent(
            new CustomEvent("pg:unauthorized", { detail: { reason: "session_ended" } })
          );
        }
      }
      return null;
    }

    const data = await res.json();
    if (data?.token) {
      setAccessToken(data.token);
      if (data.user) {
        setStoredUser(data.user);
      }
      scheduleProactiveRefresh();
      lastRefreshError = null;
      return data.token;
    }
    lastRefreshError = new ApiError(500, "Invalid token response from server");
    return null;
  } catch (err) {
    lastRefreshError = err instanceof Error ? err : new Error(String(err));
    return null;
  }
}

export async function requestTokenRefresh(failedToken: string | null): Promise<string | null> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("pg_token_refresh", async () => {
      return executeRefresh(failedToken);
    });
  }

  if (!activeRefreshPromise) {
    activeRefreshPromise = executeRefresh(failedToken).finally(() => {
      activeRefreshPromise = null;
    });
  }
  return activeRefreshPromise;
}

async function handleResponse<T>(
  res: Response,
  parse: () => Promise<T>,
  opts: { allowSessionClearOn401?: boolean } = { allowSessionClearOn401: true }
): Promise<T> {
  if (res.status === 401) {
    if (opts.allowSessionClearOn401 !== false) {
      const hadPriorSession = Boolean(getAccessToken() || getStoredUser());
      setAccessToken(null);
      setStoredUser(null);
      stopProactiveRefresh();
      if (hadPriorSession) {
        window.dispatchEvent(
          new CustomEvent("pg:unauthorized", { detail: { reason: "session_ended" } })
        );
      }
    }
    let errorMsg = "Session expired or unauthorized";
    let errorCode: string | undefined;
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || errorMsg;
      if (typeof data.code === "string") {
        errorCode = data.code;
      }
    } catch {
      // ignore
    }
    const mapped = mapApiErrorMessage(401, errorMsg);
    throw new ApiError(401, mapped, errorCode);
  }

  if (!res.ok) {
    let errorMsg = "An error occurred";
    let errorCode: string | undefined;
    let details: Record<string, unknown> | undefined;
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || JSON.stringify(data);
      if (typeof data.code === "string") {
        errorCode = data.code;
      }
      if (data && typeof data === "object" && !Array.isArray(data)) {
        details = data as Record<string, unknown>;
      }
    } catch {
      errorMsg = await res.text();
    }
    const mapped = mapApiErrorMessage(res.status, errorMsg);
    if (res.status === 403 && (errorCode === "auth.accessRevoked" || /access revoked/i.test(mapped))) {
      setAccessToken(null);
      setStoredUser(null);
      stopProactiveRefresh();
      window.dispatchEvent(
        new CustomEvent("pg:unauthorized", { detail: { reason: "access_revoked" } })
      );
    }
    if (res.status === 403 && (errorCode === "join.profileRequired" || /complete your profile to continue/i.test(mapped))) {
      window.dispatchEvent(new CustomEvent("pg:waiting-join"));
    }
    throw new ApiError(res.status, mapped, errorCode, details);
  }

  if (res.status === 204) {
    return {} as T;
  }

  try {
    return await parse();
  } catch (err) {
    if (err instanceof SyntaxError) {
      const msg = import.meta.env.DEV
        ? `Server returned an invalid response (expected JSON, received HTML or malformed body). Ensure pg-go is running with the latest routes.`
        : `Server returned an invalid response. Please try again later.`;
      throw new ApiError(res.status, msg);
    }
    throw err;
  }
}

function mapApiErrorMessage(status: number, raw: string): string {
  const text = (raw || "").trim();
  if (status === 503 && /firebase auth not configured/i.test(text)) {
    return "Phone authentication is temporarily unavailable. Please try again later or contact support.";
  }
  if (status === 404 && /no account for phone|Get the PG invite code/i.test(text)) {
    return "Get the PG invite code from your owner, then sign in again.";
  }
  return text || `HTTP ${status}`;
}

function networkFailureMessage(): string {
  return import.meta.env.DEV
    ? `Cannot reach API at ${API_BASE}. Ensure the backend server is running and accessible.`
    : `Unable to connect to server. Please check your network connection and try again.`;
}

function isNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
  }
  return false;
}

function authHeaders(options: RequestInit): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const hasBody = options.body !== undefined && options.body !== null;
  if (!headers["Content-Type"] && hasBody && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const locale = getStoredLocale();
  if (locale && !headers["Accept-Language"]) {
    headers["Accept-Language"] = locale;
  }
  return headers;
}

function resolveUrl(path: string): string {
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE.endsWith("/api") && cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4);
  }
  return `${API_BASE}${cleanPath}`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = resolveUrl(path);
  try {
    const res = await fetch(url, {
      ...options,
      credentials: options.credentials ?? "include",
      headers: authHeaders(options),
    });

    const isAuthEndpoint = path.startsWith("/auth/") || path === "/auth" || path.startsWith("/api/auth/") || path === "/api/auth";
    if (res.status === 401 && !isAuthEndpoint) {
      const originalToken = getAccessToken();
      const hasPriorSession = Boolean(originalToken || getStoredUser());
      if (!hasPriorSession) {
        throw new ApiError(401, "Session expired or unauthorized");
      }
      const newToken = await requestTokenRefresh(originalToken);
      if (newToken) {
        const retryRes = await fetch(url, {
          ...options,
          credentials: options.credentials ?? "include",
          headers: authHeaders(options),
        });
        return await handleResponse(retryRes, () => retryRes.json() as Promise<T>, {
          allowSessionClearOn401: false,
        });
      }
      throw new ApiError(401, "Session expired or unauthorized");
    }

    return await handleResponse(res, () => res.json() as Promise<T>, {
      allowSessionClearOn401: !isAuthEndpoint,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkFailure(err)) throw new ApiError(0, networkFailureMessage());
    throw err;
  }
}

export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const url = resolveUrl(path);
  try {
    const res = await fetch(url, {
      ...options,
      credentials: options.credentials ?? "include",
      headers: authHeaders(options),
    });

    const isAuthEndpoint = path.startsWith("/auth/") || path === "/auth" || path.startsWith("/api/auth/") || path === "/api/auth";
    if (res.status === 401 && !isAuthEndpoint) {
      const originalToken = getAccessToken();
      const newToken = await requestTokenRefresh(originalToken);
      if (newToken) {
        const retryRes = await fetch(url, {
          ...options,
          credentials: options.credentials ?? "include",
          headers: authHeaders(options),
        });
        return await handleResponse(retryRes, () => retryRes.blob(), {
          allowSessionClearOn401: false,
        });
      }
      throw new ApiError(401, "Session expired or unauthorized");
    }

    return await handleResponse(res, () => res.blob(), {
      allowSessionClearOn401: !isAuthEndpoint,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkFailure(err)) throw new ApiError(0, networkFailureMessage());
    throw err;
  }
}

export function unwrapList<T>(data: Record<string, T[]>, key: string): T[] {
  return data[key] ?? [];
}
