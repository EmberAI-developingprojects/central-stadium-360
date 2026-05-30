import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendSms } from "../lib/sms";

const hook = new Hono();

interface SupabaseSmsHookPayload {
  user: {
    id: string;
    phone?: string;
    email?: string;
  };
  sms: {
    phone: string;
    otp: string;
  };
}

/**
 * Standard Webhooks signature verification.
 *
 * Supabase signs the body with HMAC-SHA256(secret, `${id}.${timestamp}.${body}`)
 * and ships it as `svix-signature: v1,<base64-of-hmac>`. The secret in the
 * dashboard is stored as `v1,whsec_<base64>`; we strip the prefix.
 */
function verifySupabaseSignature(
  secret: string,
  svixId: string | undefined,
  svixTs: string | undefined,
  svixSig: string | undefined,
  rawBody: string,
): boolean {
  if (!svixId || !svixTs || !svixSig) return false;

  const tsNum = Number(svixTs);
  if (!Number.isFinite(tsNum)) return false;
  const skewMs = Math.abs(Date.now() - tsNum * 1000);
  if (skewMs > 5 * 60 * 1000) return false;

  const rawSecret = secret.replace(/^v1,whsec_/, "");
  let key: Buffer;
  try {
    key = Buffer.from(rawSecret, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTs}.${rawBody}`;
  const expected = createHmac("sha256", key)
    .update(signedPayload)
    .digest("base64");

  const candidates = svixSig
    .split(/\s+/)
    .map((part) => part.split(",", 2))
    .filter(([scheme, sig]) => scheme === "v1" && sig)
    .map(([, sig]) => sig);

  const expectedBuf = Buffer.from(expected);
  for (const cand of candidates) {
    const buf = Buffer.from(cand);
    if (buf.length !== expectedBuf.length) continue;
    if (timingSafeEqual(buf, expectedBuf)) return true;
  }
  return false;
}

hook.post("/sms-hook", async (c) => {
  const secret = process.env.SMS_HOOK_SECRET;
  if (!secret) {
    return c.json(
      { ok: false, error: "sms_hook_not_configured" } as const,
      503,
    );
  }

  const raw = await c.req.text();
  const ok = verifySupabaseSignature(
    secret,
    c.req.header("webhook-id") ?? c.req.header("svix-id"),
    c.req.header("webhook-timestamp") ?? c.req.header("svix-timestamp"),
    c.req.header("webhook-signature") ?? c.req.header("svix-signature"),
    raw,
  );
  if (!ok) {
    return c.json({ ok: false, error: "invalid_signature" } as const, 401);
  }

  let payload: SupabaseSmsHookPayload;
  try {
    payload = JSON.parse(raw) as SupabaseSmsHookPayload;
  } catch {
    return c.json({ ok: false, error: "invalid_json" } as const, 400);
  }
  if (!payload?.sms?.phone || !payload?.sms?.otp) {
    return c.json({ ok: false, error: "invalid_payload" } as const, 400);
  }

  try {
    const result = await sendSms({
      phone: payload.sms.phone,
      otp: payload.sms.otp,
    });
    return c.json({ ok: true, data: result } as const);
  } catch (err) {
    console.error("[sms-hook] dispatch failed:", err);
    return c.json(
      {
        ok: false,
        error: (err as Error).message ?? "sms_send_failed",
      } as const,
      502,
    );
  }
});

export default hook;
