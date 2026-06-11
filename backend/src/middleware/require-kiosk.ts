import type { Context, Next } from "hono";

/**
 * Device auth for the in-person kiosk. The buyer is anonymous; the kiosk
 * *device* authenticates with a static key (`X-Kiosk-Key` == `KIOSK_API_KEY`).
 * Keep the key on the kiosk box only — it is not a user credential.
 */
export type KioskEnv = {
  Variables: {
    kioskId: string | null;
  };
};

export async function requireKiosk(
  c: Context<KioskEnv>,
  next: Next,
): Promise<Response | void> {
  const expected = process.env.KIOSK_API_KEY;
  if (!expected) {
    return c.json({ ok: false, error: "kiosk_not_configured" } as const, 503);
  }
  const provided = c.req.header("x-kiosk-key");
  if (!provided || provided !== expected) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  c.set("kioskId", c.req.header("x-kiosk-id") ?? null);
  await next();
}
