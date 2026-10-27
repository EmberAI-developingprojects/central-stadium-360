import { Hono, type Context, type Next } from "hono";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getDb } from "../lib/db";

// Machine-to-machine access to the recordings table for the VOD packaging
// workers in infra/vod-remux (they used to call Supabase's REST API with the
// service key). Guarded by the x-internal-secret header.

const internalRecordings = new Hono();

async function requireInternalSecret(c: Context, next: Next) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    return c.json({ ok: false, error: "internal_api_not_configured" } as const, 503);
  }
  const given = Buffer.from(c.req.header("x-internal-secret") ?? "");
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  await next();
}

internalRecordings.use("*", requireInternalSecret);

const rowSchema = z.object({
  event_id: z.string().uuid(),
  camera_number: z.number().int(),
  channel_arn: z.string().min(1),
  s3_bucket: z.string().min(1),
  s3_key_prefix: z.string().min(1),
  master_playlist_path: z.string().min(1),
  duration_seconds: z.number().int().nullable().optional(),
  recording_started_at: z.string().nullable().optional(),
  recording_ended_at: z.string().nullable().optional(),
  status: z.string().min(1),
  chapters: z.unknown().optional(),
});

const patchSchema = rowSchema.partial().omit({ event_id: true, channel_arn: true });

const matchSchema = z.object({
  event_id: z.string().uuid(),
  channel_arn: z.string().min(1),
});

/** Insert or update the row for (event_id, channel_arn). */
internalRecordings.put("/recordings", async (c) => {
  const parsed = rowSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_input", details: parsed.error.flatten() } as const, 400);
  }
  const db = getDb();
  if (!db) return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  const { data, error } = await db
    .from("recordings")
    .upsert(parsed.data, { onConflict: "event_id,channel_arn" })
    .select("id")
    .single<{ id: string }>();
  if (error) return c.json({ ok: false, error: error.message } as const, 500);
  return c.json({ ok: true, data } as const);
});

/** Update fields on the row matching ?event_id=&channel_arn=. */
internalRecordings.patch("/recordings", async (c) => {
  const match = matchSchema.safeParse(c.req.query());
  const patch = patchSchema.safeParse(await c.req.json().catch(() => null));
  if (!match.success || !patch.success) {
    return c.json({ ok: false, error: "invalid_input" } as const, 400);
  }
  const db = getDb();
  if (!db) return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  const { data, error } = await db
    .from("recordings")
    .update(patch.data)
    .eq("event_id", match.data.event_id)
    .eq("channel_arn", match.data.channel_arn)
    .select("id");
  if (error) return c.json({ ok: false, error: error.message } as const, 500);
  return c.json({ ok: true, data: { updated: data?.length ?? 0 } } as const);
});

/** Delete an event's rows whose channel_arn starts with ?channel_arn_prefix=. */
internalRecordings.delete("/recordings", async (c) => {
  const eventId = z.string().uuid().safeParse(c.req.query("event_id"));
  const prefix = z.string().min(3).safeParse(c.req.query("channel_arn_prefix"));
  if (!eventId.success || !prefix.success) {
    return c.json({ ok: false, error: "invalid_input" } as const, 400);
  }
  const db = getDb();
  if (!db) return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  const escaped = prefix.data.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error } = await db
    .from("recordings")
    .delete()
    .eq("event_id", eventId.data)
    .like("channel_arn", `${escaped}%`)
    .select("id");
  if (error) return c.json({ ok: false, error: error.message } as const, 500);
  return c.json({ ok: true, data: { deleted: data?.length ?? 0 } } as const);
});

export default internalRecordings;
