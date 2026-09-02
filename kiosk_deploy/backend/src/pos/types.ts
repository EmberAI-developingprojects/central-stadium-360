/**
 * PaymentTerminal — the one interface the bridge talks to for card payments.
 *
 * The kiosk never touches card data: it asks a terminal to take a payment and
 * gets back an approved/declined result. Every acquirer (Golomt, a mock, a
 * future bank) implements this same shape, so the route + ticket/И-Баримт flow
 * never change when we swap drivers.
 *
 * Two integration models exist behind this interface, and we don't yet know
 * which one Golomt's Integrated POS uses (see ../pos/golomt.ts):
 *   - ECR: a standalone certified terminal we drive over serial/USB/TCP.
 *           We send "charge ₮X", it does tap/PIN, returns the result.
 *   - SDK/local-API: an HTTP/SDK service running on the box.
 * Both collapse to startSale()/cancel()/lastSettlement() below.
 */

export interface SaleInput {
  /** Our order reference — becomes the terminal requestID for reconciliation. */
  orderRef: string;
  /** Amount in whole tögrög (the driver converts to minor units itself). */
  amount: number;
  description?: string;
}

export interface SaleResult {
  status: "approved" | "declined";
  orderRef: string;
  amount: number;
  authCode?: string;
  rrn?: string;
  cardMasked?: string;
  terminalId?: string;
  merchantId?: string;
  /** Terminal-formatted receipt text, when the acquirer returns one. */
  receipt?: string;
  errorText?: string;
  /** Raw decoded acquirer response, for logs/debugging. */
  raw?: unknown;
}

export interface CancelResult {
  status: "cancelled" | "error";
  orderRef: string;
  amount: number;
  authCode?: string;
  rrn?: string;
  errorText?: string;
  raw?: unknown;
}

export interface PaymentTerminal {
  name: string;
  startSale(input: SaleInput): Promise<SaleResult>;
  cancel(orderRef: string): Promise<CancelResult>;
  lastSettlement(date?: string): Promise<unknown[]>;
}
