import { Hono } from "hono";
import { z } from "zod";
import type { DbTicket, PaymentStatus } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireUser, type AuthEnv } from "../middleware/require-user";
import { checkInvoicePayment, isPaid, isQPayConfigured } from "../lib/qpay";
import {
  getCallbackSecret,
  verifyTicketSignature,
} from "../lib/qpay-signature";

const payments = new Hono<AuthEnv>();

// ----------------------------------------------------------------------------
// POST /api/payments/qpay-callback        (PUBLIC — verified by HMAC + check)
// ----------------------------------------------------------------------------
// QPay calls this when an invoice changes state. URL was minted at
// invoice-create time with `?ticket=<uuid>&sig=<hmac(uuid)>`.
//
// Defense-in-depth:
//   1. HMAC check — discards random/forged calls before any work.
//   2. Independent /v2/payment/check — only QPay can tell us "paid" for real.
//   3. Idempotent UPDATE ... WHERE status='pending' — repeat calls no-op.
//
// We intentionally never trust the request body or query for amounts.
// ----------------------------------------------------------------------------
payments.post("/qpay-callback", async (c) => {
  const ticketId = c.req.query("ticket") ?? "";
  const sig = c.req.query("sig") ?? "";
  const secret = getCallbackSecret();
  if (!secret) {
    return c.json(
      { ok: false, error: "qpay_callback_secret_missing" } as const,
      503,
    );
  }
  if (!verifyTicketSignature(ticketId, sig, secret)) {
    console.warn("[payments] callback signature mismatch", { ticketId });
    return c.json({ ok: false, error: "bad_signature" } as const, 401);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }

  const { data: ticket, error: tErr } = await admin
    .from("tickets")
    .select("id, status, qpay_invoice_id, price")
    .eq("id", ticketId)
    .maybeSingle<Pick<DbTicket, "id" | "status" | "qpay_invoice_id" | "price">>();
  if (tErr) {
    console.error("[payments] ticket lookup failed:", tErr);
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!ticket || !ticket.qpay_invoice_id) {
    return c.json({ ok: false, error: "ticket_not_found" } as const, 404);
  }

  // Idempotency: if already paid, ACK and exit without re-querying QPay.
  if (ticket.status === "paid") {
    return c.json({ ok: true, data: { idempotent: true } } as const);
  }

  // Independent confirmation with QPay.
  if (!isQPayConfigured()) {
    return c.json({ ok: false, error: "qpay_not_configured" } as const, 503);
  }
  let check;
  try {
    check = await checkInvoicePayment(ticket.qpay_invoice_id);
  } catch (err) {
    console.error("[payments] qpay check failed:", err);
    return c.json({ ok: false, error: "qpay_check_failed" } as const, 502);
  }
  if (!isPaid(check)) {
    return c.json({ ok: false, error: "not_paid" } as const, 409);
  }
  if (check.paid_amount < ticket.price) {
    // Underpayment — do not mark paid.
    console.warn("[payments] underpayment", {
      ticketId,
      expected: ticket.price,
      paid: check.paid_amount,
    });
    return c.json({ ok: false, error: "underpaid" } as const, 409);
  }

  // Idempotent state transition: only update if still pending.
  const { data: updated, error: upErr } = await admin
    .from("tickets")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("status", "pending")
    .select("id, status, paid_at")
    .maybeSingle();
  if (upErr) {
    console.error("[payments] update failed:", upErr);
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!updated) {
    // Someone else marked it paid between our SELECT and UPDATE — that's fine.
    return c.json({ ok: true, data: { idempotent: true } } as const);
  }

  return c.json({ ok: true, data: { idempotent: false } } as const);
});

// ----------------------------------------------------------------------------
// GET /api/payments/status/:invoiceId     (AUTH REQUIRED)
// ----------------------------------------------------------------------------
// Polled by the OrderDetail page while the user waits at the QR. Also
// reconciles if the webhook was dropped.
// ----------------------------------------------------------------------------

const statusRoute = new Hono<AuthEnv>();
statusRoute.use("*", requireUser);

const invoiceParamSchema = z.string().min(1).max(128);

statusRoute.get("/:invoiceId", async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("invoiceId");
  const parsed = invoiceParamSchema.safeParse(invoiceId);
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_invoice" } as const, 400);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
  }

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, user_id, status, price, qpay_invoice_id, paid_at")
    .eq("qpay_invoice_id", invoiceId)
    .maybeSingle<
      Pick<
        DbTicket,
        "id" | "user_id" | "status" | "price" | "qpay_invoice_id" | "paid_at"
      >
    >();

  if (!ticket || ticket.user_id !== user.id || !ticket.qpay_invoice_id) {
    // Don't disclose whether the invoice exists for someone else.
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }

  // If already paid in DB, return cached status.
  if (ticket.status === "paid") {
    const resp: PaymentStatus = {
      invoice_id: ticket.qpay_invoice_id,
      ticket_id: ticket.id,
      status: "paid",
      paid_at: ticket.paid_at,
      paid_amount: ticket.price,
    };
    return c.json({ ok: true, data: resp } as const);
  }

  // Otherwise reconcile with QPay. If paid, mirror the callback's effect
  // (also idempotent: WHERE status='pending').
  if (!isQPayConfigured()) {
    return c.json({ ok: false, error: "qpay_not_configured" } as const, 503);
  }

  let check;
  try {
    check = await checkInvoicePayment(ticket.qpay_invoice_id);
  } catch (err) {
    console.error("[payments] status check failed:", err);
    return c.json({ ok: false, error: "qpay_check_failed" } as const, 502);
  }

  if (isPaid(check) && check.paid_amount >= ticket.price) {
    const { data: updated } = await admin
      .from("tickets")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", ticket.id)
      .eq("status", "pending")
      .select("paid_at")
      .maybeSingle<{ paid_at: string | null }>();

    const resp: PaymentStatus = {
      invoice_id: ticket.qpay_invoice_id,
      ticket_id: ticket.id,
      status: "paid",
      paid_at: updated?.paid_at ?? new Date().toISOString(),
      paid_amount: check.paid_amount,
    };
    return c.json({ ok: true, data: resp } as const);
  }

  const resp: PaymentStatus = {
    invoice_id: ticket.qpay_invoice_id,
    ticket_id: ticket.id,
    status: "pending",
    paid_at: null,
    paid_amount: check.paid_amount,
  };
  return c.json({ ok: true, data: resp } as const);
});

payments.route("/status", statusRoute);

export default payments;
