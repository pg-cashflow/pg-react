import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "firebase/auth";
import type { User, UserRole, AuthTokenPayload } from "@pg/types";
import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  getInviteCode,
} from "./storage";
import { exchangeFirebaseToken } from "@/api/auth";
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
  sendPhoneOtp: (phone: string) => Promise<void>;
  confirmPhoneOtp: (otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<"ok" | "needs-phone">;
  reExchangeFirebase: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): AuthTokenPayload | null {
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
  return role === "owner" || role === "tenant";
}

function isTokenExpired(payload: AuthTokenPayload): boolean {
  if (typeof payload.exp !== "number" || payload.exp <= 0) {
    return true;
  }
  return payload.exp * 1000 < Date.now();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    queryClient.clear();
    clearServiceWorkerCaches().catch(() => {});
    resetFirebasePhoneAuth();
    signOut(firebaseAuth).catch(() => {});
    clearToken();
    setStoredUser(null);
    setTokenState(null);
    setUser(null);
    setRole(null);
    setUserId(null);
    setTenantId(null);
  }, []);

  const applySession = useCallback((rawToken: string, sessionUser: User, payload: AuthTokenPayload) => {
    const resolvedRole = sessionUser.role;
    const tid = sessionUser.tenant_id || payload.tenant_id || null;
    setTokenState(rawToken);
    setUser(sessionUser);
    setRole(resolvedRole);
    setUserId(sessionUser.id || payload.user_id || payload.sub || null);
    setTenantId(resolvedRole === "tenant" ? tid : null);
    setStoredUser(sessionUser);
    setIsLoading(false);
  }, []);

  const evaluateStored = useCallback(() => {
    const rawToken = getToken();
    const stored = getStoredUser();
    if (!rawToken) {
      logout();
      setIsLoading(false);
      return;
    }
    const payload = parseJwt(rawToken);
    if (!payload || isTokenExpired(payload) || !isValidRole(stored?.role ?? payload.role)) {
      logout();
      setIsLoading(false);
      return;
    }
    const sessionUser: User = stored ?? {
      id: payload.user_id ?? payload.sub,
      phone: "",
      role: payload.role,
      tenant_id: payload.tenant_id,
      property_id: payload.property_id,
    };
    applySession(rawToken, sessionUser, payload);
  }, [applySession, logout]);

  useEffect(() => {
    evaluateStored();
    const handleUnauthorized = () => logout();
    window.addEventListener("pg:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pg:unauthorized", handleUnauthorized);
  }, [evaluateStored, logout]);

  const completeWithIdToken = async (idToken: string) => {
    const res = await exchangeFirebaseToken(idToken, getInviteCode() || undefined);
    setToken(res.token);
    const payload = parseJwt(res.token);
    if (!payload || !isValidRole(res.user.role)) {
      throw new Error("Invalid session from server");
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
        sendPhoneOtp: handleSendPhoneOtp,
        confirmPhoneOtp: handleConfirmPhoneOtp,
        loginWithGoogle: handleGoogleLogin,
        reExchangeFirebase,
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
