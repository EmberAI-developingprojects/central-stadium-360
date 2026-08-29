import { Hono } from "hono";
import { z } from "zod";
import type { KioskEvent, KioskZone, VenueOrderItem } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireKiosk, type KioskEnv } from "../middleware/require-kiosk";
import {
  applyCardResult,
  createKioskOrder,
  expireStalePendingOrders,
  getKioskOrderStatus,
  kioskSaleCutoffIso,
  redeemTicket,
} from "../lib/venue";
import {
  getCallbackSecret,
  verifyTicketSignature,
} from "../lib/qpay-signature";
import { withChannelFallback } from "../lib/event-channels";

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
  // Free capacity held by abandoned pending orders BEFORE reading zones, so
  // the availability the buyer sees is real.
  await expireStalePendingOrders();
  // Web-only events never reach the kiosk, even if they have zones.
  const { data, error } = await withChannelFallback((withChannels) => {
    const q = admin
      .from("events")
      .select(
        `id,title,description,status,start_time,image,thumbnail_url,zones(${ZONE_COLS})`,
      )
      .in("status", ["upcoming", "live"])
      // An event that started more than half a day ago is over — without an
      // explicit kiosk end time this cutoff is what retires it from the
      // counter, so stale events never linger as a "Зарагдсан" card.
      .gte("start_time", kioskSaleCutoffIso());
    return (withChannels ? q.eq("show_on_kiosk", true) : q).order(
      "start_time",
      { ascending: true },
    );
  });
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

/**
 * The shipped kiosk web build never calls the on-box bridge's /print routes,
 * so the bridge polls this feed instead and prints paid orders autonomously.
 * This only reports recent facts — print idempotency (never printing a code
 * twice) lives on the bridge in its printed-code ledger.
 */
const PRINT_JOB_WINDOW_MS = 15 * 60 * 1000;

type PrintJobOrderRow = {
  id: string;
  reference: string;
  items: VenueOrderItem[];
  total: number;
  payment_method: string | null;
  paid_at: string | null;
  kiosk_id: string | null;
  ebarimt_id: string | null;
  ebarimt_qr_data: string | null;
  ebarimt_lottery: string | null;
  events: { title: string | null; start_time: string | null } | null;
};

kiosk.get("/print-jobs", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  // The bridge hits this every few seconds — piggyback the stale-hold sweep
  // here so leaked reservations clear promptly even while nobody browses.
  await expireStalePendingOrders();
  const sinceIso = new Date(Date.now() - PRINT_JOB_WINDOW_MS).toISOString();
  let query = admin
    .from("venue_orders")
    .select(
      "id,reference,items,total,payment_method,paid_at,kiosk_id,ebarimt_id,ebarimt_qr_data,ebarimt_lottery,events:events(title,start_time)",
    )
    .eq("status", "paid")
    .gte("paid_at", sinceIso)
    .order("paid_at", { ascending: true });
  // Each box prints only its own sales — an order sold at gate-1 must not
  // come out of gate-2's printer (or an admin desk's).
  const kioskId = c.get("kioskId");
  if (kioskId) query = query.eq("kiosk_id", kioskId);
  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const orders = (data ?? []) as unknown as PrintJobOrderRow[];

  const byOrder = new Map<string, { code: string; zone_id: string }[]>();
  if (orders.length > 0) {
    const { data: tix, error: tErr } = await admin
      .from("venue_tickets")
      .select("order_id,code,zone_id")
      .in(
        "order_id",
        orders.map((o) => o.id),
      )
      .eq("status", "valid");
    if (tErr) {
      return c.json({ ok: false, error: tErr.message } as const, 500);
    }
    for (const t of (tix ?? []) as {
      order_id: string;
      code: string;
      zone_id: string;
    }[]) {
      const list = byOrder.get(t.order_id) ?? [];
      list.push({ code: t.code, zone_id: t.zone_id });
      byOrder.set(t.order_id, list);
    }
  }

  const jobs = orders.map((o) => {
    const zoneName = new Map(
      (o.items ?? []).map((i) => [i.zone_id, i.zone_name_mn]),
    );
    return {
      order_id: o.id,
      reference: o.reference,
      paid_at: o.paid_at,
      kiosk_id: o.kiosk_id,
      event_title: o.events?.title ?? null,
      event_start: o.events?.start_time ?? null,
      total: o.total,
      payment_method: o.payment_method,
      items: o.items ?? [],
      ebarimt_id: o.ebarimt_id,
      ebarimt_qr_data: o.ebarimt_qr_data,
      ebarimt_lottery: o.ebarimt_lottery,
      tickets: (byOrder.get(o.id) ?? []).map((t) => ({
        code: t.code,
        zone_name_mn: zoneName.get(t.zone_id) ?? "",
      })),
    };
  });
  return c.json({ ok: true, data: jobs } as const);
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
