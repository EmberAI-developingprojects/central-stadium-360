import { Hono } from "hono";
import { Storage } from "@google-cloud/storage";
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
const BUCKET = process.env.GCS_UPLOADS_BUCKET ?? "stadium360-event-images";

// Credentials come from the Cloud Run service account (or local gcloud ADC).
const bucket = new Storage().bucket(BUCKET);

adminUploads.post("/image", async (c) => {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    // Keys are unique per upload, so the object never changes and can be cached forever.
    await bucket.file(key).save(buffer, {
      contentType: file.type,
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload_failed";
    return c.json({ ok: false, error: message } as const, 500);
  }

  const url = `https://storage.googleapis.com/${BUCKET}/${key}`;
  return c.json({ ok: true, data: { url, key } } as const);
});

export default adminUploads;
