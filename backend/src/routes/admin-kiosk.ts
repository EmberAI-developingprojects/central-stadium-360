import { Hono } from "hono";
import { z } from "zod";
import type {
  AdminVenueOrderDetail,
  AdminVenueOrderRow,
  AdminVenueStats,
  DbVenueOrder,
  DbVenueTicket,
  KioskEvent,
  KioskZone,
  TicketStatus,
} from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";
import {
  applyCardResult,
  createKioskOrder,
  getKioskOrderStatus,
} from "../lib/venue";

// Admin-authenticated counterpart to the device-keyed /kiosk routes: lets a
// signed-in staff member sell in-person tickets from the admin panel, and read
// back the in-person sales they generate. The order lifecycle reuses the exact
// same venue domain logic as the physical kiosk (capacity reservation, QPay /
// card settlement, e-barimt) — only the auth boundary differs.
const adminKiosk = new Hono<AuthEnv>();

adminKiosk.use("*", requireUser);
adminKiosk.use("*", async (c, next) => requireAdmin(c, next));

const ZONE_COLS =
  "id,event_id,name_mn,name_en,desc_mn,desc_en,price,capacity,sold,color,sort_order,created_at";
const ORDER_COLS =
  "id,event_id,reference,status,items,total,payment_method,qpay_invoice_id,paid_at,buyer_phone,ebarimt_id,ebarimt_qr_data,ebarimt_lottery,kiosk_id,created_at";

// --- POS: events currently on sale, with their in-person zones ---------------
adminKiosk.get("/events", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
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

// --- Report: aggregate counts ------------------------------------------------
adminKiosk.get("/stats", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const { data, error } = await admin
    .from("venue_orders")
    .select("status,total");
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows = (data ?? []) as { status: TicketStatus; total: number }[];
  const paid = rows.filter((r) => r.status === "paid");
  const revenue = paid.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const { count: ticketCount } = await admin
    .from("venue_tickets")
    .select("id", { count: "exact", head: true });

  const stats: AdminVenueStats = {
    revenue,
    orderCount: rows.length,
    paidCount: paid.length,
    ticketCount: ticketCount ?? 0,
  };
  return c.json({ ok: true, data: stats } as const);
});

// --- Report: list venue orders -----------------------------------------------
type RawOrderRow = DbVenueOrder & {
  events: { title: string | null } | null;
  venue_tickets: { count: number }[] | null;
};

adminKiosk.get("/orders", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const url = new URL(c.req.url);
  const status = url.searchParams.get("status");
  const eventId = url.searchParams.get("eventId");

  let query = admin
    .from("venue_orders")
    .select(`${ORDER_COLS},events:events(title),venue_tickets(count)`)
    .order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows: AdminVenueOrderRow[] = (
    (data ?? []) as unknown as RawOrderRow[]
  ).map((r) => {
    const { events, venue_tickets, ...order } = r;
    return {
      ...order,
      event_title: events?.title ?? null,
      ticket_count: venue_tickets?.[0]?.count ?? 0,
    };
  });
  return c.json({ ok: true, data: rows } as const);
});

// --- POS: create an in-person order (reuses the kiosk domain logic) ----------
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
});

adminKiosk.post("/orders", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() } as const,
      400,
    );
  }
  const staff = c.get("user");
  const res = await createKioskOrder({
    ...parsed.data,
    kiosk_id: `admin:${staff.id}`,
  });
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 400);
  }
  return c.json({ ok: true, data: res.data } as const);
});

// --- POS: poll/settle a pending order ---------------------------------------
adminKiosk.get("/orders/:id/status", async (c) => {
  const res = await getKioskOrderStatus(c.req.param("id"));
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 404);
  }
  return c.json({ ok: true, data: res.data } as const);
});

// --- POS: settle a card / cash sale at the counter --------------------------
const cardResultSchema = z.object({
  approved: z.boolean(),
  ebarimt: z.object({ qrData: z.string(), lottery: z.string() }).optional(),
});

adminKiosk.post("/orders/:id/card-result", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = cardResultSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() } as const,
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

// --- Report: a single venue order with its minted tickets -------------------
adminKiosk.get("/orders/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }
  const id = c.req.param("id");
  const { data, error } = await admin
    .from("venue_orders")
    .select(`${ORDER_COLS},events:events(title)`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) return c.json({ ok: false, error: "not_found" } as const, 404);

  const { events, ...order } = data as unknown as DbVenueOrder & {
    events: { title: string | null } | null;
  };
  const { data: tickets } = await admin
    .from("venue_tickets")
    .select("id,order_id,zone_id,code,status,used_at,created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const detail: AdminVenueOrderDetail = {
    ...order,
    event_title: events?.title ?? null,
    ticket_count: tickets?.length ?? 0,
    tickets: (tickets ?? []) as DbVenueTicket[],
  };
  return c.json({ ok: true, data: detail } as const);
});

export default adminKiosk;
