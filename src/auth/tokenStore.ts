let accessToken: string | null = null;
let accessTokenRevision = 0;
const listeners = new Set<(t: string | null) => void>();

let authSyncChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    authSyncChannel = new BroadcastChannel("pg_token_sync");
    authSyncChannel.onmessage = (event) => {
      if (event.data?.type === "SESSION_ENDED") {
        if (accessToken !== null) {
          accessToken = null;
          accessTokenRevision++;
          notifyListeners(null);
        }
      } else if (event.data?.type === "SESSION_ACTIVE" || event.data?.type === "REFRESH_REQUIRED") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pg:session_changed"));
        }
      }
    };
  } catch {
    // BroadcastChannel blocked or unavailable in restrictive contexts
  }
}

function notifyListeners(token: string | null): void {
  listeners.forEach((listener) => {
    try {
      listener(token);
    } catch {
      // Do not let one listener failure break token assignment
    }
  });
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Includes explicit clears of an already-empty token, so logout also invalidates
// a refresh that started while restoring a cookie session.
export function getAccessTokenRevision(): number {
  return accessTokenRevision;
}

export function setAccessToken(token: string | null, broadcast = true): void {
  accessToken = token;
  accessTokenRevision++;
  notifyListeners(token);
  if (broadcast && authSyncChannel) {
    try {
      if (token) {
        authSyncChannel.postMessage({ type: "SESSION_ACTIVE" });
      } else {
        authSyncChannel.postMessage({ type: "SESSION_ENDED" });
      }
    } catch {
      // Ignore broadcast failures
    }
  }
}

export function onAccessTokenChange(fn: (t: string | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
