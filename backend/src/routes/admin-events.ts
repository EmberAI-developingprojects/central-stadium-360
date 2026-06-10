import { Hono } from "hono";
import { z } from "zod";
import type { DbEvent, DbRecording } from "@cs360/shared";
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
  "id,title,description,status,start_time,price,live_price,replay_price,live_start_at,live_end_at,replay_available_until,thumbnail_url,image,featured,created_at";

const eventStatus = z.enum([
  "upcoming",
  "live",
  "ended",
  "archived",
  "expired",
]);

const createSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  status: eventStatus.optional(),
  start_time: z.string().min(1),
  price: z.number().int().min(0),
  live_price: z.number().min(0).optional(),
  replay_price: z.number().min(0).optional(),
  live_start_at: z.string().nullable().optional(),
  live_end_at: z.string().nullable().optional(),
  replay_available_until: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  featured: z.boolean().optional(),
});

const patchSchema = createSchema.partial();

type AdminEventListRaw = DbEvent & {
  recordings: { count: number }[] | { count: number } | null;
};

export type AdminEventListRow = DbEvent & { recording_count: number };

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
    .select(`${SELECT_COLS},recordings(count)`)
    .order("start_time", { ascending: true });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows: AdminEventListRow[] = ((data ?? []) as AdminEventListRaw[]).map(
    ({ recordings, ...row }) => ({
      ...row,
      recording_count: Array.isArray(recordings)
        ? (recordings[0]?.count ?? 0)
        : (recordings?.count ?? 0),
    }),
  );
  return c.json({ ok: true, data: rows } as const);
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
      return c.json({ ok: false, error: clearErr.message } as const, 500);
    }
  }

  const { data, error } = await admin
    .from("events")
    .insert(parsed.data)
    .select(SELECT_COLS)
    .single<DbEvent>();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.on(["PATCH", "PUT"], "/:id", async (c) => {
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
    return c.json({ ok: false, error: clearErr.message } as const, 500);
  }

  const { data, error } = await admin
    .from("events")
    .update({ featured: true })
    .eq("id", id)
    .select(SELECT_COLS)
    .maybeSingle<DbEvent>();
  if (error) {
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
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: { id } } as const);
});

const RECORDING_COLS =
  "id,event_id,camera_number,channel_arn,s3_bucket,s3_key_prefix,master_playlist_path,duration_seconds,recording_started_at,recording_ended_at,status,created_at";

adminEvents.get("/:id/recordings", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data, error } = await admin
    .from("recordings")
    .select(RECORDING_COLS)
    .eq("event_id", id)
    .order("camera_number", { ascending: true });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: (data ?? []) as DbRecording[] } as const);
});

export default adminEvents;
