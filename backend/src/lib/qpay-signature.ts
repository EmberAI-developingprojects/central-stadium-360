import crypto from "node:crypto";

/**
 * Per-ticket HMAC signature used to authenticate QPay's webhook hit.
 *
 * QPay needs the callback URL at invoice-create time, so we cannot sign the
 * QPay invoice_id (we don't have it yet). Instead, we sign our internal
 * `ticket_id` (a UUID we generated locally) and embed it in the URL:
 *
 *   {BACKEND_URL}/api/payments/qpay-callback?ticket={uuid}&sig={hex}
 *
 *   sig = HMAC_SHA256(QPAY_CALLBACK_SECRET, ticket_id)
 *
 * On callback we verify `sig` constant-time, then INDEPENDENTLY re-query QPay's
 * /v2/payment/check to confirm the invoice was actually paid before mutating
 * any state. The HMAC alone is *not* trust — it just rejects random callers
 * before we burn an API call against QPay.
 */

export function getCallbackSecret(): string | null {
  return process.env.QPAY_CALLBACK_SECRET ?? null;
}

export function signTicket(ticketId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(ticketId).digest("hex");
}

export function verifyTicketSignature(
  ticketId: string,
  providedSig: string,
  secret: string,
): boolean {
  if (!ticketId || !providedSig || !secret) return false;
  const expected = signTicket(ticketId, secret);
  if (expected.length !== providedSig.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(providedSig, "hex"),
    );
  } catch {
    return false;
  }
}

export function buildCallbackUrl(
  backendUrl: string,
  ticketId: string,
  secret: string,
): string {
  const base = backendUrl.replace(/\/$/, "");
  const sig = signTicket(ticketId, secret);
  const params = new URLSearchParams({ ticket: ticketId, sig });
  return `${base}/api/payments/qpay-callback?${params.toString()}`;
}
