import type { NextFunction, Request, Response } from "express";

// Minimal HTTP Basic Auth guard. If BULLBOARD_USER/BULLBOARD_PASSWORD aren't set
// (e.g. local dev), the route is left open. Always set both in production.
export const requireBasicAuth = (realm: string) => {
  const user = process.env.BULLBOARD_USER;
  const password = process.env.BULLBOARD_PASSWORD;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!user || !password) {
      return next();
    }

    const header = req.headers.authorization;
    if (header?.startsWith("Basic ")) {
      const [suppliedUser, suppliedPassword] = Buffer.from(header.slice(6), "base64")
        .toString("utf8")
        .split(":");

      if (suppliedUser === user && suppliedPassword === password) {
        return next();
      }
    }

    res.set("WWW-Authenticate", `Basic realm="${realm}"`);
    return res.status(401).send("Authentication required.");
  };
};
