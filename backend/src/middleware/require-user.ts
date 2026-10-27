import type { Context, Next } from "hono";
import { getDb } from "../lib/db";
import { verifyAccessToken } from "../lib/auth/tokens";

export interface AuthedUser {
  id: string;
  phone: string | null;
  role: "user" | "admin";
}

export type AuthEnv = {
  Variables: {
    user: AuthedUser;
    accessToken: string;
    sessionId: string;
  };
};

export function getBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireUser(
  c: Context<AuthEnv>,
  next: Next,
): Promise<Response | void> {
  if (process.env.DEV_AUTH === "1") {
    c.set("user", {
      id: process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001",
      phone: null,
      role: "admin",
    });
    c.set("accessToken", "dev");
    c.set("sessionId", "00000000-0000-0000-0000-000000000000");
    return next();
  }

  const token = getBearer(c.req.header("authorization"));
  if (!token) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  const claims = await verifyAccessToken(token);
  if (!claims) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  const db = getDb();
  if (!db) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  // One round trip: the account, its profile, and whether this session is
  // still live (logout, password change and bans take effect immediately).
  const { rows } = await db.query<{
    phone: string | null;
    email: string | null;
    meta: { full_name?: string } | null;
    banned: boolean;
    session_live: boolean;
    role: "user" | "admin" | null;
    profile_phone: string | null;
    deleted_at: string | null;
    has_profile: boolean;
  }>(
    `SELECT au.phone, au.email, au.raw_user_meta_data AS meta,
            coalesce(au.banned_until > now(), false) AS banned,
            (s.id IS NOT NULL AND s.revoked_at IS NULL AND s.expires_at > now()) AS session_live,
            u.role, u.phone AS profile_phone, u.deleted_at, (u.id IS NOT NULL) AS has_profile
       FROM auth.users au
       LEFT JOIN public.auth_sessions s ON s.id = $2 AND s.user_id = au.id
       LEFT JOIN public.users u ON u.id = au.id
      WHERE au.id = $1`,
    [claims.userId, claims.sessionId],
  );
  const row = rows[0];
  if (!row || row.banned || !row.session_live) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  if (row.deleted_at) {
    return c.json({ ok: false, error: "account_deleted" } as const, 403);
  }

  let role: "user" | "admin" = row.role ?? "user";
  let phone = row.profile_phone ?? row.phone ?? null;
  if (!row.has_profile) {
    // The on_auth_user_created trigger normally creates this row.
    const authPhone = row.phone ? `+${row.phone}` : null;
    const { error } = await db.from("users").upsert(
      {
        id: claims.userId,
        phone: authPhone,
        email: row.email ?? null,
        full_name: row.meta?.full_name ?? "",
        role: "user",
      },
      { onConflict: "id" },
    );
    if (!error) phone = authPhone ?? phone;
    role = "user";
  }

  c.set("user", { id: claims.userId, phone, role });
  c.set("accessToken", token);
  c.set("sessionId", claims.sessionId);
  await next();
}

export function requireAdmin(
  c: Context<AuthEnv>,
  next: Next,
): Response | Promise<void> {
  const user = c.get("user");
  if (!user) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  if (user.role !== "admin") {
    return c.json({ ok: false, error: "forbidden" } as const, 403);
  }
  return next();
}
