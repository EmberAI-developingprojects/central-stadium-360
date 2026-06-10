import { Hono } from "hono";
import type { DbRecording } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireUser, type AuthEnv } from "../middleware/require-user";
import { hasValidTicketForEvent } from "../lib/tickets";
import {
  isCloudFrontConfigured,
  signRecordingUrl,
} from "../lib/cloudfront";

const recordings = new Hono<AuthEnv>();

recordings.use("*", requireUser);

recordings.post("/:id/sign-url", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  if (!isCloudFrontConfigured()) {
    return c.json(
      { ok: false, error: "cloudfront_not_configured" } as const,
      503,
    );
  }

  const user = c.get("user");
  const id = c.req.param("id");

  const { data: rec, error } = await admin
    .from("recordings")
    .select("id,event_id,status,master_playlist_path,s3_key_prefix")
    .eq("id", id)
    .maybeSingle<
      Pick<
        DbRecording,
        "id" | "event_id" | "status" | "master_playlist_path" | "s3_key_prefix"
      >
    >();
  if (error) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!rec || rec.status !== "ready") {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  if (!rec.master_playlist_path) {
    return c.json(
      { ok: false, error: "recording_incomplete" } as const,
      409,
    );
  }

  const ok = await hasValidTicketForEvent(user.id, rec.event_id);
  if (!ok) {
    return c.json({ ok: false, error: "forbidden" } as const, 403);
  }

  let signedUrl: string;
  try {
    signedUrl = signRecordingUrl(rec.master_playlist_path);
  } catch (_err) {
    return c.json({ ok: false, error: "sign_failed" } as const, 500);
  }
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return c.json({ ok: true, data: { url: signedUrl, expires_at: expiresAt } } as const);
});

export default recordings;
