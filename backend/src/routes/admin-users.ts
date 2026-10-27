import { Hono } from "hono";
import { z } from "zod";
import type { AdminUserRow, DbUser } from "@cs360/shared";
import { getDb } from "../lib/db";
import { createAuthUser, findAuthUserByEmail, setBanned } from "../lib/auth/accounts";
import { revokeUserSessions } from "../lib/auth/tokens";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const adminUsers = new Hono<AuthEnv>();

adminUsers.use("*", requireUser);
adminUsers.use("*", async (c, next) => requireAdmin(c, next));

const SELECT_COLS = "id,phone,email,full_name,role,created_at,deleted_at";

const roleSchema = z.object({ role: z.enum(["user", "admin"]) });

function isSelf(c: { get: (k: "user") => { id: string } }, targetId: string) {
  return c.get("user").id === targetId;
}

async function attachBanStatus(rows: DbUser[]): Promise<AdminUserRow[]> {
  const admin = getDb();
  if (!admin) return rows.map((r) => ({ ...r, banned: false }));

  const { rows: banned } = await admin
    .query<{ id: string }>(
      `SELECT id FROM auth.users WHERE id = ANY($1::uuid[]) AND banned_until > now()`,
      [rows.map((r) => r.id)],
    )
    .catch(() => ({ rows: [] as { id: string }[] }));
  const bannedIds = new Set(banned.map((b) => b.id));
  return rows.map((r) => ({ ...r, banned: bannedIds.has(r.id) }));
}

adminUsers.get("/", async (c) => {
  const admin = getDb();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const { data, error } = await admin
    .from("users")
    .select(SELECT_COLS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows = (data ?? []) as DbUser[];
  const enriched = await attachBanStatus(rows);
  return c.json({ ok: true, data: enriched } as const);
});

adminUsers.get("/:id", async (c) => {
  const admin = getDb();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data, error } = await admin
    .from("users")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle<DbUser>();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  const [enriched] = await attachBanStatus([data]);
  return c.json({ ok: true, data: enriched } as const);
});

adminUsers.patch("/:id/role", async (c) => {
  const admin = getDb();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
      400,
    );
  }

  if (parsed.data.role === "user") {
    const { count, error: cntErr } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .is("deleted_at", null);
    if (cntErr) {
      return c.json({ ok: false, error: cntErr.message } as const, 500);
    }
    if ((count ?? 0) <= 1 && isSelf(c, id)) {
      return c.json({ ok: false, error: "last_admin" } as const, 409);
    }
  }

  const { data, error } = await admin
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", id)
    .select(SELECT_COLS)
    .maybeSingle<DbUser>();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  const [enriched] = await attachBanStatus([data]);
  return c.json({ ok: true, data: enriched } as const);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

adminUsers.post("/", async (c) => {
  const supaAdmin = getDb();
  if (!supaAdmin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
      400,
    );
  }
  const { email, password, full_name, role } = parsed.data;

  if (await findAuthUserByEmail(supaAdmin, email)) {
    return c.json({ ok: false, error: "already_registered" } as const, 409);
  }

  let userId: string;
  try {
    userId = await createAuthUser(supaAdmin, {
      email,
      password,
      fullName: full_name ?? "",
      emailConfirmed: true,
    });
  } catch (err) {
    return c.json(
      { ok: false, error: (err as Error).message || "auth_create_failed" } as const,
      500,
    );
  }

  // The on_auth_user_created trigger already made the profile row; set its
  // role and name (upsert covers a database without the trigger).
  const { error: profileErr } = await supaAdmin.from("users").upsert(
    { id: userId, email, full_name: full_name ?? "", role },
    { onConflict: "id" },
  );
  if (profileErr) {
    await supaAdmin.query(`DELETE FROM auth.users WHERE id = $1`, [userId]);
    return c.json({ ok: false, error: profileErr.message } as const, 500);
  }

  const { data: row } = await supaAdmin
    .from("users")
    .select(SELECT_COLS)
    .eq("id", userId)
    .maybeSingle<DbUser>();
  return c.json({ ok: true, data: { ...row, banned: false } } as const, 201);
});

const disabledSchema = z.object({ disabled: z.boolean() });

adminUsers.patch("/:id/disabled", async (c) => {
  const admin = getDb();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  if (isSelf(c, id)) {
    return c.json({ ok: false, error: "cannot_self_disable" } as const, 409);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = disabledSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
      400,
    );
  }

  try {
    await setBanned(admin, id, parsed.data.disabled);
    if (parsed.data.disabled) await revokeUserSessions(admin, id);
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message } as const, 500);
  }

  const { data: row, error: selErr } = await admin
    .from("users")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle<DbUser>();
  if (selErr) {
    return c.json({ ok: false, error: selErr.message } as const, 500);
  }
  if (!row) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  const [enriched] = await attachBanStatus([row]);
  return c.json({ ok: true, data: enriched } as const);
});

adminUsers.delete("/:id", async (c) => {
  const admin = getDb();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  if (isSelf(c, id)) {
    return c.json({ ok: false, error: "cannot_self_delete" } as const, 409);
  }

  const { error: updErr } = await admin
    .from("users")
    .update({
      phone: null,
      email: null,
      full_name: "",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    return c.json({ ok: false, error: updErr.message } as const, 500);
  }

  await setBanned(admin, id, true);
  await revokeUserSessions(admin, id);

  return c.json({ ok: true, data: { id } } as const);
});

export default adminUsers;
