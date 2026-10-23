import { API_BASE } from "@/lib/constants";
import { getStoredLocale, getStoredUser, setStoredUser } from "@/auth/storage";
import { getAccessToken, setAccessToken } from "@/auth/tokenStore";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

let activeRefreshPromise: Promise<string | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export async function checkBiometricGate(): Promise<boolean> {
  if (typeof window !== "undefined") {
    const gate = (window as unknown as { pgBiometricGate?: () => Promise<boolean> }).pgBiometricGate;
    if (typeof gate === "function") {
      try {
        return await gate();
      } catch {
        return false;
      }
    }
  }
  return true;
}

export function scheduleProactiveRefresh(delayMs = 12 * 60 * 1000): void {
  stopProactiveRefresh();
  refreshTimer = setTimeout(async () => {
    const ok = await checkBiometricGate();
    if (!ok) {
      setAccessToken(null);
      setStoredUser(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pg:unauthorized", { detail: { reason: "biometric_failed" } })
        );
      }
      return;
    }
    await requestTokenRefresh(getAccessToken());
  }, delayMs);
}

export function stopProactiveRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export async function executeRefresh(failedToken: string | null): Promise<string | null> {
  const currentToken = getAccessToken();
  if (currentToken && currentToken !== failedToken) {
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
      return data.token;
    }
    return null;
  } catch {
    // network or other transient failure: keep token and retry later
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
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || JSON.stringify(data);
      if (typeof data.code === "string") {
        errorCode = data.code;
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
    throw new ApiError(res.status, mapped, errorCode);
  }

  if (res.status === 204) {
    return {} as T;
  }

  try {
    return await parse();
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ApiError(
        res.status,
        `Server returned an invalid response (expected JSON, received HTML or malformed body). Ensure pg-go is running with the latest routes.`
      );
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

function isNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
  }
  return false;
}

function networkFailureMessage(): string {
  return `Cannot reach API at ${API_BASE}. Start pg-go on :8080, open the PWA at http://127.0.0.1:5173 (not a mismatched localhost origin), and allow that origin in CORS_ALLOWED_ORIGINS.`;
}

function authHeaders(options: RequestInit): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
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
