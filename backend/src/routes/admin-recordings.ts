import { Hono } from "hono";
import { z } from "zod";
import type { DbRecording } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const adminRecordings = new Hono<AuthEnv>();

adminRecordings.use("*", requireUser);
adminRecordings.use("*", async (c, next) => requireAdmin(c, next));

const SELECT_COLS =
  "id,event_id,camera_number,channel_arn,s3_bucket,s3_key_prefix,master_playlist_path,duration_seconds,recording_started_at,recording_ended_at,status,created_at";

const createSchema = z.object({
  event_id: z.string().uuid(),
  camera_number: z.number().int().min(1).max(4),
  channel_arn: z.string().min(1).nullable().optional(),
  s3_bucket: z.string().min(1).nullable().optional(),
  s3_key_prefix: z.string().min(1).nullable().optional(),
  master_playlist_path: z.string().min(1).nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  recording_started_at: z.string().nullable().optional(),
  recording_ended_at: z.string().nullable().optional(),
});

adminRecordings.post("/", async (c) => {
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

  const { data, error } = await admin
    .from("recordings")
    .insert({ ...parsed.data, status: "ready" })
    .select(SELECT_COLS)
    .single<DbRecording>();
  if (error) {
    if (error.code === "23505") {
      return c.json(
        { ok: false, error: "recording_already_exists_for_camera" } as const,
        409,
      );
    }
    if (error.code === "23503") {
      return c.json({ ok: false, error: "event_not_found" } as const, 404);
    }
    return c.json({ ok: false, error: error.message } as const, 500);
  }

  const { count, error: countErr } = await admin
    .from("recordings")
    .select("id", { count: "exact", head: true })
    .eq("event_id", parsed.data.event_id)
    .eq("status", "ready");
  if (!countErr && (count ?? 0) >= 4) {
    await admin
      .from("events")
      .update({ status: "archived" })
      .eq("id", parsed.data.event_id)
      .in("status", ["upcoming", "live", "ended"]);
  }

  return c.json({ ok: true, data } as const);
});

export type ChannelArnRow = {
  camera_number: number;
  arn: string | null;
};

adminRecordings.get("/channel-arns", (c) => {
  const rows: ChannelArnRow[] = [1, 2, 3, 4].map((n) => ({
    camera_number: n,
    arn: process.env[`WOWZA_CAM${n}_STREAM_ID`] ?? null,
  }));
  return c.json({ ok: true, data: rows } as const);
});

export default adminRecordings;
