import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "firebase/auth";
import type { User, UserRole, AuthTokenPayload } from "@pg/types";
import { getStoredUser, setStoredUser, getInviteCode } from "./storage";
import { getAccessToken, setAccessToken, onAccessTokenChange } from "./tokenStore";
import { exchangeFirebaseToken, refreshSession, logoutSession } from "@/api/auth";
import { scheduleProactiveRefresh, stopProactiveRefresh } from "@/api/client";
import {
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp,
  resetFirebasePhoneAuth,
} from "@/auth/firebasePhone";
import { signInWithGoogle } from "@/auth/firebaseGoogle";
import { firebaseAuth } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { clearServiceWorkerCaches } from "@/lib/session";
import { toE164IndianPhone } from "@/lib/utils";

interface AuthContextType {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  userId: string | null;
  tenantId: string | null;
  isPendingJoin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  justActivated: boolean;
  consumeActivation: () => void;
  triggerActivation: () => void;
  applySession: (rawToken: string, sessionUser: User, payload?: AuthTokenPayload) => void;
  sendPhoneOtp: (phone: string) => Promise<void>;
  confirmPhoneOtp: (otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<"ok" | "needs-phone">;
  reExchangeFirebase: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
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

  const logout = useCallback(() => {
    stopProactiveRefresh();
    logoutSession().catch(() => {});
    queryClient.clear();
    clearServiceWorkerCaches().catch(() => {});
    resetFirebasePhoneAuth();
    signOut(firebaseAuth).catch(() => {});
    setAccessToken(null);
    setStoredUser(null);
    setTokenState(null);
    setUser(null);
    setRole(null);
    setUserId(null);
    setTenantId(null);
    setJustActivated(false);
  }, []);

  const applySession = useCallback((rawToken: string, sessionUser: User, payload?: AuthTokenPayload) => {
    const jwtPayload = payload ?? parseJwt(rawToken);
    const resolvedRole = sessionUser.role ?? jwtPayload?.role;
    const tid = sessionUser.tenant_id || jwtPayload?.tenant_id || null;
    setAccessToken(rawToken);
    setTokenState(rawToken);
    setUser(sessionUser);
    if (isValidRole(resolvedRole)) {
      setRole(resolvedRole);
    }
    setUserId(sessionUser.id || jwtPayload?.user_id || jwtPayload?.sub || null);
    setTenantId(resolvedRole === "tenant" ? tid : null);
    setStoredUser(sessionUser);
    scheduleProactiveRefresh();
    setIsLoading(false);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next: User = { ...prev, ...patch };
      setStoredUser(next);
      return next;
    });
  }, []);

  const evaluateStored = useCallback(async () => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      if (isValidRole(stored.role)) {
        setRole(stored.role);
        setUserId(stored.id || null);
        setTenantId(stored.role === "tenant" ? stored.tenant_id || null : null);
      }
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
    } catch {
      // Refresh cookie absent or expired
    }

    logout();
    setIsLoading(false);
  }, [applySession, logout]);

  useEffect(() => {
    void evaluateStored();
    const handleUnauthorized = () => logout();
    window.addEventListener("pg:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pg:unauthorized", handleUnauthorized);
  }, [evaluateStored, logout]);

  useEffect(() => {
    return onAccessTokenChange((t) => {
      setTokenState(t);
    });
  }, []);

  const completeWithIdToken = async (idToken: string) => {
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
  };

  const handleSendPhoneOtp = async (phone: string) => {
    await sendFirebasePhoneOtp(toE164IndianPhone(phone));
  };

  const handleConfirmPhoneOtp = async (otp: string) => {
    const idToken = await confirmFirebasePhoneOtp(otp);
    await completeWithIdToken(idToken);
  };

  const handleGoogleLogin = async (): Promise<"ok" | "needs-phone"> => {
    const result = await signInWithGoogle();
    if (result.needsPhone) return "needs-phone";
    await completeWithIdToken(result.idToken);
    return "ok";
  };

  const reExchangeFirebase = async () => {
    const current = firebaseAuth.currentUser;
    if (!current) {
      throw new Error("Sign in again to refresh your session");
    }
    const idToken = await current.getIdToken(true);
    await completeWithIdToken(idToken);
  };

  const consumeActivation = useCallback(() => {
    setJustActivated(false);
  }, []);

  const triggerActivation = useCallback(() => {
    setJustActivated(true);
  }, []);

  const isPendingJoin = role === "tenant" && !tenantId;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        userId,
        tenantId,
        isPendingJoin,
        isAuthenticated: !!token && !!role && !isLoading,
        isLoading,
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
      }}
    >
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
