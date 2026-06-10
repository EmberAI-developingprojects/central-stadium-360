import { Hono } from "hono";
import { z } from "zod";
import type { AdminUserRow, DbUser } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
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
  const admin = getSupabaseAdmin();
  if (!admin) return rows.map((r) => ({ ...r, banned: false }));

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    return rows.map((r) => ({ ...r, banned: false }));
  }
  const banUntilById = new Map<string, string | null>();
  for (const u of data.users) {
    const raw = (u as { banned_until?: string | null }).banned_until ?? null;
    banUntilById.set(u.id, raw);
  }
  const now = Date.now();
  return rows.map((r) => {
    const until = banUntilById.get(r.id);
    const banned = !!until && new Date(until).getTime() > now;
    return { ...r, banned };
  });
}

adminUsers.get("/", async (c) => {
  const admin = getSupabaseAdmin();
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
  const admin = getSupabaseAdmin();
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
  const admin = getSupabaseAdmin();
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
  const supaAdmin = getSupabaseAdmin();
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

  const { data: authData, error: authErr } =
    await supaAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authErr || !authData?.user) {
    return c.json(
      { ok: false, error: authErr?.message ?? "auth_create_failed" } as const,
      500,
    );
  }

  const { error: profileErr } = await supaAdmin.from("users").insert({
    id: authData.user.id,
    email,
    full_name: full_name ?? "",
    role,
  });
  if (profileErr) {

    await supaAdmin.auth.admin.deleteUser(authData.user.id);
    return c.json({ ok: false, error: profileErr.message } as const, 500);
  }

  const { data: row } = await supaAdmin
    .from("users")
    .select(SELECT_COLS)
    .eq("id", authData.user.id)
    .maybeSingle<DbUser>();
  return c.json({ ok: true, data: { ...row, banned: false } } as const, 201);
});

const disabledSchema = z.object({ disabled: z.boolean() });

adminUsers.patch("/:id/disabled", async (c) => {
  const admin = getSupabaseAdmin();
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

  const banDuration = parsed.data.disabled ? "876000h" : "none";
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
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
  const admin = getSupabaseAdmin();
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

  await admin.auth.admin.updateUserById(id, {
    ban_duration: "876000h",
  });

  return c.json({ ok: true, data: { id } } as const);
});

export default adminUsers;
