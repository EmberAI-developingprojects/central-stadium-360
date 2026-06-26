import { Hono } from "hono";
import { z } from "zod";
import type {
  AdminAdmissionEvent,
  AdminAdmissionReport,
  AdminAdmissionScan,
  AdminAdmissionZone,
  AdminReconciliationReport,
  AdminReconciliationRow,
  AdminSellThroughEvent,
  AdminSellThroughReport,
  AdminSellThroughZone,
  AdminVenueOrderDetail,
  AdminVenueOrderRow,
  AdminVenueStats,
  DbVenueOrder,
  DbVenueTicket,
  KioskEvent,
  KioskZone,
  PaymentMethod,
  TicketStatus,
  VenueOrderItem,
  VenueTicketStatus,
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

const adminKiosk = new Hono<AuthEnv>();

adminKiosk.use("*", requireUser);
adminKiosk.use("*", async (c, next) => requireAdmin(c, next));

const ZONE_COLS =
  "id,event_id,name_mn,name_en,desc_mn,desc_en,price,capacity,sold,color,sort_order,created_at";
const ORDER_COLS =
  "id,event_id,reference,status,items,total,payment_method,qpay_invoice_id,paid_at,buyer_phone,ebarimt_id,ebarimt_qr_data,ebarimt_lottery,kiosk_id,created_at";

adminKiosk.get("/events", async (c) => {
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

adminKiosk.get("/stats", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
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

type SellThroughEventRow = {
  id: string;
  title: string;
  status: KioskEvent["status"];
  start_time: string;
  zones: (KioskZone & { sort_order: number; color: string | null })[];
};

adminKiosk.get("/sell-through", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const scope =
    new URL(c.req.url).searchParams.get("scope") === "all" ? "all" : "onsale";

  let eventQuery = admin
    .from("events")
    .select(`id,title,status,start_time,zones(${ZONE_COLS})`)
    .order("start_time", { ascending: true });
  if (scope === "onsale") {
    eventQuery = eventQuery.in("status", ["upcoming", "live"]);
  }
  const { data: evData, error: evErr } = await eventQuery;
  if (evErr) {
    return c.json({ ok: false, error: evErr.message } as const, 500);
  }
  const eventRows = (evData ?? []) as unknown as SellThroughEventRow[];
  const eventIds = eventRows.map((e) => e.id);

  const byZone = new Map<string, { sold: number; revenue: number }>();
  if (eventIds.length > 0) {
    const { data: paidData, error: paidErr } = await admin
      .from("venue_orders")
      .select("items")
      .eq("status", "paid")
      .in("event_id", eventIds);
    if (paidErr) {
      return c.json({ ok: false, error: paidErr.message } as const, 500);
    }
    for (const row of (paidData ?? []) as { items: VenueOrderItem[] }[]) {
      for (const it of row.items ?? []) {
        const agg = byZone.get(it.zone_id) ?? { sold: 0, revenue: 0 };
        agg.sold += it.qty;
        agg.revenue += it.qty * it.unit_price;
        byZone.set(it.zone_id, agg);
      }
    }
  }

  const events: AdminSellThroughEvent[] = eventRows.map((e) => {
    const zones: AdminSellThroughZone[] = [...(e.zones ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((z) => {
        const agg = byZone.get(z.id) ?? { sold: 0, revenue: 0 };
        const sold = Math.min(agg.sold, z.capacity);
        return {
          zone_id: z.id,
          name_mn: z.name_mn,
          color: z.color,
          price: z.price,
          capacity: z.capacity,
          sold,
          available: Math.max(0, z.capacity - sold),
          revenue: agg.revenue,
          pct: z.capacity > 0 ? sold / z.capacity : 0,
        };
      });
    const capacity = zones.reduce((s, z) => s + z.capacity, 0);
    const sold = zones.reduce((s, z) => s + z.sold, 0);
    const revenue = zones.reduce((s, z) => s + z.revenue, 0);
    return {
      event_id: e.id,
      title: e.title,
      status: e.status,
      start_time: e.start_time,
      capacity,
      sold,
      revenue,
      pct: capacity > 0 ? sold / capacity : 0,
      zones,
    };
  });

  const report: AdminSellThroughReport = {
    totals: {
      capacity: events.reduce((s, e) => s + e.capacity, 0),
      sold: events.reduce((s, e) => s + e.sold, 0),
      revenue: events.reduce((s, e) => s + e.revenue, 0),
      events: events.length,
    },
    events,
  };
  return c.json({ ok: true, data: report } as const);
});

type ReconOrderRow = {
  id: string;
  kiosk_id: string | null;
  payment_method: PaymentMethod | null;
  total: number;
  status: TicketStatus;
  paid_at: string | null;
};

adminKiosk.get("/reconciliation", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const url = new URL(c.req.url);
  const range = url.searchParams.get("range");
  const eventId = url.searchParams.get("eventId");

  let cutoff: string | null = null;
  if (range === "today") {
    const now = new Date();
    cutoff = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();
  } else if (range === "7d") {
    cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  let query = admin
    .from("venue_orders")
    .select("id,kiosk_id,payment_method,total,status,paid_at");
  if (eventId) query = query.eq("event_id", eventId);
  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const all = (data ?? []) as ReconOrderRow[];

  const inWindow = (o: ReconOrderRow): boolean =>
    !cutoff || (!!o.paid_at && o.paid_at >= cutoff);

  const paid = all.filter((o) => o.status === "paid" && inWindow(o));
  const voided = all.filter(
    (o) =>
      (o.status === "cancelled" || o.status === "refunded") &&
      (!cutoff || (!!o.paid_at && o.paid_at >= cutoff)),
  ).length;

  const paidIds = paid.map((o) => o.id);
  const ticketsByOrder = new Map<string, number>();
  if (paidIds.length > 0) {
    const { data: tData } = await admin
      .from("venue_tickets")
      .select("order_id")
      .in("order_id", paidIds);
    for (const t of (tData ?? []) as { order_id: string }[]) {
      ticketsByOrder.set(t.order_id, (ticketsByOrder.get(t.order_id) ?? 0) + 1);
    }
  }

  const staffIds = [
    ...new Set(
      paid
        .map((o) => o.kiosk_id)
        .filter((k): k is string => !!k && k.startsWith("admin:"))
        .map((k) => k.slice("admin:".length)),
    ),
  ];
  const staffNames = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id,full_name")
      .in("id", staffIds);
    for (const u of (users ?? []) as {
      id: string;
      full_name: string | null;
    }[]) {
      staffNames.set(u.id, u.full_name || "Ажилтан");
    }
  }

  const labelFor = (
    kioskId: string | null,
  ): { label: string; staffId: string | null } => {
    if (!kioskId) return { label: "Тодорхойгүй", staffId: null };
    if (kioskId.startsWith("admin:")) {
      const sid = kioskId.slice("admin:".length);
      return { label: staffNames.get(sid) ?? "Ажилтан", staffId: sid };
    }
    return { label: kioskId, staffId: null };
  };

  const groups = new Map<string, AdminReconciliationRow>();
  for (const o of paid) {
    const key = o.kiosk_id ?? "__none__";
    let row = groups.get(key);
    if (!row) {
      const { label, staffId } = labelFor(o.kiosk_id);
      row = {
        kiosk_id: o.kiosk_id,
        label,
        staff_id: staffId,
        orders: 0,
        tickets: 0,
        revenue: 0,
        qpay: 0,
        card: 0,
      };
      groups.set(key, row);
    }
    row.orders += 1;
    row.revenue += Number(o.total) || 0;
    row.tickets += ticketsByOrder.get(o.id) ?? 0;
    if (o.payment_method === "qpay") row.qpay += Number(o.total) || 0;
    else if (o.payment_method === "card") row.card += Number(o.total) || 0;
  }

  const kiosks = [...groups.values()].sort((a, b) => b.revenue - a.revenue);
  const report: AdminReconciliationReport = {
    totals: {
      revenue: kiosks.reduce((s, k) => s + k.revenue, 0),
      orders: kiosks.reduce((s, k) => s + k.orders, 0),
      tickets: kiosks.reduce((s, k) => s + k.tickets, 0),
      byMethod: {
        qpay: kiosks.reduce((s, k) => s + k.qpay, 0),
        card: kiosks.reduce((s, k) => s + k.card, 0),
      },
      voided,
    },
    kiosks,
  };
  return c.json({ ok: true, data: report } as const);
});

type AdmissionEventRow = {
  id: string;
  title: string;
  status: AdminAdmissionEvent["status"];
  start_time: string;
  zones: {
    id: string;
    name_mn: string;
    color: string | null;
    sort_order: number;
  }[];
};

adminKiosk.get("/admission", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const url = new URL(c.req.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "onsale";
  const eventId = url.searchParams.get("eventId");

  let eventQuery = admin
    .from("events")
    .select("id,title,status,start_time,zones(id,name_mn,color,sort_order)")
    .order("start_time", { ascending: true });
  if (eventId) eventQuery = eventQuery.eq("id", eventId);
  else if (scope === "onsale") {
    eventQuery = eventQuery.in("status", ["upcoming", "live"]);
  }
  const { data: evData, error: evErr } = await eventQuery;
  if (evErr) {
    return c.json({ ok: false, error: evErr.message } as const, 500);
  }
  const eventRows = (evData ?? []) as unknown as AdmissionEventRow[];

  const zoneMeta = new Map<
    string,
    { event_id: string; name_mn: string; color: string | null }
  >();
  const eventTitle = new Map<string, string>();
  const zoneIds: string[] = [];
  for (const e of eventRows) {
    eventTitle.set(e.id, e.title);
    for (const z of e.zones ?? []) {
      zoneMeta.set(z.id, {
        event_id: e.id,
        name_mn: z.name_mn,
        color: z.color,
      });
      zoneIds.push(z.id);
    }
  }

  const byZone = new Map<string, { sold: number; admitted: number }>();
  let recent: AdminAdmissionScan[] = [];
  if (zoneIds.length > 0) {
    const { data: tix, error: tErr } = await admin
      .from("venue_tickets")
      .select("zone_id,status")
      .in("zone_id", zoneIds);
    if (tErr) {
      return c.json({ ok: false, error: tErr.message } as const, 500);
    }
    for (const t of (tix ?? []) as {
      zone_id: string;
      status: VenueTicketStatus;
    }[]) {
      if (t.status === "void") continue;
      const agg = byZone.get(t.zone_id) ?? { sold: 0, admitted: 0 };
      agg.sold += 1;
      if (t.status === "used") agg.admitted += 1;
      byZone.set(t.zone_id, agg);
    }

    const { data: rs } = await admin
      .from("venue_tickets")
      .select("code,zone_id,used_at")
      .in("zone_id", zoneIds)
      .eq("status", "used")
      .order("used_at", { ascending: false })
      .limit(25);
    recent = (
      (rs ?? []) as { code: string; zone_id: string; used_at: string | null }[]
    )
      .filter((r) => !!r.used_at)
      .map((r) => {
        const zm = zoneMeta.get(r.zone_id);
        return {
          code: r.code,
          zone_name_mn: zm?.name_mn ?? null,
          event_title: zm ? (eventTitle.get(zm.event_id) ?? null) : null,
          used_at: r.used_at as string,
        };
      });
  }

  const events: AdminAdmissionEvent[] = eventRows.map((e) => {
    const zones: AdminAdmissionZone[] = [...(e.zones ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((z) => {
        const agg = byZone.get(z.id) ?? { sold: 0, admitted: 0 };
        return {
          zone_id: z.id,
          name_mn: z.name_mn,
          color: z.color,
          sold: agg.sold,
          admitted: agg.admitted,
          pct: agg.sold > 0 ? agg.admitted / agg.sold : 0,
        };
      });
    const sold = zones.reduce((s, z) => s + z.sold, 0);
    const admitted = zones.reduce((s, z) => s + z.admitted, 0);
    return {
      event_id: e.id,
      title: e.title,
      status: e.status,
      start_time: e.start_time,
      sold,
      admitted,
      no_show: sold - admitted,
      pct: sold > 0 ? admitted / sold : 0,
      zones,
    };
  });

  const report: AdminAdmissionReport = { events, recent };
  return c.json({ ok: true, data: report } as const);
});

type RawOrderRow = DbVenueOrder & {
  events: { title: string | null } | null;
  venue_tickets: { count: number }[] | null;
};

adminKiosk.get("/orders", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
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
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
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

adminKiosk.get("/orders/:id/status", async (c) => {
  const res = await getKioskOrderStatus(c.req.param("id"));
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 404);
  }
  return c.json({ ok: true, data: res.data } as const);
});

const cardResultSchema = z.object({
  approved: z.boolean(),
  ebarimt: z.object({ qrData: z.string(), lottery: z.string() }).optional(),
});

adminKiosk.post("/orders/:id/card-result", async (c) => {
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

adminKiosk.get("/orders/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
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
