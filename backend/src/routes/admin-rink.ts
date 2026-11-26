import { Hono } from "hono";
import { z } from "zod";
import { createRink, listRinks, rinkLive, updateRink } from "../lib/rink";
import { requireAdmin, requireUser, type AuthEnv } from "../middleware/require-user";
import type { VenueResult } from "../lib/venue";

const adminRink = new Hono<AuthEnv>();

adminRink.use("*", requireUser);
adminRink.use("*", async (c, next) => requireAdmin(c, next));

function reply<T>(c: { json: (body: unknown, status?: number) => Response }, res: VenueResult<T>) {
  if (!res.ok) return c.json({ ok: false, error: res.error } as const, res.status);
  return c.json({ ok: true, data: res.data } as const);
}

const rinkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(10_000_000),
  duration_minutes: z.number().int().min(1).max(1440),
  overtime_per_minute: z.number().int().min(0).max(1_000_000),
  on_sale: z.boolean().optional(),
  sizes: z
    .array(z.object({ size: z.string().trim().min(1).max(20), count: z.number().int().min(0).max(9999) }))
    .min(1)
    .max(60),
});

adminRink.get("/", async (c) => reply(c, await listRinks()));

adminRink.get("/live", async (c) => {
  c.header("Cache-Control", "no-store");
  return reply(c, await rinkLive());
});

adminRink.post("/", async (c) => {
  const parsed = rinkSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_input", details: parsed.error.flatten() } as const, 400);
  }
  return reply(c, await createRink(parsed.data));
});

adminRink.put("/:id", async (c) => {
  const id = c.req.param("id");
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }
  const parsed = rinkSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_input", details: parsed.error.flatten() } as const, 400);
  }
  return reply(c, await updateRink(id, parsed.data));
});

export default adminRink;
