let accessToken: string | null = null;
let accessTokenRevision = 0;
const listeners = new Set<(t: string | null) => void>();

export function handleSyncMessage(event: { data?: unknown }): void {
  if (!event || typeof event.data !== "object" || event.data === null) {
    return;
  }
  const type = (event.data as { type?: unknown }).type;
  if (typeof type !== "string") {
    return;
  }
  if (type === "SESSION_ENDED") {
    if (accessToken !== null) {
      accessToken = null;
      accessTokenRevision++;
      notifyListeners(null);
    }
  } else if (type === "SESSION_ACTIVE" || type === "REFRESH_REQUIRED") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pg:session_changed"));
    }
  }
}

let authSyncChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    authSyncChannel = new BroadcastChannel("pg_token_sync");
    authSyncChannel.onmessage = handleSyncMessage;
  } catch {
    // BroadcastChannel blocked or unavailable in restrictive contexts
  }
}

export function getAuthSyncChannelForTest(): BroadcastChannel | null {
  return authSyncChannel;
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
