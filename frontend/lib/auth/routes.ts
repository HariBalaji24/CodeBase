// Single source of truth for auth-related paths. Safe to import from server code and
// client components (no Node-only imports here).

export const AUTH_ROUTES = {
  login: "/auth/login",
  signup: "/auth/signup",
} as const;

export const DEFAULT_LOGIN_REDIRECT = "/dashboard";

// Pages that need a signed-in user (enforced by AuthProvider; the backend enforces the API).
export const PROTECTED_PREFIXES = ["/dashboard", "/analysis", "/details"] as const;

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

// Pages only signed-out users should see.
export const isGuestOnlyPath = (pathname: string) =>
  pathname === AUTH_ROUTES.login || pathname === AUTH_ROUTES.signup;

// Accepts only same-site relative paths, so a crafted ?callbackUrl=https://evil.com
// (or //evil.com) can't turn the login page into an open redirect.
export function safeCallbackUrl(
  value: string | null | undefined,
  fallback: string = DEFAULT_LOGIN_REDIRECT,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
