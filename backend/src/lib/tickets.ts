import { randomUUID } from "node:crypto";
import type { TicketCreateResponse, TicketType } from "@cs360/shared";
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
    .gt("access_expires_at", nowIso)
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
    .gt("access_expires_at", nowIso)
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

export type CreateTicketInvoiceInput = {
  userId: string;
  event: { id: string; title: string; live_end_at?: string | null };
  ticketType: TicketType;
  price: number;
};

function liveAccessExpiry(
  liveEndAtIso: string | null | undefined,
): string | null {
  if (!liveEndAtIso) return null;
  const end = new Date(liveEndAtIso).getTime();
  if (Number.isNaN(end)) return null;
  return new Date(
    end + LIVE_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export type CreateTicketInvoiceResult =
  | { ok: true; data: TicketCreateResponse }
  | { ok: false; error: string; status: number };

export async function createTicketInvoice(
  input: CreateTicketInvoiceInput,
): Promise<CreateTicketInvoiceResult> {
  const { userId, event, ticketType, price } = input;
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
    ticketType === "live" ? liveAccessExpiry(event.live_end_at) : null;
  const { error: insertErr } = await admin.from("tickets").insert({
    id: ticketId,
    user_id: userId,
    event_id: event.id,
    status: "pending",
    ticket_type: ticketType,
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
