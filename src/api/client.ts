import { API_BASE } from "@/lib/constants";
import { getToken, clearToken, getStoredLocale } from "@/auth/storage";

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
    if (res.status === 403 && /access revoked/i.test(mapped)) {
      clearToken();
      window.dispatchEvent(new CustomEvent("pg:unauthorized"));
    }
    if (res.status === 403 && /complete your profile to continue/i.test(mapped)) {
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
    return "Backend Firebase Admin is not loaded. Place the service-account JSON at pg-go/secrets (GOOGLE_APPLICATION_CREDENTIALS), restart the Go server, and confirm the log says firebase phone auth enabled.";
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
      headers: authHeaders(options),
    });
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
      headers: authHeaders(options),
    });
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
