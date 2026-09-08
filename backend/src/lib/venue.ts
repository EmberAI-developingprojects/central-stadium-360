import { randomUUID } from "node:crypto";
import type {
  DbVenueOrder,
  KioskCreateOrderInput,
  KioskCreateOrderResponse,
  KioskOrderItemInput,
  KioskOrderStatus,
  KioskScanResult,
  KioskTicketOut,
  ScanVerdict,
  VenueOrderItem,
  VenueTicketStatus,
} from "@cs360/shared";
import { getSupabaseAdmin } from "./supabase";
import {
  checkInvoicePayment,
  createEbarimt,
  createEbarimtV3,
  createInvoice,
  isEbarimtV3Enabled,
  isPaid,
  isQPayConfigured,
  paidPaymentId,
  type EbarimtReceipt,
  type PaymentCheckResult,
} from "./qpay";
import { buildKioskCallbackUrl, getCallbackSecret } from "./qpay-signature";
import { publishedOn, withChannelFallback } from "./event-channels";

const KIOSK_SALE_GRACE_MS = 12 * 60 * 60 * 1000;

export function kioskSaleCutoffIso(): string {
  return new Date(Date.now() - KIOSK_SALE_GRACE_MS).toISOString();
}

export type VenueResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export interface CardEbarimtResult {
  id?: string | null;
  qrData?: string;
  ebarimt_qr_data?: string;
  lottery?: string;
  ebarimt_lottery?: string;
}

type ZoneRow = {
  id: string;
  event_id: string;
  name_mn: string;
  name_en: string;
  price: number;
  capacity: number;
  sold: number;
};

function ticketCode(): string {
  return `NS-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function backendUrl(): string {
  return (
    process.env.PUBLIC_BACKEND_URL ??
    process.env.BACKEND_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`
  );
}

export async function createKioskOrder(
  input: KioskCreateOrderInput,
): Promise<VenueResult<KioskCreateOrderResponse>> {
  const admin = getSupabaseAdmin();
  if (!admin)
    return { ok: false, error: "supabase_not_configured", status: 503 };

  const items = (input.items ?? []).filter((i) => i && i.qty > 0);
  if (items.length === 0) return { ok: false, error: "no_items", status: 400 };

  type SaleEvent = {
    id: string;
    title: string;
    status: string;
    show_on_kiosk?: boolean;
  };
  const { data: event, error: evErr } = await withChannelFallback<SaleEvent>(
    (withChannels) =>
      admin
        .from("events")
        .select("id,title,status" + (withChannels ? ",show_on_kiosk" : ""))
        .eq("id", input.event_id)
        .maybeSingle<SaleEvent>(),
  );
  if (evErr) return { ok: false, error: "internal_error", status: 500 };
  if (!event) return { ok: false, error: "event_not_found", status: 404 };
  if (event.status === "expired" || !publishedOn(event.show_on_kiosk)) {
    return { ok: false, error: "event_not_on_sale", status: 409 };
  }

  const zoneIds = [...new Set(items.map((i) => i.zone_id))];
  const { data: zoneRows, error: zErr } = await admin
    .from("zones")
    .select("id,event_id,name_mn,name_en,price,capacity,sold")
    .in("id", zoneIds);
  if (zErr) return { ok: false, error: "internal_error", status: 500 };
  const zones = new Map((zoneRows ?? []).map((z) => [z.id, z as ZoneRow]));
  for (const i of items) {
    const z = zones.get(i.zone_id);
    if (!z || z.event_id !== event.id) {
      return { ok: false, error: "invalid_zone", status: 400 };
    }
  }

  const reserved: KioskOrderItemInput[] = [];
  for (const i of items) {
    const { data: ok, error } = await admin.rpc("reserve_zone", {
      p_zone: i.zone_id,
      p_qty: i.qty,
    });
    if (error || ok !== true) {
      await releaseItems(reserved);
      return { ok: false, error: "sold_out", status: 409 };
    }
    reserved.push(i);
  }

  const orderItems: VenueOrderItem[] = items.map((i) => {
    const z = zones.get(i.zone_id)!;
    return {
      zone_id: z.id,
      zone_name_mn: z.name_mn,
      zone_name_en: z.name_en,
      qty: i.qty,
      unit_price: z.price,
    };
  });
  const total = orderItems.reduce((s, it) => s + it.qty * it.unit_price, 0);

  const orderId = randomUUID();
  const { error: insErr } = await admin.from("venue_orders").insert({
    id: orderId,
    event_id: event.id,
    reference: orderId,
    status: "pending",
    items: orderItems,
    total,
    payment_method: input.method,
    buyer_phone: input.buyer_phone ?? null,
    kiosk_id: input.kiosk_id ?? null,
  });
  if (insErr) {
    await releaseItems(reserved);
    return { ok: false, error: "order_insert_failed", status: 500 };
  }

  if (input.method === "card") {
    return { ok: true, data: { order_id: orderId, reference: orderId, total } };
  }

  if (!isQPayConfigured()) {
    await failOrder(orderId, reserved);
    return { ok: false, error: "qpay_not_configured", status: 503 };
  }
  const secret = getCallbackSecret();
  if (!secret) {
    await failOrder(orderId, reserved);
    return { ok: false, error: "qpay_callback_secret_missing", status: 503 };
  }
  try {
    const invoice = await createInvoice({
      senderInvoiceNo: orderId,
      receiverCode: input.kiosk_id ?? "KIOSK",
      branchCode: input.kiosk_id ?? "KIOSK",
      amountMnt: total,
      description: [
        event.title,
        orderItems.map((it) => `${it.zone_name_mn} x${it.qty}`).join(", "),
        "Төв цэнгэлдэх хүрээлэн",
      ]
        .join(" — ")
        .slice(0, 250),
      lines: orderItems.map((it) => ({
        description: `${event.title} — ${it.zone_name_mn}`,
        qty: it.qty,
        unitPrice: it.unit_price,
        note: it.zone_name_en || undefined,
      })),
      callbackUrl: buildKioskCallbackUrl(backendUrl(), orderId, secret),
    });
    await admin
      .from("venue_orders")
      .update({ qpay_invoice_id: invoice.invoice_id })
      .eq("id", orderId);
    return {
      ok: true,
      data: {
        order_id: orderId,
        reference: orderId,
        total,
        qr_text: invoice.qr_text,
        qr_image: invoice.qr_image,
        urls: invoice.urls,
      },
    };
  } catch (err) {
    console.error("kiosk_qpay_invoice_failed", String(err).slice(0, 300));
    await failOrder(orderId, reserved);
    return { ok: false, error: "qpay_invoice_failed", status: 502 };
  }
}

export async function getKioskOrderStatus(
  orderId: string,
): Promise<VenueResult<KioskOrderStatus>> {
  const admin = getSupabaseAdmin();
  if (!admin)
    return { ok: false, error: "supabase_not_configured", status: 503 };

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "not_found", status: 404 };

  if (order.status === "paid") {
    if (await retryEbarimtForOrder(order)) {
      const fresh = await loadOrder(orderId);
      if (fresh) return { ok: true, data: await loadOrderView(fresh) };
    }
    return { ok: true, data: await loadOrderView(order) };
  }

  if (
    order.status === "pending" &&
    order.payment_method === "qpay" &&
    order.qpay_invoice_id
  ) {
    if (!isQPayConfigured()) {
      return { ok: false, error: "qpay_not_configured", status: 503 };
    }
    let check;
    try {
      check = await checkInvoicePayment(order.qpay_invoice_id);
    } catch (_err) {
      return { ok: false, error: "qpay_check_failed", status: 502 };
    }
    if (isPaid(check) && check.paid_amount >= order.total) {
      const settled = await settleOrder(order);
      await issueEbarimtForVenueOrder(order, check);
      return { ok: true, data: settled };
    }
  }

  return { ok: true, data: toView(order, []) };
}

export async function applyCardResult(
  orderId: string,
  approved: boolean,
  ebarimt?: CardEbarimtResult,
): Promise<VenueResult<KioskOrderStatus>> {
  const admin = getSupabaseAdmin();
  if (!admin)
    return { ok: false, error: "supabase_not_configured", status: 503 };

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "not_found", status: 404 };
  if (order.status === "paid") {
    await persistCardEbarimt(order.id, ebarimt);
    return { ok: true, data: await loadOrderView(order) };
  }
  if (order.status !== "pending") {
    return { ok: false, error: "order_not_pending", status: 409 };
  }

  if (!approved) {
    await failOrderRow(order);
    return { ok: false, error: "card_declined", status: 402 };
  }
  const settled = await settleOrder(order);
  await persistCardEbarimt(order.id, ebarimt);
  return { ok: true, data: settled };
}

async function persistCardEbarimt(
  orderId: string,
  ebarimt?: CardEbarimtResult,
): Promise<void> {
  const qrData = ebarimt?.qrData ?? ebarimt?.ebarimt_qr_data ?? "";
  const lottery = ebarimt?.lottery ?? ebarimt?.ebarimt_lottery ?? "";
  const id = ebarimt?.id ?? null;
  if (!qrData && !lottery && !id) return;

  const admin = getSupabaseAdmin();
  if (!admin) return;
  const patch: Partial<
    Pick<DbVenueOrder, "ebarimt_id" | "ebarimt_qr_data" | "ebarimt_lottery">
  > = {
    ebarimt_qr_data: qrData || null,
    ebarimt_lottery: lottery || null,
  };
  if (id) patch.ebarimt_id = id;

  const { error } = await admin
    .from("venue_orders")
    .update(patch)
    .eq("id", orderId)
    .is("ebarimt_qr_data", null);
  if (error) {
    console.error("venue_order_card_ebarimt_persist_failed", orderId, error);
  }
}

async function settleOrder(order: DbVenueOrder): Promise<KioskOrderStatus> {
  const admin = getSupabaseAdmin()!;
  const nowIso = new Date().toISOString();

  const { data: claimed } = await admin
    .from("venue_orders")
    .update({ status: "paid", paid_at: nowIso })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!claimed) {
    const fresh = (await loadOrder(order.id)) ?? order;
    return loadOrderView(fresh);
  }

  const out: KioskTicketOut[] = [];
  const rows: { order_id: string; zone_id: string; code: string }[] = [];
  for (const it of order.items) {
    for (let n = 0; n < it.qty; n++) {
      const code = ticketCode();
      rows.push({ order_id: order.id, zone_id: it.zone_id, code });
      out.push({
        code,
        zone_name_mn: it.zone_name_mn,
        zone_name_en: it.zone_name_en,
      });
    }
  }
  if (rows.length > 0) {
    const { error: mintErr } = await admin.from("venue_tickets").insert(rows);
    if (mintErr) {
      console.error(
        "venue_tickets_mint_failed",
        order.id,
        mintErr.message.slice(0, 300),
      );
    }
  }

  return {
    order_id: order.id,
    reference: order.reference,
    status: "paid",
    total: order.total,
    paid_at: nowIso,
    tickets: out,
  };
}

async function issueEbarimtForVenueOrder(
  order: DbVenueOrder,
  check: PaymentCheckResult,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const paymentId = paidPaymentId(check);
  if (!paymentId) return;
  try {
    let receipt: EbarimtReceipt;
    if (isEbarimtV3Enabled()) {
      receipt = await createEbarimtV3(paymentId, "CITIZEN");
    } else {
      const r = await createEbarimt(paymentId, "CITIZEN");
      receipt = {
        id: r.id,
        ddtd: r.id,
        qrData: r.ebarimt_qr_data,
        lottery: r.ebarimt_lottery,
        date: null,
        vat: 0,
        cityTax: 0,
      };
    }
    const { error } = await admin
      .from("venue_orders")
      .update({
        qpay_payment_id: paymentId,
        ebarimt_id: receipt.id,
        ebarimt_ddtd: receipt.ddtd || receipt.id,
        ebarimt_qr_data: receipt.qrData,
        ebarimt_lottery: receipt.lottery,
        ebarimt_date: receipt.date,
        ebarimt_vat: receipt.vat,
        ebarimt_city_tax: receipt.cityTax,
      })
      .eq("id", order.id)
      .is("ebarimt_lottery", null);
    if (error) {
      console.error(
        "venue_order_ebarimt_persist_failed",
        order.id,
        error.message.slice(0, 300),
      );
    }
  } catch (err) {
    console.error(
      "venue_order_ebarimt_failed",
      order.id,
      String(err).slice(0, 300),
    );
  }
}

const EBARIMT_RETRY_INTERVAL_MS = 20_000;
const EBARIMT_RETRY_WINDOW_MS = 6 * 60 * 60 * 1000;
const lastEbarimtAttempt = new Map<string, number>();

export async function retryEbarimtForOrder(
  order: DbVenueOrder,
): Promise<boolean> {
  if (order.status !== "paid") return false;
  if (order.payment_method !== "qpay") return false;
  if (order.ebarimt_lottery || !order.qpay_invoice_id) return false;
  if (!isQPayConfigured()) return false;

  const paidMs = order.paid_at ? new Date(order.paid_at).getTime() : 0;
  if (!paidMs || Date.now() - paidMs > EBARIMT_RETRY_WINDOW_MS) return false;

  const last = lastEbarimtAttempt.get(order.id) ?? 0;
  if (Date.now() - last < EBARIMT_RETRY_INTERVAL_MS) return false;
  lastEbarimtAttempt.set(order.id, Date.now());

  try {
    const check = await checkInvoicePayment(order.qpay_invoice_id);
    if (!isPaid(check)) return false;
    await issueEbarimtForVenueOrder(order, check);
    return true;
  } catch (err) {
    console.error(
      "venue_order_ebarimt_retry_failed",
      order.id,
      String(err).slice(0, 300),
    );
    return false;
  }
}

async function loadOrder(orderId: string): Promise<DbVenueOrder | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("venue_orders")
    .select(
      "id,event_id,reference,status,items,total,payment_method,qpay_invoice_id,qpay_payment_id,paid_at,buyer_phone,ebarimt_id,ebarimt_ddtd,ebarimt_qr_data,ebarimt_lottery,ebarimt_date,ebarimt_vat,ebarimt_city_tax,kiosk_id,created_at",
    )
    .eq("id", orderId)
    .maybeSingle<DbVenueOrder>();
  return data ?? null;
}

async function loadOrderView(order: DbVenueOrder): Promise<KioskOrderStatus> {
  const admin = getSupabaseAdmin()!;
  const { data: tickets } = await admin
    .from("venue_tickets")
    .select("code,zone_id")
    .eq("order_id", order.id);
  const names = new Map(order.items.map((it) => [it.zone_id, it] as const));
  const out: KioskTicketOut[] = (tickets ?? []).map((t) => {
    const it = names.get(t.zone_id);
    return {
      code: t.code,
      zone_name_mn: it?.zone_name_mn ?? "",
      zone_name_en: it?.zone_name_en ?? "",
    };
  });
  return toView(order, out);
}

function toView(
  order: DbVenueOrder,
  tickets: KioskTicketOut[],
): KioskOrderStatus {
  return {
    order_id: order.id,
    reference: order.reference,
    status: order.status,
    total: order.total,
    paid_at: order.paid_at,
    tickets,
  };
}

const PENDING_ORDER_TTL_MS = 15 * 60 * 1000;

export async function expireStalePendingOrders(): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const cutoffIso = new Date(Date.now() - PENDING_ORDER_TTL_MS).toISOString();
  const { data } = await admin
    .from("venue_orders")
    .select("id,items")
    .eq("status", "pending")
    .lt("created_at", cutoffIso)
    .limit(25);
  for (const o of (data ?? []) as { id: string; items: VenueOrderItem[] }[]) {
    const { data: won } = await admin
      .from("venue_orders")
      .update({ status: "cancelled" })
      .eq("id", o.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (won) {
      await releaseItems(
        (o.items ?? []).map((it) => ({ zone_id: it.zone_id, qty: it.qty })),
      );
    }
  }
}

async function releaseItems(items: KioskOrderItemInput[]): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  for (const i of items) {
    await admin.rpc("release_zone", { p_zone: i.zone_id, p_qty: i.qty });
  }
}

async function failOrder(
  orderId: string,
  reserved: KioskOrderItemInput[],
): Promise<void> {
  await releaseItems(reserved);
  const admin = getSupabaseAdmin();
  if (admin) await admin.from("venue_orders").delete().eq("id", orderId);
}

async function failOrderRow(order: DbVenueOrder): Promise<void> {
  await releaseItems(
    order.items.map((it) => ({ zone_id: it.zone_id, qty: it.qty })),
  );
  const admin = getSupabaseAdmin();
  if (admin) {
    await admin
      .from("venue_orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("status", "pending");
  }
}

function blankResult(verdict: ScanVerdict, code: string): KioskScanResult {
  return {
    verdict,
    code,
    zone_name_mn: null,
    event_title: null,
    used_at: null,
    admitted: 0,
    sold: 0,
  };
}

export async function admissionCounts(
  eventId: string,
): Promise<{ sold: number; admitted: number }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { sold: 0, admitted: 0 };
  const { data: zoneRows } = await admin
    .from("zones")
    .select("id")
    .eq("event_id", eventId);
  const zoneIds = (zoneRows ?? []).map((z) => z.id as string);
  if (zoneIds.length === 0) return { sold: 0, admitted: 0 };
  const { data: tix } = await admin
    .from("venue_tickets")
    .select("status")
    .in("zone_id", zoneIds);
  let sold = 0;
  let admitted = 0;
  for (const t of (tix ?? []) as { status: VenueTicketStatus }[]) {
    if (t.status === "void") continue;
    sold += 1;
    if (t.status === "used") admitted += 1;
  }
  return { sold, admitted };
}

export async function redeemTicket(
  rawCode: string,
  gateEventId?: string | null,
): Promise<VenueResult<KioskScanResult>> {
  const admin = getSupabaseAdmin();
  if (!admin)
    return { ok: false, error: "supabase_not_configured", status: 503 };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "empty_code", status: 400 };

  const { data: ticket } = await admin
    .from("venue_tickets")
    .select("id,order_id,zone_id,status,used_at")
    .eq("code", code)
    .maybeSingle<{
      id: string;
      order_id: string;
      zone_id: string;
      status: VenueTicketStatus;
      used_at: string | null;
    }>();

  if (!ticket) return { ok: true, data: blankResult("not_found", code) };

  const { data: order } = await admin
    .from("venue_orders")
    .select("event_id,items")
    .eq("id", ticket.order_id)
    .maybeSingle<{ event_id: string; items: VenueOrderItem[] }>();
  const eventId = order?.event_id ?? null;
  const zoneName =
    order?.items?.find((it) => it.zone_id === ticket.zone_id)?.zone_name_mn ??
    null;
  let eventTitle: string | null = null;
  if (eventId) {
    const { data: ev } = await admin
      .from("events")
      .select("title")
      .eq("id", eventId)
      .maybeSingle<{ title: string }>();
    eventTitle = ev?.title ?? null;
  }

  const counts = eventId
    ? await admissionCounts(eventId)
    : { sold: 0, admitted: 0 };
  const base = {
    code,
    zone_name_mn: zoneName,
    event_title: eventTitle,
    admitted: counts.admitted,
    sold: counts.sold,
  };

  if (gateEventId && eventId && gateEventId !== eventId) {
    return {
      ok: true,
      data: { ...base, verdict: "wrong_event", used_at: null },
    };
  }
  if (ticket.status === "void") {
    return { ok: true, data: { ...base, verdict: "voided", used_at: null } };
  }
  if (ticket.status === "used") {
    return {
      ok: true,
      data: { ...base, verdict: "already_used", used_at: ticket.used_at },
    };
  }

  const nowIso = new Date().toISOString();
  const { data: claimed } = await admin
    .from("venue_tickets")
    .update({ status: "used", used_at: nowIso })
    .eq("id", ticket.id)
    .eq("status", "valid")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!claimed) {
    const { data: fresh } = await admin
      .from("venue_tickets")
      .select("used_at")
      .eq("id", ticket.id)
      .maybeSingle<{ used_at: string | null }>();
    return {
      ok: true,
      data: {
        ...base,
        verdict: "already_used",
        used_at: fresh?.used_at ?? null,
      },
    };
  }

  return {
    ok: true,
    data: {
      ...base,
      verdict: "admitted",
      used_at: nowIso,
      admitted: counts.admitted + 1,
    },
  };
}
