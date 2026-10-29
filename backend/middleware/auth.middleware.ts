import type { Request, Response, NextFunction } from "express";
import { AuthError, verifyAccessToken, type AuthUserClaims } from "../services/auth.service.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserClaims;
    }
  }
}

const readBearer = (req: Request) => {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

const sendAuthError = (res: Response, error: unknown) => {
  if (error instanceof AuthError) {
    res.status(error.status).json({ message: error.message, code: error.code });
  } else {
    console.error("[auth] unexpected error:", error);
    res.status(500).json({ message: "Authentication failed", code: "AUTH_ERROR" });
  }
};

// Guard for protected routes: requires `Authorization: Bearer <access token>`.
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({ message: "Authentication required", code: "UNAUTHENTICATED" });
    return;
  }
  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch (error) {
    sendAuthError(res, error);
  }
};

// Sets req.user when a valid token is sent, but lets anonymous requests through.
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = await verifyAccessToken(token);
    } catch {
      // Treated as anonymous.
    }
  }
  next();
};

// Wraps an async route handler so thrown AuthErrors become JSON responses (Express 5 also
// forwards rejections, but this keeps auth errors in one shape).
export const authRoute =
  (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendAuthError(res, error);
    }
  };
