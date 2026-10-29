import type { CookieOptions, Request, Response, NextFunction } from "express";
import { isAllowedOrigin } from "../config/origins.ts";
import { authRoute } from "../middleware/auth.middleware.ts";
import {
  AuthError,
  endSession,
  getUserById,
  registerUser,
  rotateSession,
  startSession,
  verifyCredentials,
  type Session,
} from "../services/auth.service.ts";

// The refresh token lives in an httpOnly cookie that is only ever sent to /auth/*, so page
// scripts (XSS) can't read it and it never rides along on normal API calls. The short-lived
// access token is returned in the JSON body and kept in memory by the frontend.
const REFRESH_COOKIE = "refresh_token";
const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  // Frontend and API live on different sites in production, so the cookie must be allowed
  // cross-site there (SameSite=None requires Secure). Locally both are on localhost.
  sameSite: isProduction ? "none" : "lax",
  path: "/auth",
});

const readRefreshCookie = (req: Request) => {
  const match = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${REFRESH_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(REFRESH_COOKIE.length + 1)) : undefined;
};

const sendSession = (res: Response, session: Session, status = 200) => {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions(), expires: session.refreshTokenExpiresAt });
  res.status(status).json({
    user: session.user,
    accessToken: session.accessToken,
    expiresIn: session.accessTokenExpiresIn,
  });
};

// Cookie-authenticated endpoints must not be triggerable from other sites.
export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ message: "Origin not allowed", code: "FORBIDDEN_ORIGIN" });
    return;
  }
  next();
};

const userAgent = (req: Request) => req.headers["user-agent"] ?? null;

export const register = authRoute(async (req, res) => {
  const user = await registerUser(req.body);
  // Sign the new user straight in.
  sendSession(res, await startSession(user, userAgent(req)), 201);
});

export const login = authRoute(async (req, res) => {
  const user = await verifyCredentials(req.body);
  sendSession(res, await startSession(user, userAgent(req)));
});

export const refresh = authRoute(async (req, res) => {
  try {
    sendSession(res, await rotateSession(readRefreshCookie(req), userAgent(req)));
  } catch (error) {
    // A dead cookie is useless; clear it so the browser stops sending it.
    if (error instanceof AuthError && error.status === 401) res.clearCookie(REFRESH_COOKIE, cookieOptions());
    throw error;
  }
});

export const logout = authRoute(async (req, res) => {
  await endSession(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.status(204).end();
});

// Requires the `authenticate` middleware.
export const me = authRoute(async (req, res) => {
  const user = req.user ? await getUserById(req.user.id) : null;
  if (!user) throw new AuthError("Account not found", 401, "UNAUTHENTICATED");
  res.json({ user });
});
