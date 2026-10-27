let accessToken: string | null = null;
const listeners = new Set<(t: string | null) => void>();

let authSyncChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    authSyncChannel = new BroadcastChannel("pg_token_sync");
    authSyncChannel.onmessage = (event) => {
      if (event.data?.type === "TOKEN_UPDATED") {
        const token = event.data.token ?? null;
        if (token !== accessToken) {
          accessToken = token;
          notifyListeners(token);
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

export function setAccessToken(token: string | null, broadcast = true): void {
  accessToken = token;
  notifyListeners(token);
  if (broadcast && authSyncChannel) {
    try {
      authSyncChannel.postMessage({ type: "TOKEN_UPDATED", token });
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
