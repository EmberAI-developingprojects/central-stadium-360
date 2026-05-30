import { Hono } from "hono";
import { z } from "zod";
import type { DbEvent } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const adminEvents = new Hono<AuthEnv>();

adminEvents.use("*", requireUser);
adminEvents.use("*", async (c, next) => requireAdmin(c, next));

const SELECT_COLS =
  "id,title,description,status,start_time,price,image,pill,featured,created_at";

const eventStatus = z.enum(["upcoming", "live", "ended"]);

const createSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  status: eventStatus.optional(),
  start_time: z.string().min(1),
  price: z.number().int().min(0),
  image: z.string().nullable().optional(),
  pill: z.string().nullable().optional(),
  featured: z.boolean().optional(),
});

const patchSchema = createSchema.partial();

adminEvents.get("/", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const { data, error } = await admin
    .from("events")
    .select(SELECT_COLS)
    .order("start_time", { ascending: true });
  if (error) {
    console.error("[admin-events] list failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: (data ?? []) as DbEvent[] } as const);
});

adminEvents.get("/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data, error } = await admin
    .from("events")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle<DbEvent>();
  if (error) {
    console.error("[admin-events] get failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.post("/", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
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

  if (parsed.data.featured) {
    const { error: clearErr } = await admin
      .from("events")
      .update({ featured: false })
      .eq("featured", true);
    if (clearErr) {
      console.error("[admin-events] clear featured failed:", clearErr);
      return c.json({ ok: false, error: clearErr.message } as const, 500);
    }
  }

  const { data, error } = await admin
    .from("events")
    .insert(parsed.data)
    .select(SELECT_COLS)
    .single<DbEvent>();
  if (error) {
    console.error("[admin-events] insert failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.patch("/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
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

  if (parsed.data.featured === true) {
    const { error: clearErr } = await admin
      .from("events")
      .update({ featured: false })
      .eq("featured", true)
      .neq("id", id);
    if (clearErr) {
      console.error("[admin-events] clear featured failed:", clearErr);
      return c.json({ ok: false, error: clearErr.message } as const, 500);
    }
  }

  const { data, error } = await admin
    .from("events")
    .update(parsed.data)
    .eq("id", id)
    .select(SELECT_COLS)
    .maybeSingle<DbEvent>();
  if (error) {
    console.error("[admin-events] update failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.post("/:id/feature", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");

  const { error: clearErr } = await admin
    .from("events")
    .update({ featured: false })
    .eq("featured", true)
    .neq("id", id);
  if (clearErr) {
    console.error("[admin-events] clear featured failed:", clearErr);
    return c.json({ ok: false, error: clearErr.message } as const, 500);
  }

  const { data, error } = await admin
    .from("events")
    .update({ featured: true })
    .eq("id", id)
    .select(SELECT_COLS)
    .maybeSingle<DbEvent>();
  if (error) {
    console.error("[admin-events] feature failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.delete("/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) {
    console.error("[admin-events] delete failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: { id } } as const);
});

export default adminEvents;
