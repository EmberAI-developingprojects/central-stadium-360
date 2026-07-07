import { randomUUID } from "node:crypto";
import type {
  TicketCreateResponse,
  TicketType,
  TicketTier,
} from "@cs360/shared";
import { TICKET_TIERS } from "@cs360/shared";
import { getSupabaseAdmin } from "./supabase";
import { createInvoice, getInvoice, isQPayConfigured } from "./qpay";
import { buildCallbackUrl, getCallbackSecret } from "./qpay-signature";

export async function markUserViewed(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("users")
    .update({ first_viewed_at: new Date().toISOString() })
    .eq("id", userId)
    .is("first_viewed_at", null);
}

/**
 * PostgREST `or` filter: a ticket is usable while its access window is open.
 * A NULL expiry means "not stamped yet" (the event's live_end_at wasn't known
 * at purchase/payment time) — treat it as open, not expired; the window gets
 * stamped when the admin sets live_end_at or by resolvePaidAccessExpiry.
 */
function notExpiredFilter(nowIso: string): string {
  return `access_expires_at.is.null,access_expires_at.gt.${nowIso}`;
}

export async function hasValidTicketForEvent(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("tickets")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("status", "paid")
    .in("ticket_type", ["live", "replay"])
    .or(notExpiredFilter(nowIso))
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) {
    return false;
  }
  return Boolean(data);
}

export type LiveTicketRow = {
  id: string;
  tier: TicketTier | null;
  max_devices: number | null;
};

export async function findBestLiveTicket(
  userId: string,
  eventId: string,
): Promise<LiveTicketRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("tickets")
    .select("id,tier,max_devices")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("status", "paid")
    .in("ticket_type", ["live", "replay"])
    .or(notExpiredFilter(nowIso))
    .order("max_devices", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<LiveTicketRow>();
  if (error) return null;
  return data;
}

/**
 * Replay/VOD access — stricter than {@link hasValidTicketForEvent}. Only the
 * `multi5` tier bundles replay; legacy `replay`-type tickets keep their access.
 * A `standard` or `multi3` (live-only) ticket does NOT grant replay, even though
 * it grants live viewing. Same expiry semantics as the live check.
 */
export async function hasReplayAccess(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("tickets")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("status", "paid")
    .or(notExpiredFilter(nowIso))
    .or("ticket_type.eq.replay,tier.eq.multi5")
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) {
    return false;
  }
  return Boolean(data);
}

export async function hasPaidTicket(
  userId: string,
  eventId: string,
  ticketType: TicketType,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("tickets")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("status", "paid")
    .eq("ticket_type", ticketType)
    .or(notExpiredFilter(nowIso))
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) {
    return false;
  }
  return Boolean(data);
}

export type PendingTicketRow = {
  id: string;
  qpay_invoice_id: string;
  price: number;
};

export async function findRecentPendingTicket(
  userId: string,
  eventId: string,
  ticketType: TicketType,
  withinMinutes = 15,
): Promise<PendingTicketRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const sinceIso = new Date(
    Date.now() - withinMinutes * 60 * 1000,
  ).toISOString();
  const { data, error } = await admin
    .from("tickets")
    .select("id,qpay_invoice_id,price")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("ticket_type", ticketType)
    .eq("status", "pending")
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      qpay_invoice_id: string | null;
      price: number;
    }>();
  if (error || !data || !data.qpay_invoice_id) return null;
  return {
    id: data.id,
    qpay_invoice_id: data.qpay_invoice_id,
    price: data.price,
  };
}

export type ReusePendingResult =
  | { ok: true; data: TicketCreateResponse }
  | { ok: false; recreate: true };

export async function reusePendingInvoice(
  pending: PendingTicketRow,
  eventId: string,
): Promise<ReusePendingResult> {
  try {
    const invoice = await getInvoice(pending.qpay_invoice_id);
    if (!invoice.qr_text || !invoice.qr_image) {
      throw new Error("qpay_invoice_missing_qr");
    }
    const data: TicketCreateResponse = {
      ticket_id: pending.id,
      event_id: eventId,
      price: pending.price,
      invoice_id: invoice.invoice_id,
      qr_text: invoice.qr_text,
      qr_image: invoice.qr_image,
      urls: invoice.urls,
      reused: true,
    };
    return { ok: true, data };
  } catch (_err) {
    const admin = getSupabaseAdmin();
    if (admin) {
      await admin
        .from("tickets")
        .delete()
        .eq("id", pending.id)
        .eq("status", "pending");
    }
    return { ok: false, recreate: true };
  }
}

const LIVE_ACCESS_WINDOW_DAYS = 30;
const LEGACY_REPLAY_WINDOW_DAYS = 30;

export type CreateTicketInvoiceInput = {
  userId: string;
  event: {
    id: string;
    title: string;
    live_end_at?: string | null;
    replay_available_until?: string | null;
  };
  ticketType: TicketType;
  price: number;
  tier?: TicketTier;
  maxDevices?: number;
};

// Asia/Ulaanbaatar is a fixed UTC+8 (no DST since 2017).
const UB_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * First instant of the next calendar month in Ulaanbaatar time. Replay tiers
 * stay watchable "until the event's month ends" — Naadam live on Jul 11 →
 * replay available through Jul 31, expiring Aug 1 00:00 UB.
 */
function endOfMonthUlaanbaatar(iso: string): string | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const local = new Date(t + UB_OFFSET_MS);
  const nextMonthUtcMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth() + 1,
    1,
  );
  return new Date(nextMonthUtcMs - UB_OFFSET_MS).toISOString();
}

export type EventAccessWindow = {
  live_end_at?: string | null;
  /** Admin-set replay window ("нөхөж үзэх хоног" on the event form). */
  replay_available_until?: string | null;
};

/**
 * When a ticket's access ends. Live-only tiers get 30 days past live end.
 * Replay tiers follow the admin-set event replay window; if the admin didn't
 * set one, fall back to the end of the event's month (UB time).
 */
export function tierAccessExpiry(
  tier: TicketTier | null | undefined,
  event: EventAccessWindow,
): string | null {
  const liveEndAtIso = event.live_end_at;
  if (!liveEndAtIso) return null;
  const end = new Date(liveEndAtIso).getTime();
  if (Number.isNaN(end)) return null;
  if (tier && TICKET_TIERS[tier].replay) {
    const until = event.replay_available_until
      ? new Date(event.replay_available_until).getTime()
      : NaN;
    if (Number.isFinite(until) && until > end) {
      return new Date(until).toISOString();
    }
    return endOfMonthUlaanbaatar(liveEndAtIso);
  }
  return new Date(
    end + LIVE_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

/**
 * Re-anchor every live-type ticket of an event after the admin changes its
 * live end or replay window — reads the event's current window itself so all
 * callers stay in sync with the stored values.
 */
export async function stampAccessExpiryForEvent(eventId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { data: event } = await admin
    .from("events")
    .select("live_end_at,replay_available_until")
    .eq("id", eventId)
    .maybeSingle<EventAccessWindow>();
  if (!event?.live_end_at) return;
  for (const tier of Object.keys(TICKET_TIERS) as TicketTier[]) {
    const expiry = tierAccessExpiry(tier, event);
    if (!expiry) continue;
    await admin
      .from("tickets")
      .update({ access_expires_at: expiry })
      .eq("event_id", eventId)
      .eq("ticket_type", "live")
      .eq("tier", tier)
      .in("status", ["pending", "paid"]);
  }
}

/**
 * Expiry to stamp when a pending ticket flips to paid and none was stored at
 * purchase time (event live_end_at unknown then). Legacy replay tickets run
 * 30 days from payment; live tickets anchor on the event's live end per tier.
 * Returns undefined when nothing should be stamped (yet).
 */
export async function resolvePaidAccessExpiry(
  ticket: {
    ticket_type: TicketType;
    access_expires_at: string | null;
    tier?: TicketTier | null;
    event_id?: string | null;
  },
  nowDate: Date,
): Promise<string | undefined> {
  if (ticket.access_expires_at) return undefined;
  if (ticket.ticket_type === "replay") {
    return new Date(
      nowDate.getTime() + LEGACY_REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
  }
  if (!ticket.event_id) return undefined;
  const admin = getSupabaseAdmin();
  if (!admin) return undefined;
  const { data } = await admin
    .from("events")
    .select("live_end_at,replay_available_until")
    .eq("id", ticket.event_id)
    .maybeSingle<EventAccessWindow>();
  if (!data) return undefined;
  return tierAccessExpiry(ticket.tier ?? null, data) ?? undefined;
}

export type CreateTicketInvoiceResult =
  | { ok: true; data: TicketCreateResponse }
  | { ok: false; error: string; status: number };

export async function createTicketInvoice(
  input: CreateTicketInvoiceInput,
): Promise<CreateTicketInvoiceResult> {
  const { userId, event, ticketType, price, tier, maxDevices } = input;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "supabase_not_configured", status: 503 };
  }
  if (price <= 0) {
    return { ok: false, error: "event_not_for_sale", status: 409 };
  }
  if (!isQPayConfigured()) {
    return { ok: false, error: "qpay_not_configured", status: 503 };
  }
  const secret = getCallbackSecret();
  if (!secret) {
    return {
      ok: false,
      error: "qpay_callback_secret_missing",
      status: 503,
    };
  }

  const ticketId = randomUUID();
  const accessExpiresAt =
    ticketType === "live" ? tierAccessExpiry(tier, event) : null;
  const { error: insertErr } = await admin.from("tickets").insert({
    id: ticketId,
    user_id: userId,
    event_id: event.id,
    status: "pending",
    ticket_type: ticketType,
    ...(tier ? { tier } : {}),
    ...(maxDevices ? { max_devices: maxDevices } : {}),
    price,
    access_expires_at: accessExpiresAt,
  });
  if (insertErr) {
    return { ok: false, error: "ticket_insert_failed", status: 500 };
  }

  const backendUrl =
    process.env.PUBLIC_BACKEND_URL ??
    process.env.BACKEND_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;
  const callbackUrl = buildCallbackUrl(backendUrl, ticketId, secret);

  let invoice;
  try {
    invoice = await createInvoice({
      senderInvoiceNo: ticketId,
      receiverCode: userId,
      amountMnt: price,
      description: `Ticket: ${event.title}`,
      callbackUrl,
    });
  } catch (_err) {
    await admin.from("tickets").delete().eq("id", ticketId);
    return { ok: false, error: "qpay_invoice_failed", status: 502 };
  }

  await admin
    .from("tickets")
    .update({ qpay_invoice_id: invoice.invoice_id })
    .eq("id", ticketId);

  const data: TicketCreateResponse = {
    ticket_id: ticketId,
    event_id: event.id,
    price,
    invoice_id: invoice.invoice_id,
    qr_text: invoice.qr_text,
    qr_image: invoice.qr_image,
    urls: invoice.urls,
    access_expires_at: accessExpiresAt,
  };
  return { ok: true, data };
}
