import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  renderEmail,
  sendEmail,
  type SupabaseEmailHookPayload,
} from "../lib/email";

const hook = new Hono();

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

hook.post("/email-hook", async (c) => {
  const secret = process.env.EMAIL_HOOK_SECRET;
  if (!secret) {
    return c.json(
      { ok: false, error: "email_hook_not_configured" } as const,
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

  let payload: SupabaseEmailHookPayload;
  try {
    payload = JSON.parse(raw) as SupabaseEmailHookPayload;
  } catch {
    return c.json({ ok: false, error: "invalid_json" } as const, 400);
  }

  const to = payload?.user?.email;
  if (
    !to ||
    !payload?.email_data?.token_hash ||
    !payload?.email_data?.email_action_type ||
    !payload?.email_data?.redirect_to
  ) {
    return c.json({ ok: false, error: "invalid_payload" } as const, 400);
  }

  const rendered = renderEmail(payload);
  const md = payload.user.user_metadata ?? null;
  const fullName =
    md && typeof md === "object"
      ? typeof (md as Record<string, unknown>).full_name === "string"
        ? ((md as Record<string, unknown>).full_name as string)
        : null
      : null;

  try {
    const result = await sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.htmlBody,
      text: rendered.textBody,
      fullName,
      tag: rendered.tag,
      // Same auth action → same key, so a retried webhook won't double-send.
      idempotencyKey: `auth-${payload.user.id}-${payload.email_data.token_hash}`,
    });
    return c.json({ ok: true, data: result } as const);
  } catch (err) {
    console.error("[email-hook] send failed", err);
    return c.json(
      {
        ok: false,
        error: (err as Error).message ?? "email_send_failed",
      } as const,
      502,
    );
  }
});

export default hook;
