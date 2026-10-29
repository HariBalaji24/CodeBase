import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[db] DATABASE_URL is not set - authentication endpoints will fail.");
}

export const pool = new pg.Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});


pool.on("error", (error) => console.error("[db] idle client error:", error.message));

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) =>
  pool.query<T>(text, params);

// Creates what authentication needs if it is missing. Both statements are no-ops on the
// existing database: "User" already exists there (created earlier through Prisma).
export async function ensureAuthSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id"            TEXT PRIMARY KEY,
      "name"          TEXT,
      "email"         TEXT NOT NULL,
      "emailVerified" TIMESTAMP(3),
      "image"         TEXT,
      "password"      TEXT,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");

    CREATE TABLE IF NOT EXISTS "RefreshToken" (
      "id"         TEXT PRIMARY KEY,
      "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "tokenHash"  TEXT NOT NULL UNIQUE,
      "familyId"   TEXT NOT NULL,
      "expiresAt"  TIMESTAMPTZ NOT NULL,
      "revokedAt"  TIMESTAMPTZ,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "userAgent"  TEXT
    );
    CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken" ("userId");
    CREATE INDEX IF NOT EXISTS "RefreshToken_familyId_idx" ON "RefreshToken" ("familyId");
  `);
}
