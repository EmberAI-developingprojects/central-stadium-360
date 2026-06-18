import { Hono } from "hono";
import type {
  AdminTicketRow,
  AdminTicketStats,
  TicketStatus,
  TicketType,
} from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";
import { getViewedUserCount } from "./watch";

const adminTickets = new Hono<AuthEnv>();

adminTickets.use("*", requireUser);
adminTickets.use("*", async (c, next) => requireAdmin(c, next));

type RawTicketRow = {
  id: string;
  user_id: string;
  event_id: string;
  status: TicketStatus;
  ticket_type: TicketType;
  price: number;
  qpay_invoice_id: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  access_expires_at: string | null;
  users: {
    email: string | null;
    phone: string | null;
    full_name: string | null;
  } | null;
  events: { title: string | null } | null;
};

const SELECT_COLS = `
  id,user_id,event_id,status,ticket_type,price,qpay_invoice_id,created_at,paid_at,refunded_at,access_expires_at,
  users:users(email,phone,full_name),
  events:events(title)
`.replace(/\s+/g, "");

function toRow(r: RawTicketRow): AdminTicketRow {
  return {
    id: r.id,
    user_id: r.user_id,
    event_id: r.event_id,
    status: r.status,
    ticket_type: r.ticket_type,
    price: r.price,
    qpay_invoice_id: r.qpay_invoice_id,
    created_at: r.created_at,
    paid_at: r.paid_at,
    refunded_at: r.refunded_at,
    access_expires_at: r.access_expires_at,
    user_email: r.users?.email ?? null,
    user_phone: r.users?.phone ?? null,
    user_full_name: r.users?.full_name ?? null,
    event_title: r.events?.title ?? null,
  };
}

adminTickets.get("/", async (c) => {
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
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = admin
    .from("tickets")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (eventId) query = query.eq("event_id", eventId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }

  const rows = ((data ?? []) as unknown as RawTicketRow[]).map(toRow);
  return c.json({ ok: true, data: rows } as const);
});

adminTickets.get("/stats", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const { data, error } = await admin
    .from("tickets")
    .select("status,price,event_id,paid_at,created_at");
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows = (data ?? []) as {
    status: TicketStatus;
    price: number;
    event_id: string;
    paid_at: string | null;
    created_at: string;
  }[];
  const paid = rows.filter((r) => r.status === "paid");
  const revenue = paid.reduce((s, r) => s + (Number(r.price) || 0), 0);
  const byEvent: Record<string, number> = {};
  paid.forEach((r) => {
    byEvent[r.event_id] = (byEvent[r.event_id] || 0) + (Number(r.price) || 0);
  });

  const today = new Date();
  const last30d: { date: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const sum = paid
      .filter((r) => (r.paid_at || r.created_at || "").slice(0, 10) === key)
      .reduce((s, r) => s + (Number(r.price) || 0), 0);
    last30d.push({ date: key, total: sum });
  }

  const stats: AdminTicketStats = {
    revenue,
    count: rows.length,
    paidCount: paid.length,
    viewerCount: await getViewedUserCount(),
    byEvent,
    last30d,
  };
  return c.json({ ok: true, data: stats } as const);
});

adminTickets.get("/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data, error } = await admin
    .from("tickets")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!data) return c.json({ ok: false, error: "not_found" } as const, 404);
  return c.json({
    ok: true,
    data: toRow(data as unknown as RawTicketRow),
  } as const);
});

adminTickets.post("/:id/refund", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data: existing, error: selErr } = await admin
    .from("tickets")
    .select("id,status")
    .eq("id", id)
    .maybeSingle<{ id: string; status: TicketStatus }>();
  if (selErr) {
    return c.json({ ok: false, error: selErr.message } as const, 500);
  }
  if (!existing) return c.json({ ok: false, error: "not_found" } as const, 404);
  if (existing.status !== "paid") {
    return c.json({ ok: false, error: "not_paid" } as const, 409);
  }

  const { error: updErr } = await admin
    .from("tickets")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    return c.json({ ok: false, error: updErr.message } as const, 500);
  }

  const { data: row } = await admin
    .from("tickets")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (!row) return c.json({ ok: false, error: "not_found" } as const, 404);
  return c.json({
    ok: true,
    data: toRow(row as unknown as RawTicketRow),
  } as const);
});

adminTickets.delete("/:id", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { error } = await admin.from("tickets").delete().eq("id", id);
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({ ok: true, data: { id } } as const);
});

export default adminTickets;
