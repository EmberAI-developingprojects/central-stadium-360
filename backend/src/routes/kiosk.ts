import { Hono } from "hono";
import { z } from "zod";
import type { KioskEvent, KioskZone } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireKiosk, type KioskEnv } from "../middleware/require-kiosk";
import {
  applyCardResult,
  createKioskOrder,
  getKioskOrderStatus,
  redeemTicket,
} from "../lib/venue";
import {
  getCallbackSecret,
  verifyTicketSignature,
} from "../lib/qpay-signature";

const kiosk = new Hono<KioskEnv>();

const ZONE_COLS =
  "id,event_id,name_mn,name_en,desc_mn,desc_en,price,capacity,sold,color,sort_order,created_at";

kiosk.post("/qpay-callback", async (c) => {
  const orderId = c.req.query("order") ?? "";
  const sig = c.req.query("sig") ?? "";
  const secret = getCallbackSecret();
  if (!secret) {
    return c.json(
      { ok: false, error: "qpay_callback_secret_missing" } as const,
      503,
    );
  }
  if (!verifyTicketSignature(orderId, sig, secret)) {
    return c.json({ ok: false, error: "bad_signature" } as const, 401);
  }
  const res = await getKioskOrderStatus(orderId);
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 404);
  }
  return c.json({ ok: true, data: { status: res.data.status } } as const);
});

kiosk.use("*", requireKiosk);

kiosk.get("/events", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const { data, error } = await admin
    .from("events")
    .select(
      `id,title,description,status,start_time,image,thumbnail_url,zones(${ZONE_COLS})`,
    )
    .in("status", ["upcoming", "live"])
    .order("start_time", { ascending: true });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }

  const events: KioskEvent[] = (
    (data ?? []) as unknown as Array<
      Omit<KioskEvent, "zones"> & { zones: KioskZone[] }
    >
  ).map((e) => {
    const zones = [...(e.zones ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((z) => ({ ...z, available: Math.max(0, z.capacity - z.sold) }));
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      status: e.status,
      start_time: e.start_time,
      image: e.image,
      thumbnail_url: e.thumbnail_url,
      zones,
    };
  });
  return c.json({ ok: true, data: events } as const);
});

const createOrderSchema = z.object({
  event_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        zone_id: z.string().uuid(),
        qty: z.number().int().positive().max(20),
      }),
    )
    .min(1),
  method: z.enum(["qpay", "card"]),
  buyer_phone: z.string().trim().min(1).nullable().optional(),
  kiosk_id: z.string().trim().min(1).nullable().optional(),
});

kiosk.post("/orders", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createOrderSchema.safeParse(body);
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
  const res = await createKioskOrder({
    ...parsed.data,
    kiosk_id: parsed.data.kiosk_id ?? c.get("kioskId"),
  });
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 400);
  }
  return c.json({ ok: true, data: res.data } as const);
});

kiosk.get("/orders/:id/status", async (c) => {
  const res = await getKioskOrderStatus(c.req.param("id"));
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 404);
  }
  return c.json({ ok: true, data: res.data } as const);
});

const cardResultSchema = z.object({
  approved: z.boolean(),
  payment_ref: z.string().optional(),
});

kiosk.post("/orders/:id/card-result", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = cardResultSchema.safeParse(body);
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
  const res = await applyCardResult(c.req.param("id"), parsed.data.approved);
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 402);
  }
  return c.json({ ok: true, data: res.data } as const);
});

const scanSchema = z.object({
  code: z.string().trim().min(1),
  event_id: z.string().uuid().nullable().optional(),
});

kiosk.post("/scan", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = scanSchema.safeParse(body);
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
  const res = await redeemTicket(
    parsed.data.code,
    parsed.data.event_id ?? null,
  );
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 400);
  }
  return c.json({ ok: true, data: res.data } as const);
});

export default kiosk;
