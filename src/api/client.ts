import { API_BASE } from "@/lib/constants";
import { getToken, setToken, clearToken, getStoredLocale, setStoredUser } from "@/auth/storage";

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

async function executeRefresh(failedToken: string | null): Promise<string | null> {
  const currentToken = getToken();
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
      clearToken();
      window.dispatchEvent(new CustomEvent("pg:unauthorized"));
      return null;
    }

    const data = await res.json();
    if (data?.token) {
      setToken(data.token);
      if (data.user) {
        setStoredUser(data.user);
      }
      return data.token;
    }
  } catch {
    // network or other failure
  }

  clearToken();
  window.dispatchEvent(new CustomEvent("pg:unauthorized"));
  return null;
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

async function handleResponse<T>(res: Response, parse: () => Promise<T>): Promise<T> {
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent("pg:unauthorized"));
    throw new ApiError(401, "Session expired or unauthorized");
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
      clearToken();
      window.dispatchEvent(new CustomEvent("pg:unauthorized"));
    }
    if (res.status === 403 && (errorCode === "join.profileRequired" || /complete your profile to continue/i.test(mapped))) {
      window.dispatchEvent(new CustomEvent("pg:waiting-join"));
    }
    throw new ApiError(res.status, mapped, errorCode);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return parse();
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
  const token = getToken();
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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: options.credentials ?? "include",
      headers: authHeaders(options),
    });

    const isAuthEndpoint = path.startsWith("/auth/") || path === "/auth";
    if (res.status === 401 && !isAuthEndpoint) {
      const originalToken = getToken();
      const newToken = await requestTokenRefresh(originalToken);
      if (newToken) {
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          credentials: options.credentials ?? "include",
          headers: authHeaders(options),
        });
        return await handleResponse(retryRes, () => retryRes.json() as Promise<T>);
      }
    }

    return await handleResponse(res, () => res.json() as Promise<T>);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkFailure(err)) throw new ApiError(0, networkFailureMessage());
    throw err;
  }
}

export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: options.credentials ?? "include",
      headers: authHeaders(options),
    });

    const isAuthEndpoint = path.startsWith("/auth/") || path === "/auth";
    if (res.status === 401 && !isAuthEndpoint) {
      const originalToken = getToken();
      const newToken = await requestTokenRefresh(originalToken);
      if (newToken) {
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          credentials: options.credentials ?? "include",
          headers: authHeaders(options),
        });
        return await handleResponse(retryRes, () => retryRes.blob());
      }
    }

    return await handleResponse(res, () => res.blob());
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkFailure(err)) throw new ApiError(0, networkFailureMessage());
    throw err;
  }
}

export function unwrapList<T>(data: Record<string, T[]>, key: string): T[] {
  return data[key] ?? [];
}
