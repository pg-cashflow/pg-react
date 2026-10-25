import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { User, UserRole, AuthTokenPayload } from "@pg/types";
import { getStoredUser, setStoredUser, getInviteCode, setInviteCode, isPendingLogout, setPendingLogout, getSessionHint, setSessionHint } from "./storage";
import { getAccessToken, setAccessToken, onAccessTokenChange } from "./tokenStore";
import { exchangeFirebaseToken, refreshSession, logoutSession } from "@/api/auth";
import { scheduleProactiveRefresh, stopProactiveRefresh, ApiError } from "@/api/client";
import { queryClient } from "@/lib/queryClient";
import { clearServiceWorkerCaches } from "@/lib/session";
import { toE164IndianPhone } from "@/lib/utils";

export type SessionStatus = "online" | "degraded" | "anon";

interface AuthContextType {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  userId: string | null;
  tenantId: string | null;
  isPendingJoin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionStatus: SessionStatus;
  isDegraded: boolean;
  justActivated: boolean;
  consumeActivation: () => void;
  triggerActivation: () => void;
  applySession: (rawToken: string, sessionUser: User, payload?: AuthTokenPayload) => void;
  sendPhoneOtp: (phone: string) => Promise<void>;
  confirmPhoneOtp: (otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  reExchangeFirebase: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  clearLocalSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function parseJwt(token: string): AuthTokenPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Failed to parse JWT payload", err);
    return null;
  }
}

function isValidRole(role: unknown): role is UserRole {
  return role === "owner" || role === "tenant" || role === "manager";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialStored = getStoredUser();
  const [token, setTokenState] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<User | null>(() => initialStored);
  const [role, setRole] = useState<UserRole | null>(() =>
    initialStored && isValidRole(initialStored.role) ? initialStored.role : null
  );
  const [userId, setUserId] = useState<string | null>(() => initialStored?.id || null);
  const [tenantId, setTenantId] = useState<string | null>(() =>
    initialStored?.role === "tenant" ? initialStored.tenant_id || null : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [justActivated, setJustActivated] = useState<boolean>(false);

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(() =>
    initialStored ? "degraded" : "anon"
  );
  const sessionStatusRef = useRef<SessionStatus>(sessionStatus);
  sessionStatusRef.current = sessionStatus;
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const endSession = useCallback((callServerLogout = false) => {
    stopProactiveRefresh();
    clearRetryTimer();
    queryClient.clear();
    clearServiceWorkerCaches().catch(() => {});
    import("@/auth/firebasePhone").then((m) => m.resetFirebasePhoneAuth()).catch(() => {});
    import("@/lib/firebase")
      .then(({ firebaseAuth }) =>
        import("firebase/auth").then(({ signOut }) => signOut(firebaseAuth))
      )
      .catch(() => {});
    setAccessToken(null);
    setStoredUser(null);
    setTokenState(null);
    setUser(null);
    setRole(null);
    setUserId(null);
    setTenantId(null);
    setJustActivated(false);
    setSessionStatus("anon");
    setSessionHint(null);
    setInviteCode("");

    if (callServerLogout) {
      setPendingLogout(true);
      logoutSession()
        .then(() => setPendingLogout(false))
        .catch(() => {
          // Retry will occur on reconnect
        });
    }
  }, [clearRetryTimer]);

  const clearLocalSession = useCallback(() => {
    endSession(false);
  }, [endSession]);

  const logout = useCallback(() => {
    endSession(true);
  }, [endSession]);

  const applySession = useCallback((rawToken: string, sessionUser: User, payload?: AuthTokenPayload) => {
    clearRetryTimer();
    const jwtPayload = payload ?? parseJwt(rawToken);
    const resolvedRole = sessionUser.role ?? jwtPayload?.role;
    const tid = sessionUser.tenant_id || jwtPayload?.tenant_id || null;
    setAccessToken(rawToken);
    setTokenState(rawToken);
    setUser(sessionUser);
    if (isValidRole(resolvedRole)) {
      setRole(resolvedRole);
      setSessionHint({ hasSession: true, role: resolvedRole });
    }
    setUserId(sessionUser.id || jwtPayload?.user_id || jwtPayload?.sub || null);
    setTenantId(resolvedRole === "tenant" ? tid : null);
    setStoredUser(sessionUser);
    setSessionStatus("online");
    scheduleProactiveRefresh();
    setIsLoading(false);
  }, [clearRetryTimer]);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next: User = { ...prev, ...patch };
      setStoredUser(next);
      return next;
    });
  }, []);

  const evaluateStored = useCallback(async () => {
    if (isPendingLogout()) {
      endSession(true);
      setIsLoading(false);
      return;
    }

    const stored = getStoredUser();
    const hint = getSessionHint();

    // Anonymous visitor with no prior session: render public routes immediately without waiting on refresh 401
    if (!stored && !hint?.hasSession) {
      setIsLoading(false);
      setSessionStatus("anon");
      return;
    }

    if (stored) {
      setUser(stored);
      if (isValidRole(stored.role)) {
        setRole(stored.role);
        setUserId(stored.id || null);
        setTenantId(stored.role === "tenant" ? stored.tenant_id || null : null);
        setSessionStatus("degraded");
      }
    } else if (hint?.role && isValidRole(hint.role)) {
      setRole(hint.role);
      setSessionStatus("degraded");
    }

    try {
      const res = await refreshSession();
      if (res?.token) {
        const freshPayload = parseJwt(res.token);
        if (freshPayload && isValidRole(res.user?.role ?? freshPayload.role)) {
          applySession(res.token, res.user, freshPayload);
          return;
        }
      }
    } catch (err: unknown) {
      // Differentiate transient errors from terminal auth errors
      const hasPriorSession = Boolean(stored || hint?.hasSession);
      if (err instanceof ApiError) {
        if (err.status === 429 || err.status >= 500) {
          // Transient failure (rate limit or server unavailable).
          // Retain degraded session from stored hints and retry with backoff.
          if (hasPriorSession) {
            setSessionStatus("degraded");
            setIsLoading(false);
            clearRetryTimer();
            retryTimeoutRef.current = setTimeout(() => {
              void evaluateStored();
            }, 10000);
            return;
          }
        }
      } else if (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message)) {
        // Network offline: retain session without revoking
        if (hasPriorSession) {
          setSessionStatus("degraded");
          setIsLoading(false);
          return;
        }
      }

      // Terminal auth error (401, 403, or invalid refresh cookie):
      if (stored) {
        clearLocalSession();
      } else {
        setSessionStatus("anon");
      }
    }

    setIsLoading(false);
  }, [applySession, clearLocalSession, endSession, clearRetryTimer]);

  useEffect(() => {
    void evaluateStored();

    const handleUnauthorized = () => clearLocalSession();
    const handleOnline = () => {
      if (isPendingLogout()) {
        logoutSession().then(() => setPendingLogout(false)).catch(() => {});
      } else if (sessionStatusRef.current !== "online" || !getAccessToken()) {
        void evaluateStored();
      }
    };

    window.addEventListener("pg:unauthorized", handleUnauthorized);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("pg:unauthorized", handleUnauthorized);
      window.removeEventListener("online", handleOnline);
      clearRetryTimer();
    };
  }, [evaluateStored, clearLocalSession, clearRetryTimer]);

  useEffect(() => {
    return onAccessTokenChange((t) => {
      setTokenState(t);
    });
  }, []);

  const completeWithIdToken = useCallback(async (idToken: string) => {
    const priorUser = getStoredUser();
    const isFirstEntry = !priorUser;
    const res = await exchangeFirebaseToken(idToken, getInviteCode() || undefined);
    const payload = parseJwt(res.token);
    if (!payload || !isValidRole(res.user.role)) {
      throw new Error("Invalid session from server");
    }
    if (isFirstEntry && (res.user.role === "owner" || res.user.role === "manager")) {
      setJustActivated(true);
    }
    applySession(res.token, res.user, payload);
  }, [applySession]);

  const handleSendPhoneOtp = useCallback(async (phone: string) => {
    const { sendFirebasePhoneOtp } = await import("@/auth/firebasePhone");
    await sendFirebasePhoneOtp(toE164IndianPhone(phone));
  }, []);

  const handleConfirmPhoneOtp = useCallback(async (otp: string) => {
    const { confirmFirebasePhoneOtp } = await import("@/auth/firebasePhone");
    const idToken = await confirmFirebasePhoneOtp(otp);
    await completeWithIdToken(idToken);
  }, [completeWithIdToken]);

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    const { signInWithGoogle } = await import("@/auth/firebaseGoogle");
    const idToken = await signInWithGoogle();
    await completeWithIdToken(idToken);
  }, [completeWithIdToken]);

  const reExchangeFirebase = useCallback(async () => {
    const { firebaseAuth } = await import("@/lib/firebase");
    const current = firebaseAuth.currentUser;
    if (!current) {
      throw new Error("Sign in again to refresh your session");
    }
    const idToken = await current.getIdToken(true);
    await completeWithIdToken(idToken);
  }, [completeWithIdToken]);

  const consumeActivation = useCallback(() => {
    setJustActivated(false);
  }, []);

  const triggerActivation = useCallback(() => {
    setJustActivated(true);
  }, []);

  const isPendingJoin = role === "tenant" && !tenantId;
  const isDegraded = sessionStatus === "degraded";
  const isAuthenticated = !isLoading && !!role && (!!token || isDegraded);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      token,
      user,
      role,
      userId,
      tenantId,
      isPendingJoin,
      isAuthenticated,
      isLoading,
      sessionStatus,
      isDegraded,
      justActivated,
      consumeActivation,
      triggerActivation,
      applySession,
      sendPhoneOtp: handleSendPhoneOtp,
      confirmPhoneOtp: handleConfirmPhoneOtp,
      loginWithGoogle: handleGoogleLogin,
      reExchangeFirebase,
      updateUser,
      logout,
      clearLocalSession,
    }),
    [
      token,
      user,
      role,
      userId,
      tenantId,
      isPendingJoin,
      isAuthenticated,
      isLoading,
      sessionStatus,
      isDegraded,
      justActivated,
      consumeActivation,
      triggerActivation,
      applySession,
      handleSendPhoneOtp,
      handleConfirmPhoneOtp,
      handleGoogleLogin,
      reExchangeFirebase,
      updateUser,
      logout,
      clearLocalSession,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
