import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { pool, query } from "./db.service.ts";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
export const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 30 * 24 * 60 * 60;
// A rotated refresh token that is replayed within this window is treated as a benign race
// (two tabs refreshing at once) instead of token theft.
const REUSE_GRACE_MS = 10_000;

const accessSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new AuthError("Server auth is not configured (AUTH_SECRET missing or too short)", 500, "AUTH_MISCONFIGURED");
  }
  return new TextEncoder().encode(secret);
};

// ---------------------------------------------------------------------------
// Validation (rules match what the existing accounts were created with)
// ---------------------------------------------------------------------------

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .max(72, "Password must be at most 72 characters")
    .refine((p) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p), {
      message: "Password must be 8+ characters with an uppercase letter, a lowercase letter and a number.",
    }),
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const parseOrThrow = <T extends z.ZodType>(schema: T, data: unknown): z.output<T> => {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new AuthError(result.error.issues[0]?.message ?? "Invalid request", 400, "VALIDATION_ERROR");
  }
  return result.data;
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type PublicUser = { id: string; email: string; name: string | null; image: string | null };

type UserRow = PublicUser & { password: string | null };

const toPublic = ({ id, email, name, image }: UserRow): PublicUser => ({ id, email, name, image });

// Compared against when the email is unknown so a missing account takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export async function registerUser(input: unknown): Promise<PublicUser> {
  const { email, password, name } = parseOrThrow(registerSchema, input);

  const existing = await query<{ password: string | null }>(`SELECT "password" FROM "User" WHERE "email" = $1`, [email]);
  if (existing.rows[0]) {
    throw new AuthError("An account with this email already exists. Try signing in.", 409, "EMAIL_TAKEN");
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const { rows } = await query<UserRow>(
      `INSERT INTO "User" ("id", "email", "name", "password", "updatedAt")
       VALUES ($1, $2, $3, $4, now())
       RETURNING "id", "email", "name", "image", "password"`,
      [randomUUID(), email, name ?? null, hash],
    );
    return toPublic(rows[0]!);
  } catch (error) {
    // Lost a race with a concurrent signup for the same email (unique index).
    if ((error as { code?: string }).code === "23505") {
      throw new AuthError("An account with this email already exists. Try signing in.", 409, "EMAIL_TAKEN");
    }
    throw error;
  }
}

export async function verifyCredentials(input: unknown): Promise<PublicUser> {
  const { email, password } = parseOrThrow(loginSchema, input);

  const { rows } = await query<UserRow>(
    `SELECT "id", "email", "name", "image", "password" FROM "User" WHERE "email" = $1`,
    [email],
  );
  const user = rows[0];
  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !user.password || !valid) {
    throw new AuthError("The email or password you entered is incorrect.", 401, "INVALID_CREDENTIALS");
  }
  return toPublic(user);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const { rows } = await query<UserRow>(
    `SELECT "id", "email", "name", "image", "password" FROM "User" WHERE "id" = $1`,
    [id],
  );
  return rows[0] ? toPublic(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export type AuthUserClaims = { id: string; email?: string; name?: string | null };

export async function createAccessToken(user: PublicUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthUserClaims> {
  try {
    const { payload } = await jwtVerify(token, accessSecret(), { algorithms: ["HS256"] });
    if (!payload.sub) throw new Error("no subject");
    return {
      id: payload.sub,
      ...(typeof payload.email === "string" ? { email: payload.email } : {}),
      ...(typeof payload.name === "string" || payload.name === null ? { name: payload.name as string | null } : {}),
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

// Refresh tokens are opaque random strings. Only their SHA-256 hash is stored, so a
// database leak does not expose usable tokens.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type Session = {
  user: PublicUser;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

async function insertRefreshToken(userId: string, familyId: string, userAgent: string | null) {
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  await query(
    `INSERT INTO "RefreshToken" ("id", "userId", "tokenHash", "familyId", "expiresAt", "userAgent")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), userId, hashToken(token), familyId, expiresAt, userAgent?.slice(0, 255) ?? null],
  );
  return { token, expiresAt };
}

export async function startSession(user: PublicUser, userAgent: string | null): Promise<Session> {
  // Housekeeping: drop this user's long-dead tokens whenever they sign in.
  await query(`DELETE FROM "RefreshToken" WHERE "userId" = $1 AND "expiresAt" < now() - interval '7 days'`, [user.id]);

  const refresh = await insertRefreshToken(user.id, randomUUID(), userAgent);
  return {
    user,
    accessToken: await createAccessToken(user),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

type RefreshRow = { id: string; userId: string; familyId: string; expiresAt: Date; revokedAt: Date | null };

// Exchanges a refresh token for a new access token AND a new refresh token (rotation).
// Replaying an already-rotated token revokes the whole family: the thief and the real
// user are both signed out.
export async function rotateSession(rawToken: string | undefined, userAgent: string | null): Promise<Session> {
  if (!rawToken) throw new AuthError("No refresh token", 401, "NO_REFRESH_TOKEN");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<RefreshRow>(
      `SELECT "id", "userId", "familyId", "expiresAt", "revokedAt" FROM "RefreshToken"
       WHERE "tokenHash" = $1 FOR UPDATE`,
      [hashToken(rawToken)],
    );
    const row = found.rows[0];

    if (!row) {
      await client.query("ROLLBACK");
      throw new AuthError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (row.revokedAt) {
      const recentlyRotated = Date.now() - row.revokedAt.getTime() < REUSE_GRACE_MS;
      if (!recentlyRotated) {
        await client.query(`UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "familyId" = $1 AND "revokedAt" IS NULL`, [
          row.familyId,
        ]);
        await client.query("COMMIT");
      } else {
        await client.query("ROLLBACK");
      }
      throw new AuthError("Refresh token was already used", 401, "REFRESH_TOKEN_REUSED");
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      throw new AuthError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const userResult = await client.query<UserRow>(
      `SELECT "id", "email", "name", "image", "password" FROM "User" WHERE "id" = $1`,
      [row.userId],
    );
    const userRow = userResult.rows[0];
    if (!userRow) {
      await client.query("ROLLBACK");
      throw new AuthError("Account no longer exists", 401, "INVALID_REFRESH_TOKEN");
    }

    await client.query(`UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "id" = $1`, [row.id]);

    const token = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    await client.query(
      `INSERT INTO "RefreshToken" ("id", "userId", "tokenHash", "familyId", "expiresAt", "userAgent")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), row.userId, hashToken(token), row.familyId, expiresAt, userAgent?.slice(0, 255) ?? null],
    );
    await client.query("COMMIT");

    const user = toPublic(userRow);
    return {
      user,
      accessToken: await createAccessToken(user),
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

// Signs out this browser: revokes the token's whole rotation chain. Unknown tokens are ignored.
export async function endSession(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await query(
    `UPDATE "RefreshToken" SET "revokedAt" = now()
     WHERE "revokedAt" IS NULL
       AND "familyId" = (SELECT "familyId" FROM "RefreshToken" WHERE "tokenHash" = $1)`,
    [hashToken(rawToken)],
  );
}
