let accessToken: string | null = null;
const listeners = new Set<(t: string | null) => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => {
    try {
      listener(token);
    } catch {
      // Do not let one listener failure break token assignment
    }
  });
}

export function onAccessTokenChange(fn: (t: string | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
