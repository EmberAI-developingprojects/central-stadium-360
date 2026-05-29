import crypto from "node:crypto";

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
