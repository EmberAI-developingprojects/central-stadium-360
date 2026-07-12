import { Hono } from "hono";
import { z } from "zod";
import type { DbTicket } from "@cs360/shared";
import { TICKET_TIERS, tierPriceForEvent } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireUser, type AuthEnv } from "../middleware/require-user";
import {
  createTicketInvoice,
  findRecentPendingTicket,
  hasPaidTicket,
  reusePendingInvoice,
  voidEbarimtForTicket,
} from "../lib/tickets";

const tickets = new Hono<AuthEnv>();

tickets.use("*", requireUser);

const createSchema = z.object({
  event_id: z.string().uuid(),
  ticket_type: z.enum(["live", "replay"]).optional(),
  // New tier model. When provided, price comes from the fixed TICKET_TIERS
  // catalog and the ticket grants live access on the tier's device cap.
  tier: z.enum(["standard", "multi3", "multi5"]).optional(),
  // Optional buyer company TIN (7-14 digits) → issues a B2B e-barimt.
  ebarimt_tin: z
    .string()
    .trim()
    .regex(/^\d{7,14}$/)
    .optional(),
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
  const { event_id, tier } = parsed.data;
  // A tier purchase always grants live access (replay is bundled into multi5 and
  // gated by tier, not ticket_type). Legacy callers may still send ticket_type.
  const ticket_type = tier ? "live" : (parsed.data.ticket_type ?? "live");

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data: event, error: evErr } = await admin
    .from("events")
    .select(
      "id, title, status, price, live_price, replay_price, price_standard, price_multi3, price_multi5, live_end_at, replay_available_until",
    )
    .eq("id", event_id)
    .maybeSingle<{
      id: string;
      title: string;
      status: "upcoming" | "live" | "ended" | "archived" | "expired";
      price: number;
      live_price: number;
      replay_price: number;
      price_standard: number | null;
      price_multi3: number | null;
      price_multi5: number | null;
      live_end_at: string | null;
      replay_available_until: string | null;
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
    return c.json({ ok: false, error: "ticket_already_owned" } as const, 409);
  }

  // Tier prices are per-event (admin-set) with platform defaults as fallback.
  const tierPrice = tier ? tierPriceForEvent(tier, event) : null;

  const pending = await findRecentPendingTicket(user.id, event.id, ticket_type);
  // Only reuse a pending invoice if its amount still matches the selected tier —
  // otherwise the user switched tiers and must get a fresh, correctly-priced QR.
  if (pending && (tierPrice === null || pending.price === tierPrice)) {
    const reuse = await reusePendingInvoice(pending, event.id);
    if (reuse.ok) {
      return c.json({ ok: true, data: reuse.data } as const);
    }
  }

  const price =
    tierPrice ??
    (ticket_type === "replay"
      ? Number(event.replay_price ?? 0) || event.price
      : Number(event.live_price ?? 0) || event.price);

  const res = await createTicketInvoice({
    userId: user.id,
    event: {
      id: event.id,
      title: event.title,
      live_end_at: event.live_end_at,
      replay_available_until: event.replay_available_until,
    },
    ticketType: ticket_type,
    price,
    ...(tier
      ? { tier, maxDevices: TICKET_TIERS[tier].maxDevices }
      : {}),
    ...(parsed.data.ebarimt_tin
      ? { ebarimtTin: parsed.data.ebarimt_tin }
      : {}),
  });
  if (!res.ok) {
    return c.json(
      { ok: false, error: res.error } as const,
      res.status as 400 | 403 | 404 | 409 | 500 | 502 | 503,
    );
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
      "id,user_id,event_id,status,ticket_type,price,qpay_invoice_id,created_at,paid_at,refunded_at,ebarimt_id,ebarimt_qr_data,ebarimt_lottery",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }

  return c.json({ ok: true, data: (data ?? []) as DbTicket[] } as const);
});

const MY_SELECT_COLS =
  "id,user_id,event_id,status,ticket_type,price,qpay_invoice_id,created_at,paid_at,refunded_at,ebarimt_id,ebarimt_qr_data,ebarimt_lottery";

/**
 * User self-service refund ("тасалбар буцаах"). The buyer refunds their OWN paid
 * ticket: it voids ("буцаалт") the attached eBarimt fiscal receipt on the same
 * dual rail as the admin refund ({@link voidEbarimtForTicket}) and flips the
 * ticket to `refunded`. Ownership is enforced (a user can only refund their own
 * ticket) and only a `paid` ticket is refundable. Idempotent: re-refunding an
 * already-`refunded` ticket returns the current row without erroring.
 *
 * Business rule: only `live` tickets are self-refundable, and only until
 * 30 minutes after the event's live start (live_start_at ?? start_time).
 * Admin refunds (admin-tickets route) stay unrestricted for support cases.
 */
const REFUND_WINDOW_AFTER_START_MS = 30 * 60 * 1000;

tickets.post("/:id/refund", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data: existing, error: selErr } = await admin
    .from("tickets")
    .select("id,user_id,status,ebarimt_id,ticket_type,event_id")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: DbTicket["status"];
      ebarimt_id: string | null;
      ticket_type: DbTicket["ticket_type"];
      event_id: string;
    }>();
  if (selErr) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!existing) return c.json({ ok: false, error: "not_found" } as const, 404);
  if (existing.user_id !== user.id) {
    return c.json({ ok: false, error: "forbidden" } as const, 403);
  }

  // Idempotent: an already-refunded ticket just returns its current state.
  if (existing.status === "refunded") {
    const { data: row } = await admin
      .from("tickets")
      .select(MY_SELECT_COLS)
      .eq("id", id)
      .maybeSingle();
    return c.json({
      ok: true,
      data: row as DbTicket,
      ebarimt: { voided: false, reason: "no_receipt" } as const,
    } as const);
  }
  if (existing.status !== "paid") {
    return c.json({ ok: false, error: "not_paid" } as const, 409);
  }

  // Only live tickets are self-refundable.
  if (existing.ticket_type !== "live") {
    return c.json({ ok: false, error: "not_refundable" } as const, 409);
  }

  // Refund window: until 30 minutes after the live start. An event without a
  // start timestamp (unscheduled) stays refundable.
  const { data: ev } = await admin
    .from("events")
    .select("start_time,live_start_at")
    .eq("id", existing.event_id)
    .maybeSingle<{ start_time: string | null; live_start_at: string | null }>();
  const startIso = ev?.live_start_at ?? ev?.start_time ?? null;
  if (startIso) {
    const startMs = new Date(startIso).getTime();
    if (
      Number.isFinite(startMs) &&
      Date.now() > startMs + REFUND_WINDOW_AFTER_START_MS
    ) {
      return c.json({ ok: false, error: "refund_window_closed" } as const, 409);
    }
  }

  // Void the fiscal eBarimt receipt first. Best-effort: it never throws, so a
  // POS/QPay hiccup can't strand the ticket in a paid state — the outcome is
  // surfaced in the response.
  const ebarimt = await voidEbarimtForTicket({
    ebarimt_id: existing.ebarimt_id,
  });

  const { error: updErr } = await admin
    .from("tickets")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "paid");
  if (updErr) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }

  const { data: row } = await admin
    .from("tickets")
    .select(MY_SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (!row) return c.json({ ok: false, error: "not_found" } as const, 404);
  return c.json({ ok: true, data: row as DbTicket, ebarimt } as const);
});

export default tickets;
