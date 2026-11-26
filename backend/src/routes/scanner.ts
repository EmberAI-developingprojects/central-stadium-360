import { Hono } from "hono";
import { z } from "zod";
import {
  checkOvertimePayment,
  checkOvertimePaymentByTicketId,
  createOvertimeInvoice,
  getRinkTicket,
  rinkBoard,
  scanRinkTicket,
  settleOvertime,
} from "../lib/rink";
import { getCallbackSecret, verifyTicketSignature } from "../lib/qpay-signature";
import { requireStaff, requireUser, type AuthEnv } from "../middleware/require-user";
import type { VenueResult } from "../lib/venue";

// Rink staff (role 'scanner', or an admin): scan tickets in and out, take
// overtime payments, and show the board on the rink's LED screen.
const scanner = new Hono<AuthEnv>();

function reply<T>(c: { json: (body: unknown, status?: number) => Response }, res: VenueResult<T>) {
  if (!res.ok) return c.json({ ok: false, error: res.error } as const, res.status);
  return c.json({ ok: true, data: res.data } as const);
}

// QPay calls this when an overtime invoice is paid; no staff session.
scanner.post("/qpay-callback", async (c) => {
  const ticketId = c.req.query("ticket") ?? "";
  const sig = c.req.query("sig") ?? "";
  const secret = getCallbackSecret();
  if (!secret) {
    return c.json({ ok: false, error: "qpay_callback_secret_missing" } as const, 503);
  }
  if (!verifyTicketSignature(ticketId, sig, secret)) {
    return c.json({ ok: false, error: "bad_signature" } as const, 401);
  }
  const res = await checkOvertimePaymentByTicketId(ticketId);
  if (!res.ok) return reply(c, res);
  return c.json({ ok: true, data: { status: res.data.status } } as const);
});

scanner.use("*", requireUser);
scanner.use("*", async (c, next) => requireStaff(c, next));

const scanSchema = z.object({ code: z.string().trim().min(1).max(64) });

scanner.post("/scan", async (c) => {
  const parsed = scanSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ ok: false, error: "invalid_input" } as const, 400);
  return reply(c, await scanRinkTicket(parsed.data.code, c.get("user").id));
});

scanner.get("/tickets/:code", async (c) => reply(c, await getRinkTicket(c.req.param("code"))));

scanner.post("/tickets/:code/overtime/qpay", async (c) =>
  reply(c, await createOvertimeInvoice(c.req.param("code"))),
);

scanner.get("/tickets/:code/overtime/status", async (c) =>
  reply(c, await checkOvertimePayment(c.req.param("code"), c.get("user").id)),
);

scanner.post("/tickets/:code/overtime/cash", async (c) =>
  reply(c, await settleOvertime(c.req.param("code"), "cash", c.get("user").id)),
);

scanner.get("/board", async (c) => {
  c.header("Cache-Control", "no-store");
  return reply(c, await rinkBoard());
});

export default scanner;
