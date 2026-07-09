import { randomUUID } from "node:crypto";
import type {
  TicketCreateResponse,
  TicketType,
  TicketTier,
} from "@cs360/shared";
import { TICKET_TIERS } from "@cs360/shared";
import { getSupabaseAdmin } from "./supabase";
import {
  cancelEbarimt,
  createEbarimt,
  createInvoice,
  getInvoice,
  isQPayConfigured,
} from "./qpay";
import { buildCallbackUrl, getCallbackSecret } from "./qpay-signature";
import {
  isEbarimtConfigured,
  issueReceipt,
  sendData,
  voidReceipt,
} from "./ebarimt";

/** Dev-only: route online-ticket e-barimt through the local PosAPI test rig. */
function posapiForOnline(): boolean {
  return process.env.EBARIMT_POSAPI_FOR_ONLINE === "1";
}

/**
 * Issue + persist an eBarimt fiscal receipt for a PAID online 360 ticket.
 *
 * Real QPay online payments get their receipt from QPay's cloud
 * (`createEbarimt(payment_id)`) — the correct rail for card-not-present online
 * sales. The local PosAPI 3.0 test rig is used only when `qpayPaymentId` is
 * absent (e.g. DEV_FAKE_PAY) or the `EBARIMT_POSAPI_FOR_ONLINE` dev flag is set.
 *
 * Best-effort: a failure is logged but never blocks the payment. The
 * `is('ebarimt_lottery', null)` guard keeps it idempotent — a second call on an
 * already-issued ticket won't overwrite or double-issue.
 */
export async function issueEbarimtForTicket(
  ticketId: string,
  opts: {
    eventTitle: string;
    ticketType: TicketType;
    price: number;
    /** QPay payment id for a real online payment; enables the cloud rail. */
    qpayPaymentId?: string | null;
    /** Buyer company TIN — issues a B2B receipt (no lottery) when present. */
    customerTin?: string | null;
  },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const useQpayCloud = Boolean(opts.qpayPaymentId) && !posapiForOnline();
  try {
    let receipt: { id: string; qrData: string; lottery: string };
    if (useQpayCloud) {
      const r = await createEbarimt(
        opts.qpayPaymentId!,
        opts.customerTin ? "COMPANY" : "CITIZEN",
      );
      receipt = {
        id: r.id,
        qrData: r.ebarimt_qr_data,
        lottery: r.ebarimt_lottery,
      };
    } else {
      if (!isEbarimtConfigured()) return;
      const r = await issueReceipt({
        lines: [
          {
            name: `${opts.eventTitle} (${opts.ticketType})`,
            qty: 1,
            unitPrice: opts.price,
          },
        ],
        paymentCode: "PAYMENT_CARD",
        customerTin: opts.customerTin,
      });
      receipt = { id: r.id, qrData: r.qrData, lottery: r.lottery };
    }
    // qrData/lottery are DISPLAY-ONLY — persisted here solely to re-render the
    // buyer's receipt QR, and MUST NEVER be logged (see `redactReceiptSecrets`
    // policy in lib/ebarimt.ts). Do not console.log `receipt` / `r`.
    await admin
      .from("tickets")
      .update({
        ebarimt_id: receipt.id,
        ebarimt_qr_data: receipt.qrData,
        ebarimt_lottery: receipt.lottery,
      })
      .eq("id", ticketId)
      .is("ebarimt_lottery", null);
    // PosAPI issuance only enters the on-box local queue — flush it to the
    // national eBarimt system so a freshly-issued receipt isn't left pending
    // until the POS's own schedule fires. Mirrors the void path. Best-effort;
    // the QPay cloud rail registers server-side and needs no local send.
    if (!useQpayCloud) {
      await sendData().catch((err) =>
        console.error("ebarimt_senddata_after_issue_failed", err),
      );
    }
  } catch (err) {
    console.error("ticket_ebarimt_failed", ticketId, err);
  }
}

export type VoidEbarimtResult =
  | { voided: true; alreadyVoided: boolean; rail: "posapi" | "qpay" }
  | { voided: false; reason: "no_receipt" | "not_configured" | "error" };

/**
 * Void ("буцаалт") the eBarimt receipt attached to a ticket that is being
 * refunded. Mirrors the dual-rail logic of {@link issueEbarimtForTicket}:
 * PosAPI-issued receipts are voided on the local POS (and the return is
 * transmitted via {@link sendData}); QPay-cloud receipts are cancelled through
 * QPay's API.
 *
 * The rail is inferred from the receipt id shape — PosAPI ids are long all-digit
 * strings (e.g. `0379008467880010967900000…`), QPay cloud ids are not. The
 * caller passes the persisted `ebarimt_id`.
 *
 * Best-effort: never throws. The ebarimt_* columns are left in place as an audit
 * trail of the (now-voided) receipt.
 */
export async function voidEbarimtForTicket(ticket: {
  ebarimt_id: string | null;
}): Promise<VoidEbarimtResult> {
  const ebarimtId = ticket.ebarimt_id;
  if (!ebarimtId) return { voided: false, reason: "no_receipt" };

  const isPosApiId = /^\d{20,}$/.test(ebarimtId);
  try {
    if (isPosApiId) {
      if (!isEbarimtConfigured()) {
        return { voided: false, reason: "not_configured" };
      }
      const r = await voidReceipt({ id: ebarimtId });
      // Transmit the return to the national eBarimt system (best-effort).
      await sendData().catch((err) =>
        console.error("ebarimt_senddata_after_void_failed", err),
      );
      return { voided: true, alreadyVoided: r.alreadyVoided, rail: "posapi" };
    }
    await cancelEbarimt(ebarimtId);
    return { voided: true, alreadyVoided: false, rail: "qpay" };
  } catch (err) {
    console.error("ticket_ebarimt_void_failed", ebarimtId, err);
    return { voided: false, reason: "error" };
  }
}

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
  /** Buyer company TIN for a B2B e-barimt (optional). */
  ebarimtTin?: string | null;
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
  const { userId, event, ticketType, price, tier, maxDevices, ebarimtTin } =
    input;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "supabase_not_configured", status: 503 };
  }
  if (price <= 0) {
    return { ok: false, error: "event_not_for_sale", status: 409 };
  }

  // Local dev-only bypass (gated on DEV_FAKE_PAY=1; never set in prod). Skips
  // QPay entirely: issues an immediately-PAID ticket with a synthetic invoice id
  // so the buy → watch flow can be exercised without a QPay merchant. The
  // payment-status poll returns paid because the row is already status='paid'.
  if (process.env.DEV_FAKE_PAY === "1") {
    const ticketId = randomUUID();
    const nowIso = new Date().toISOString();
    // Guarantee a future access window even if the event has no live_end_at,
    // so the ticket passes the watch-token access_expires_at > now() check.
    const fallbackExpiry = new Date(
      Date.now() + LIVE_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const accessExpiresAt =
      (ticketType === "live" ? tierAccessExpiry(tier, event) : null) ??
      fallbackExpiry;
    const fakeInvoiceId = `dev-${ticketId}`;
    const { error: insErr } = await admin.from("tickets").insert({
      id: ticketId,
      user_id: userId,
      event_id: event.id,
      status: "paid",
      ticket_type: ticketType,
      ...(tier ? { tier } : {}),
      ...(maxDevices ? { max_devices: maxDevices } : {}),
      ...(ebarimtTin ? { ebarimt_customer_tin: ebarimtTin } : {}),
      price,
      paid_at: nowIso,
      qpay_invoice_id: fakeInvoiceId,
      access_expires_at: accessExpiresAt,
    });
    if (insErr) {
      return { ok: false, error: "ticket_insert_failed", status: 500 };
    }
    // The dev ticket is already PAID → issue its eBarimt now (best-effort).
    await issueEbarimtForTicket(ticketId, {
      eventTitle: event.title,
      ticketType,
      price,
      customerTin: ebarimtTin,
    });
    const data: TicketCreateResponse = {
      ticket_id: ticketId,
      event_id: event.id,
      price,
      invoice_id: fakeInvoiceId,
      qr_text: "DEV-FAKE-PAYMENT",
      qr_image: "",
      urls: [],
      access_expires_at: accessExpiresAt,
    };
    return { ok: true, data };
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
    ...(ebarimtTin ? { ebarimt_customer_tin: ebarimtTin } : {}),
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
