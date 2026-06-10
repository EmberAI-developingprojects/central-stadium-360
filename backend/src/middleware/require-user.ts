import type { Context, Next } from "hono";
import { getSupabaseAdmin } from "../lib/supabase";
import { getSupabaseForAccessToken } from "../lib/supabase-anon";

export interface AuthedUser {
  id: string;
  phone: string | null;
  role: "user" | "admin";
}

export type AuthEnv = {
  Variables: {
    user: AuthedUser;
    accessToken: string;
  };
};

function getBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireUser(
  c: Context<AuthEnv>,
  next: Next,
): Promise<Response | void> {
  const token = getBearer(c.req.header("authorization"));
  if (!token) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  const sb = getSupabaseForAccessToken(token);
  if (!sb) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }

  let role: "user" | "admin" = "user";
  let phone: string | null = data.user.phone ?? null;
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: row } = await admin
      .from("users")
      .select("role, phone")
      .eq("id", data.user.id)
      .maybeSingle<{ role: "user" | "admin"; phone: string | null }>();
    if (row) {
      role = row.role;
      phone = row.phone ?? phone;
    } else {
      const md = (data.user.user_metadata ?? {}) as { full_name?: string };
      const authPhone = data.user.phone ? `+${data.user.phone}` : null;
      const { error: upsertErr } = await admin.from("users").upsert(
        {
          id: data.user.id,
          phone: authPhone,
          email: data.user.email ?? null,
          full_name: md.full_name ?? "",
          role: "user",
        },
        { onConflict: "id" },
      );
      if (!upsertErr) {
        phone = authPhone ?? phone;
      }
    }
  }

  c.set("user", { id: data.user.id, phone, role });
  c.set("accessToken", token);
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
