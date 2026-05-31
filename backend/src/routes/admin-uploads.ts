import { Hono } from "hono";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const adminUploads = new Hono<AuthEnv>();

adminUploads.use("*", requireUser);
adminUploads.use("*", async (c, next) => requireAdmin(c, next));

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const BUCKET = process.env.SUPABASE_UPLOADS_BUCKET ?? "event-images";

adminUploads.post("/image", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const body = await c.req.parseBody().catch(() => null);
  if (!body) {
    return c.json({ ok: false, error: "invalid_multipart" } as const, 400);
  }
  const file = body["file"];
  if (!(file instanceof File)) {
    return c.json({ ok: false, error: "no_file" } as const, 400);
  }
  if (file.size > MAX_BYTES) {
    return c.json({ ok: false, error: "file_too_large" } as const, 400);
  }
  if (!ALLOWED.has(file.type)) {
    return c.json({ ok: false, error: "invalid_type" } as const, 400);
  }

  const ext = (file.name.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const rand = Math.random().toString(36).slice(2, 10);
  const key = `${Date.now()}-${rand}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error } = await admin.storage.from(BUCKET).upload(key, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[admin-uploads] upload failed:", error);
    return c.json({ ok: false, error: error.message } as const, 500);
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(key);
  return c.json({ ok: true, data: { url: data.publicUrl, key } } as const);
});

export default adminUploads;
