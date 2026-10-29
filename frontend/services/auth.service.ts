"use client";
import axios from "axios";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

type SessionResponse = { user: AuthUser; accessToken: string; expiresIn: number };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
  }
}


const url = process.env.NEXT_PUBLIC_BACKEND_URL;


const toError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      const reason = error.code === "ECONNABORTED" ? "did not respond in time" : "could not be reached";
      return new ApiError(`The server ${reason}. Please try again.`);
    }
    return new ApiError(
      error.response.data?.message ?? error.message,
      error.response.status,
      error.response.data?.code,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
};

// withCredentials lets the browser store and send the refresh-token cookie cross-origin.
const request = async <T>(method: "GET" | "POST", path: string, data?: unknown) => {
  try {
    const response = await axios.request<T>({
      url: `${url}${path}`,
      method,
      data,
      withCredentials: true,
      timeout: 60_000,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw toError(error);
  }
};

// ---------------------------------------------------------------------------
// In-memory session state
// ---------------------------------------------------------------------------

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let currentUser: AuthUser | null = null;
let refreshInFlight: Promise<AuthUser | null> | null = null;

type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();

export const subscribeToAuth = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setSession = (session: SessionResponse | null) => {
  accessToken = session?.accessToken ?? null;
  accessTokenExpiresAt = session ? Date.now() + session.expiresIn * 1000 : 0;
  currentUser = session?.user ?? null;
  listeners.forEach((listener) => listener(currentUser));
};

export const getCachedUser = () => currentUser;

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export async function login(credentials: { email: string; password: string }): Promise<AuthUser> {
  const session = await request<SessionResponse>("POST", "/auth/login", credentials);
  setSession(session);
  return session.user;
}

export async function register(credentials: { email: string; password: string; name?: string }): Promise<AuthUser> {
  const session = await request<SessionResponse>("POST", "/auth/register", credentials);
  setSession(session);
  return session.user;
}

export async function logout(): Promise<void> {
  try {
    await request("POST", "/auth/logout");
  } finally {
    // Signed out locally even if the request failed (e.g. offline).
    setSession(null);
  }
}

export function refreshSession(): Promise<AuthUser | null> {
  refreshInFlight ??= request<SessionResponse>("POST", "/auth/refresh")
    .then((session) => {
      setSession(session);
      return session.user;
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        return null;
      }
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = await getAccessToken();
  if (!token) throw new ApiError("Not signed in", 401, "UNAUTHENTICATED");
  return (await request<{ user: AuthUser }>("GET", "/auth/me", undefined)).user;
}

// ---------------------------------------------------------------------------
// Used by the other API services
// ---------------------------------------------------------------------------

// A valid access token, refreshing it first if it is missing or about to expire.
export async function getAccessToken(): Promise<string | null> {
  if (!accessToken || accessTokenExpiresAt - Date.now() < 30_000) {
    await refreshSession();
  }
  return accessToken;
}

// Bearer header for backend calls.
export const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
