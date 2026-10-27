import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "../db";

const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_DAYS = 30;

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export interface AccessClaims {
  userId: string;
  sessionId: string;
}

export interface ClientInfo {
  userAgent?: string | null;
  ip?: string | null;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jwtKey(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

async function issueTokens(userId: string, sessionId: string, refreshToken: string): Promise<SessionTokens> {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await new SignJWT({ sid: sessionId, role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SECONDS)
    .sign(jwtKey());
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: now + ACCESS_TTL_SECONDS,
    expires_in: ACCESS_TTL_SECONDS,
  };
}

export async function createSession(db: Db, userId: string, client: ClientInfo = {}): Promise<SessionTokens> {
  const refreshToken = randomBytes(32).toString("base64url");
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.auth_sessions (user_id, refresh_token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, now() + make_interval(days => $3), $4, $5)
     RETURNING id`,
    [userId, sha256(refreshToken), REFRESH_TTL_DAYS, client.userAgent ?? null, client.ip ?? null],
  );
  await db.query(`UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1`, [userId]);
  return issueTokens(userId, rows[0].id, refreshToken);
}

/** Rotate a refresh token. Returns null if it is unknown, expired or revoked. */
export async function refreshSession(
  db: Db,
  refreshToken: string,
): Promise<{ userId: string; tokens: SessionTokens } | null> {
  const next = randomBytes(32).toString("base64url");
  const { rows } = await db.query<{ id: string; user_id: string }>(
    `UPDATE public.auth_sessions
        SET refresh_token_hash = $2,
            refreshed_at = now(),
            expires_at = now() + make_interval(days => $3)
      WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
      RETURNING id, user_id`,
    [sha256(refreshToken), sha256(next), REFRESH_TTL_DAYS],
  );
  if (rows.length === 0) return null;
  return { userId: rows[0].user_id, tokens: await issueTokens(rows[0].user_id, rows[0].id, next) };
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await db.query(`UPDATE public.auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [
    sessionId,
  ]);
}

export async function revokeSessionByRefreshToken(db: Db, refreshToken: string): Promise<void> {
  await db.query(
    `UPDATE public.auth_sessions SET revoked_at = now() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
    [sha256(refreshToken)],
  );
}

/** Sign the user out everywhere, optionally keeping one session alive. */
export async function revokeUserSessions(db: Db, userId: string, exceptSessionId?: string): Promise<void> {
  await db.query(
    `UPDATE public.auth_sessions SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [userId, exceptSessionId ?? null],
  );
}
