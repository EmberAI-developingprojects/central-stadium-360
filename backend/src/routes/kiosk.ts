import { Hono } from "hono";
import { z } from "zod";
import type {
  DbVenueOrder,
  KioskEvent,
  KioskZone,
  VenueOrderItem,
} from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireKiosk, type KioskEnv } from "../middleware/require-kiosk";
import {
  applyCardResult,
  createKioskOrder,
  expireStalePendingOrders,
  getKioskOrderStatus,
  kioskSaleCutoffIso,
  redeemTicket,
  retryEbarimtForOrder,
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
  await expireStalePendingOrders();
  const { data, error } = await withChannelFallback((withChannels) => {
    const q = admin
      .from("events")
      .select(
        `id,title,description,status,start_time,image,thumbnail_url,zones(${ZONE_COLS})`,
      )
      .in("status", ["upcoming", "live"])
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
      .filter((z) => z.capacity > 0)
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

const PRINT_JOB_WINDOW_MS = 15 * 60 * 1000;

type PrintJobOrderRow = {
  id: string;
  reference: string;
  items: VenueOrderItem[];
  total: number;
  payment_method: string | null;
  paid_at: string | null;
  kiosk_id: string | null;
  qpay_invoice_id: string | null;
  status: string;
  ebarimt_id: string | null;
  ebarimt_ddtd: string | null;
  ebarimt_qr_data: string | null;
  ebarimt_lottery: string | null;
  ebarimt_date: string | null;
  ebarimt_vat: number | string | null;
  ebarimt_city_tax: number | string | null;
  ebarimt_customer_tin: string | null;
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
  await expireStalePendingOrders();
  const sinceIso = new Date(Date.now() - PRINT_JOB_WINDOW_MS).toISOString();
  let query = admin
    .from("venue_orders")
    .select(
      "id,reference,status,items,total,payment_method,paid_at,kiosk_id,qpay_invoice_id,ebarimt_id,ebarimt_ddtd,ebarimt_qr_data,ebarimt_lottery,ebarimt_date,ebarimt_vat,ebarimt_city_tax,ebarimt_customer_tin,events:events(title,start_time)",
    )
    .eq("status", "paid")
    .gte("paid_at", sinceIso)
    .order("paid_at", { ascending: true });
  const kioskId = c.get("kioskId");
  if (kioskId) query = query.eq("kiosk_id", kioskId);
  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const orders = (data ?? []) as unknown as PrintJobOrderRow[];

  const missing = orders.filter(
    (o) => o.payment_method === "qpay" && !o.ebarimt_lottery,
  );
  if (missing.length > 0) {
    await Promise.all(
      missing.map((o) =>
        retryEbarimtForOrder(o as unknown as DbVenueOrder).then((done) => {
          if (!done) return;
          return admin
            .from("venue_orders")
            .select(
              "ebarimt_id,ebarimt_ddtd,ebarimt_qr_data,ebarimt_lottery,ebarimt_date,ebarimt_vat,ebarimt_city_tax",
            )
            .eq("id", o.id)
            .maybeSingle()
            .then(({ data: fresh }) => {
              if (fresh) Object.assign(o, fresh);
            });
        }),
      ),
    );
  }

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
      ebarimt_ddtd: o.ebarimt_ddtd ?? o.ebarimt_id,
      ebarimt_qr_data: o.ebarimt_qr_data,
      ebarimt_lottery: o.ebarimt_lottery,
      ebarimt_date: o.ebarimt_date,
      ebarimt_vat: o.ebarimt_vat == null ? null : Number(o.ebarimt_vat),
      ebarimt_city_tax:
        o.ebarimt_city_tax == null ? null : Number(o.ebarimt_city_tax),
      // Present only on B2B sales; the bridge prints a Худ.авагч ТТД row.
      ebarimt_customer_tin: o.ebarimt_customer_tin,
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
  // B2B: buying company's register/TIN, 7-12 digits.
  customer_tin: z
    .string()
    .trim()
    .regex(/^\d{7,12}$/)
    .nullable()
    .optional(),
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
  ebarimt: z
    .object({
      id: z.string().nullable().optional(),
      qrData: z.string().optional(),
      ebarimt_qr_data: z.string().optional(),
      lottery: z.string().optional(),
      ebarimt_lottery: z.string().optional(),
    })
    .optional(),
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
  const res = await applyCardResult(
    c.req.param("id"),
    parsed.data.approved,
    parsed.data.ebarimt,
  );
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
