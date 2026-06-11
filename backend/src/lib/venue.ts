import { randomUUID } from "node:crypto";
import type {
  DbVenueOrder,
  KioskCreateOrderInput,
  KioskCreateOrderResponse,
  KioskEbarimt,
  KioskOrderItemInput,
  KioskOrderStatus,
  KioskTicketOut,
  VenueOrderItem,
} from "@cs360/shared";
import { getSupabaseAdmin } from "./supabase";
import {
  checkInvoicePayment,
  createEbarimt,
  createInvoice,
  isPaid,
  isQPayConfigured,
  paidPaymentId,
} from "./qpay";
import { buildKioskCallbackUrl, getCallbackSecret } from "./qpay-signature";

export type VenueResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

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

/** Create an in-person order: reserve capacity, persist, and (QPay rail) make an invoice. */
export async function createKioskOrder(
  input: KioskCreateOrderInput,
): Promise<VenueResult<KioskCreateOrderResponse>> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured", status: 503 };

  const items = (input.items ?? []).filter((i) => i && i.qty > 0);
  if (items.length === 0) return { ok: false, error: "no_items", status: 400 };

  const { data: event, error: evErr } = await admin
    .from("events")
    .select("id,title,status")
    .eq("id", input.event_id)
    .maybeSingle<{ id: string; title: string; status: string }>();
  if (evErr) return { ok: false, error: "internal_error", status: 500 };
  if (!event) return { ok: false, error: "event_not_found", status: 404 };
  if (event.status === "expired") {
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

  // Reserve capacity atomically, rolling back anything already taken on failure.
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

  // Card rail: the kiosk charges via the bridge, then POSTs /card-result.
  if (input.method === "card") {
    return { ok: true, data: { order_id: orderId, reference: orderId, total } };
  }

  // QPay rail: make an invoice with a signed callback.
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
      amountMnt: total,
      description: `Tickets: ${event.title}`,
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
  } catch (_err) {
    await failOrder(orderId, reserved);
    return { ok: false, error: "qpay_invoice_failed", status: 502 };
  }
}

/** Poll an order: settles it (mint tickets + e-barimt) the first time QPay reports paid. */
export async function getKioskOrderStatus(
  orderId: string,
): Promise<VenueResult<KioskOrderStatus>> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured", status: 503 };

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "not_found", status: 404 };

  if (order.status === "paid") {
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
      const settled = await settleOrder(order, {
        paymentId: paidPaymentId(check),
      });
      return { ok: true, data: settled };
    }
  }

  return { ok: true, data: toView(order, [], null) };
}

/** Card rail: the kiosk reports the terminal charge + POSAPI e-barimt result. */
export async function applyCardResult(
  orderId: string,
  approved: boolean,
  ebarimt: KioskEbarimt | undefined,
): Promise<VenueResult<KioskOrderStatus>> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured", status: 503 };

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "not_found", status: 404 };
  if (order.status === "paid") {
    return { ok: true, data: await loadOrderView(order) };
  }
  if (order.status !== "pending") {
    return { ok: false, error: "order_not_pending", status: 409 };
  }

  if (!approved) {
    await failOrderRow(order);
    return { ok: false, error: "card_declined", status: 402 };
  }
  const settled = await settleOrder(order, { ebarimt });
  return { ok: true, data: settled };
}

// --- internals -------------------------------------------------------------

async function settleOrder(
  order: DbVenueOrder,
  opts: { paymentId?: string | null; ebarimt?: KioskEbarimt },
): Promise<KioskOrderStatus> {
  const admin = getSupabaseAdmin()!;
  const nowIso = new Date().toISOString();

  // Atomically claim the pending->paid transition so concurrent polls /
  // callbacks settle exactly once.
  const { data: claimed } = await admin
    .from("venue_orders")
    .update({ status: "paid", paid_at: nowIso })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!claimed) {
    // Someone else already settled it — return the persisted view.
    const fresh = (await loadOrder(order.id)) ?? order;
    return loadOrderView(fresh);
  }

  // Mint one printed ticket per admission.
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
    await admin.from("venue_tickets").insert(rows);
  }

  // Resolve the e-barimt: card rail supplies it (POSAPI); QPay rail issues it now.
  let ebarimt: KioskEbarimt | null = opts.ebarimt ?? null;
  let ebarimtId: string | null = null;
  if (!ebarimt && order.payment_method === "qpay" && opts.paymentId) {
    try {
      const r = await createEbarimt(opts.paymentId);
      ebarimt = { qrData: r.ebarimt_qr_data, lottery: r.ebarimt_lottery };
      ebarimtId = r.id;
    } catch (err) {
      // Never fail a paid sale on e-barimt — log and continue; can be retried.
      console.error("ebarimt_create_failed", order.id, err);
    }
  }
  await admin
    .from("venue_orders")
    .update({
      ebarimt_id: ebarimtId,
      ebarimt_qr_data: ebarimt?.qrData ?? null,
      ebarimt_lottery: ebarimt?.lottery ?? null,
    })
    .eq("id", order.id);

  return {
    order_id: order.id,
    reference: order.reference,
    status: "paid",
    total: order.total,
    paid_at: nowIso,
    tickets: out,
    ebarimt,
  };
}

async function loadOrder(orderId: string): Promise<DbVenueOrder | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("venue_orders")
    .select(
      "id,event_id,reference,status,items,total,payment_method,qpay_invoice_id,paid_at,buyer_phone,ebarimt_id,ebarimt_qr_data,ebarimt_lottery,kiosk_id,created_at",
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
  const names = new Map(
    order.items.map((it) => [it.zone_id, it] as const),
  );
  const out: KioskTicketOut[] = (tickets ?? []).map((t) => {
    const it = names.get(t.zone_id);
    return {
      code: t.code,
      zone_name_mn: it?.zone_name_mn ?? "",
      zone_name_en: it?.zone_name_en ?? "",
    };
  });
  const ebarimt: KioskEbarimt | null = order.ebarimt_qr_data
    ? { qrData: order.ebarimt_qr_data, lottery: order.ebarimt_lottery ?? "" }
    : null;
  return toView(order, out, ebarimt);
}

function toView(
  order: DbVenueOrder,
  tickets: KioskTicketOut[],
  ebarimt: KioskEbarimt | null,
): KioskOrderStatus {
  return {
    order_id: order.id,
    reference: order.reference,
    status: order.status,
    total: order.total,
    paid_at: order.paid_at,
    tickets,
    ebarimt,
  };
}

async function releaseItems(items: KioskOrderItemInput[]): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  for (const i of items) {
    await admin.rpc("release_zone", { p_zone: i.zone_id, p_qty: i.qty });
  }
}

/** Release capacity and delete a never-paid order (QPay/setup failure). */
async function failOrder(
  orderId: string,
  reserved: KioskOrderItemInput[],
): Promise<void> {
  await releaseItems(reserved);
  const admin = getSupabaseAdmin();
  if (admin) await admin.from("venue_orders").delete().eq("id", orderId);
}

/** Cancel a pending order (e.g. card declined): release capacity, mark cancelled. */
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
