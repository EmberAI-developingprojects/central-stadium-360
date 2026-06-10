import { Hono } from "hono";
import { z } from "zod";
import type { DbTicket } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireUser, type AuthEnv } from "../middleware/require-user";
import {
  createTicketInvoice,
  findRecentPendingTicket,
  hasPaidTicket,
  reusePendingInvoice,
} from "../lib/tickets";

const tickets = new Hono<AuthEnv>();

tickets.use("*", requireUser);

const createSchema = z.object({
  event_id: z.string().uuid(),
  ticket_type: z.enum(["live", "replay"]).optional(),
});

tickets.post("/create", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
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
  const { event_id, ticket_type = "live" } = parsed.data;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data: event, error: evErr } = await admin
    .from("events")
    .select("id, title, status, price, live_price, replay_price, live_end_at")
    .eq("id", event_id)
    .maybeSingle<{
      id: string;
      title: string;
      status: "upcoming" | "live" | "ended" | "archived" | "expired";
      price: number;
      live_price: number;
      replay_price: number;
      live_end_at: string | null;
    }>();
  if (evErr) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!event) {
    return c.json({ ok: false, error: "event_not_found" } as const, 404);
  }
  if (ticket_type === "live" && event.status === "ended") {
    return c.json({ ok: false, error: "event_ended" } as const, 409);
  }

  const alreadyOwned = await hasPaidTicket(user.id, event.id, ticket_type);
  if (alreadyOwned) {
    return c.json(
      { ok: false, error: "ticket_already_owned" } as const,
      409,
    );
  }

  const pending = await findRecentPendingTicket(
    user.id,
    event.id,
    ticket_type,
  );
  if (pending) {
    const reuse = await reusePendingInvoice(pending, event.id);
    if (!reuse.ok) {
      return c.json(
        { ok: false, error: reuse.error } as const,
        reuse.status as 502,
      );
    }
    return c.json({ ok: true, data: reuse.data } as const);
  }

  const price =
    ticket_type === "replay"
      ? Number(event.replay_price ?? 0) || event.price
      : Number(event.live_price ?? 0) || event.price;

  const res = await createTicketInvoice({
    userId: user.id,
    event: {
      id: event.id,
      title: event.title,
      live_end_at: event.live_end_at,
    },
    ticketType: ticket_type,
    price,
  });
  if (!res.ok) {
    return c.json({ ok: false, error: res.error } as const, res.status as 400 | 403 | 404 | 409 | 500 | 502 | 503);
  }
  return c.json({ ok: true, data: res.data } as const);
});

tickets.get("/my", async (c) => {
  const user = c.get("user");
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data, error } = await admin
    .from("tickets")
    .select(
      "id,user_id,event_id,status,ticket_type,price,qpay_invoice_id,created_at,paid_at,refunded_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }

  return c.json({ ok: true, data: (data ?? []) as DbTicket[] } as const);
});

export default tickets;
