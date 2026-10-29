"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getCachedUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
  subscribeToAuth,
  type AuthUser,
} from "@/services/auth.service";
import { AUTH_ROUTES, isGuestOnlyPath, isProtectedPath, safeCallbackUrl } from "@/lib/auth/routes";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

// Holds the signed-in user, restores the session on page load from the refresh cookie, and
// redirects: signed-out visitors away from protected pages, signed-in users away from
// login/signup. The backend still verifies a token on every API call.
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser());
  const [status, setStatus] = useState<AuthStatus>(() => (getCachedUser() ? "authenticated" : "loading"));

  useEffect(() => {
    const unsubscribe = subscribeToAuth((next) => {
      setUser(next);
      setStatus(next ? "authenticated" : "unauthenticated");
    });

    if (!getCachedUser()) {
      // A network failure shouldn't look like "signed in", so treat it as signed out.
      refreshSession().catch(() => setStatus("unauthenticated"));
    }
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" && isProtectedPath(pathname)) {
      const here = pathname + window.location.search;
      router.replace(`${AUTH_ROUTES.login}?callbackUrl=${encodeURIComponent(here)}`);
    } else if (status === "authenticated" && isGuestOnlyPath(pathname)) {
      const target = new URLSearchParams(window.location.search).get("callbackUrl");
      router.replace(safeCallbackUrl(target));
    }
  }, [status, pathname, router]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    await loginRequest(credentials);
  }, []);

  const register = useCallback(async (credentials: { email: string; password: string }) => {
    await registerRequest(credentials);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    router.replace("/");
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  // Don't render protected pages (and fire their API calls) until we know who is looking.
  const blocked =
    (isProtectedPath(pathname) && status !== "authenticated") ||
    (isGuestOnlyPath(pathname) && status === "authenticated");

  return (
    <AuthContext.Provider value={value}>
      {blocked ? (
        <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
