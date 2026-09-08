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
  cancelEbarimtV3,
  createEbarimt,
  createEbarimtV3,
  createInvoice,
  getInvoice,
  isEbarimtV3Enabled,
  isQPayConfigured,
} from "./qpay";
import { buildCallbackUrl, getCallbackSecret } from "./qpay-signature";
import {
  isEbarimtConfigured,
  issueReceipt,
  sendData,
  voidReceipt,
} from "./ebarimt";

function posapiForOnline(): boolean {
  return process.env.EBARIMT_POSAPI_FOR_ONLINE === "1";
}

export async function issueEbarimtForTicket(
  ticketId: string,
  opts: {
    eventTitle: string;
    ticketType: TicketType;
    price: number;
    qpayPaymentId?: string | null;
    customerTin?: string | null;
  },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const useQpayCloud = Boolean(opts.qpayPaymentId) && !posapiForOnline();
  try {
    let receipt: { id: string; qrData: string; lottery: string } | null;
    if (useQpayCloud && isEbarimtV3Enabled()) {
      receipt = await createEbarimtV3(
        opts.qpayPaymentId!,
        opts.customerTin ? "COMPANY" : "CITIZEN",
      );
    } else if (useQpayCloud) {
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
    await admin
      .from("tickets")
      .update({
        ...(opts.qpayPaymentId ? { qpay_payment_id: opts.qpayPaymentId } : {}),
        ...(receipt
          ? {
              ebarimt_id: receipt.id,
              ebarimt_qr_data: receipt.qrData,
              ebarimt_lottery: receipt.lottery,
            }
          : {}),
      })
      .eq("id", ticketId)
      .is("ebarimt_lottery", null);
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

export async function voidEbarimtForTicket(ticket: {
  ebarimt_id: string | null;
  qpay_payment_id?: string | null;
}): Promise<VoidEbarimtResult> {
  const ebarimtId = ticket.ebarimt_id;
  if (!ebarimtId) return { voided: false, reason: "no_receipt" };

  const isPosApiId = /^\d{20,}$/.test(ebarimtId);
  try {
    if (!isPosApiId && isEbarimtV3Enabled() && ticket.qpay_payment_id) {
      await cancelEbarimtV3(ticket.qpay_payment_id);
      return { voided: true, alreadyVoided: false, rail: "qpay" };
    }
    if (isPosApiId) {
      if (!isEbarimtConfigured()) {
        return { voided: false, reason: "not_configured" };
      }
      const r = await voidReceipt({ id: ebarimtId });
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
  ebarimtTin?: string | null;
};

const UB_OFFSET_MS = 8 * 60 * 60 * 1000;

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
  replay_available_until?: string | null;
};

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

  if (process.env.DEV_FAKE_PAY === "1") {
    const ticketId = randomUUID();
    const nowIso = new Date().toISOString();
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
      branchCode: "web",
      amountMnt: price,
      description: `Ticket: ${event.title}`,
      lines: [
        {
          description: `${event.title} (${ticketType})`,
          qty: 1,
          unitPrice: price,
          note: tier ?? undefined,
        },
      ],
      customerTin: ebarimtTin,
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
