import { Hono } from "hono";
import { z } from "zod";
import type { DbEvent, DbRecording, DbZone } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { discoverRecordingsForEvent } from "../lib/recordings";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const adminEvents = new Hono<AuthEnv>();

adminEvents.use("*", requireUser);
adminEvents.use("*", async (c, next) => requireAdmin(c, next));

const SELECT_COLS_FULL =
  "id,title,description,status,start_time,price,live_price,replay_price,live_start_at,live_end_at,replay_available_until,thumbnail_url,image,featured,created_at,title_en,description_en";
const SELECT_COLS_NO_EN =
  "id,title,description,status,start_time,price,live_price,replay_price,live_start_at,live_end_at,replay_available_until,thumbnail_url,image,featured,created_at";

let eventEnColumnsAvailable: boolean | null = null;

function selectCols(): string {
  return eventEnColumnsAvailable === false ? SELECT_COLS_NO_EN : SELECT_COLS_FULL;
}

function isMissingEventEnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42703" ||
    (typeof err.message === "string" &&
      (err.message.includes("title_en") || err.message.includes("description_en")))
  );
}

function stripEnFields<T extends Record<string, unknown>>(payload: T): T {
  const { title_en: _t, description_en: _d, ...rest } = payload as T & {
    title_en?: unknown;
    description_en?: unknown;
  };
  return rest as T;
}

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
  title_en: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
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
  let { data, error } = await admin
    .from("events")
    .select(`${selectCols()},recordings(count)`)
    .order("start_time", { ascending: true });
  if (error && isMissingEventEnError(error)) {
    eventEnColumnsAvailable = false;
    const retry = await admin
      .from("events")
      .select(`${selectCols()},recordings(count)`)
      .order("start_time", { ascending: true });
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows: AdminEventListRow[] = ((data ?? []) as unknown as AdminEventListRaw[]).map(
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
  let { data, error } = await admin
    .from("events")
    .select(selectCols())
    .eq("id", id)
    .maybeSingle<DbEvent>();
  if (error && isMissingEventEnError(error)) {
    eventEnColumnsAvailable = false;
    const retry = await admin
      .from("events")
      .select(selectCols())
      .eq("id", id)
      .maybeSingle<DbEvent>();
    data = retry.data;
    error = retry.error;
  }
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

  let { data, error } = await admin
    .from("events")
    .insert(parsed.data)
    .select(selectCols())
    .single<DbEvent>();
  if (error && isMissingEventEnError(error)) {
    eventEnColumnsAvailable = false;
    const retry = await admin
      .from("events")
      .insert(stripEnFields(parsed.data))
      .select(selectCols())
      .single<DbEvent>();
    data = retry.data;
    error = retry.error;
  }
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

  let { data, error } = await admin
    .from("events")
    .update(parsed.data)
    .eq("id", id)
    .select(selectCols())
    .maybeSingle<DbEvent>();
  if (error && isMissingEventEnError(error)) {
    eventEnColumnsAvailable = false;
    const retry = await admin
      .from("events")
      .update(stripEnFields(parsed.data))
      .eq("id", id)
      .select(selectCols())
      .maybeSingle<DbEvent>();
    data = retry.data;
    error = retry.error;
  }
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
    .select(selectCols())
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

adminEvents.post("/:id/rediscover", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data: event, error: evErr } = await admin
    .from("events")
    .select("id,live_start_at,live_end_at")
    .eq("id", id)
    .maybeSingle<
      Pick<DbEvent, "id" | "live_start_at" | "live_end_at">
    >();
  if (evErr) {
    return c.json({ ok: false, error: evErr.message } as const, 500);
  }
  if (!event) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  if (!event.live_start_at || !event.live_end_at) {
    return c.json(
      { ok: false, error: "missing_live_window" } as const,
      409,
    );
  }
  const discovered = await discoverRecordingsForEvent(event);
  return c.json({ ok: true, data: discovered } as const);
});

// ---------------------------------------------------------------------------
// In-person capacity zones (VIP/Premium/GA) — set price + capacity per event.
// ---------------------------------------------------------------------------
const ZONE_COLS =
  "id,event_id,name_mn,name_en,desc_mn,desc_en,price,capacity,sold,color,sort_order,created_at";

const zoneCreateSchema = z.object({
  name_mn: z.string().trim().min(1),
  name_en: z.string().trim().min(1),
  desc_mn: z.string().nullable().optional(),
  desc_en: z.string().nullable().optional(),
  price: z.number().int().min(0),
  capacity: z.number().int().min(0),
  color: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

const zonePatchSchema = zoneCreateSchema.partial();

adminEvents.get("/:id/zones", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const { data, error } = await admin
    .from("zones")
    .select(ZONE_COLS)
    .eq("event_id", c.req.param("id"))
    .order("sort_order", { ascending: true });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: (data ?? []) as DbZone[] } as const);
});

adminEvents.post("/:id/zones", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = zoneCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() } as const,
      400,
    );
  }
  const { data, error } = await admin
    .from("zones")
    .insert({ ...parsed.data, event_id: c.req.param("id") })
    .select(ZONE_COLS)
    .single<DbZone>();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.on(["PATCH", "PUT"], "/:id/zones/:zoneId", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = zonePatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() } as const,
      400,
    );
  }
  const { data, error } = await admin
    .from("zones")
    .update(parsed.data)
    .eq("id", c.req.param("zoneId"))
    .eq("event_id", c.req.param("id"))
    .select(ZONE_COLS)
    .maybeSingle<DbZone>();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  return c.json({ ok: true, data } as const);
});

adminEvents.delete("/:id/zones/:zoneId", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const { error } = await admin
    .from("zones")
    .delete()
    .eq("id", c.req.param("zoneId"))
    .eq("event_id", c.req.param("id"));
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: { id: c.req.param("zoneId") } } as const);
});

export default adminEvents;
