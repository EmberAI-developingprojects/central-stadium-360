import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { DbTicket, TicketCreateResponse } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireUser, type AuthEnv } from "../middleware/require-user";
import { createInvoice, isQPayConfigured } from "../lib/qpay";
import { buildCallbackUrl, getCallbackSecret } from "../lib/qpay-signature";

const tickets = new Hono<AuthEnv>();

tickets.use("*", requireUser);

const createSchema = z.object({
  event_id: z.string().uuid(),
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
  const { event_id } = parsed.data;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data: event, error: evErr } = await admin
    .from("events")
    .select("id, title, status, price")
    .eq("id", event_id)
    .maybeSingle<{
      id: string;
      title: string;
      status: "upcoming" | "live" | "ended";
      price: number;
    }>();
  if (evErr) {
    console.error("[tickets] event lookup failed:", evErr);
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!event) {
    return c.json({ ok: false, error: "event_not_found" } as const, 404);
  }
  if (event.status === "ended") {
    return c.json({ ok: false, error: "event_ended" } as const, 409);
  }
  if (event.price <= 0) {
    return c.json({ ok: false, error: "event_not_for_sale" } as const, 409);
  }

  if (!isQPayConfigured()) {
    return c.json({ ok: false, error: "qpay_not_configured" } as const, 503);
  }
  const secret = getCallbackSecret();
  if (!secret) {
    return c.json(
      { ok: false, error: "qpay_callback_secret_missing" } as const,
      503,
    );
  }

  const ticketId = randomUUID();
  const { error: insertErr } = await admin.from("tickets").insert({
    id: ticketId,
    user_id: user.id,
    event_id: event.id,
    status: "pending",
    price: event.price,
  });
  if (insertErr) {
    console.error("[tickets] insert failed:", insertErr);
    return c.json({ ok: false, error: "ticket_insert_failed" } as const, 500);
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
      receiverCode: user.id,
      amountMnt: event.price,
      description: `Ticket: ${event.title}`,
      callbackUrl,
    });
  } catch (err) {
    console.error("[tickets] qpay createInvoice failed:", err);

    await admin.from("tickets").delete().eq("id", ticketId);
    return c.json({ ok: false, error: "qpay_invoice_failed" } as const, 502);
  }

  const { error: updErr } = await admin
    .from("tickets")
    .update({ qpay_invoice_id: invoice.invoice_id })
    .eq("id", ticketId);
  if (updErr) {
    console.error("[tickets] qpay_invoice_id update failed:", updErr);

  }

  const response: TicketCreateResponse = {
    ticket_id: ticketId,
    event_id: event.id,
    price: event.price,
    invoice_id: invoice.invoice_id,
    qr_text: invoice.qr_text,
    qr_image: invoice.qr_image,
    urls: invoice.urls,
  };
  return c.json({ ok: true, data: response } as const);
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
      "id,user_id,event_id,status,price,qpay_invoice_id,created_at,paid_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tickets] my failed:", error);
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }

  return c.json({ ok: true, data: (data ?? []) as DbTicket[] } as const);
});

export default tickets;
