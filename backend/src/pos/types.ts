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

/** Outcome of a single sale attempt. */
export type SaleStatus = 'approved' | 'declined' | 'cancelled' | 'error';

export interface SaleResult {
  status: SaleStatus;
  /** Echoed back so the caller can correlate; also the idempotency key. */
  orderRef: string;
  /** Charged amount in MNT (integer). */
  amount: number;
  /** Acquirer authorization code (present when approved). */
  authCode?: string;
  /** Retrieval Reference Number — the field we reconcile against settlement. */
  rrn?: string;
  /** Masked PAN, e.g. "****0000". Never the full card number. */
  cardMasked?: string;
  /** Terminal that processed the sale (TID). */
  terminalId?: string;
  /** Human-readable reason when declined/error. */
  reason?: string;
  /** True when produced by a mock/simulated driver (not a real card charge). */
  simulated?: boolean;
}

/** One row of acquirer settlement, matched against orders by `rrn`. */
export interface SettlementRow {
  rrn: string;
  orderRef?: string;
  amount: number; // MNT
  authCode?: string;
  cardMasked?: string;
  /** Acquirer's settlement timestamp (ISO 8601). */
  settledAt?: string;
}

export interface PaymentTerminal {
  /** Driver name for logs/diagnostics, e.g. "mock" | "verifone" | "golomt". */
  readonly name: string;

  /**
   * Optional liveness check that starts NO transaction (e.g. an ECR ENQ/ACK
   * handshake). Exposed at GET /pos/probe for install-time diagnostics; drivers
   * without a hardware link (mock) may omit it.
   */
  probe?(): Promise<{ ok: true; port?: string }>;

  /**
   * Take a card payment for `amount` MNT against `orderRef`.
   * Must be safe to call once per orderRef — the route wraps this in the
   * idempotency guard, but a driver should also reject a duplicate live charge.
   */
  startSale(input: { orderRef: string; amount: number; description?: string }): Promise<SaleResult>;

  /** Cancel/void an in-flight or last sale for `orderRef`, if supported. */
  cancel(orderRef: string): Promise<SaleResult>;

  /**
   * Pull settlement rows for reconciliation against issued tickets + И-Баримт.
   * Optional date (YYYY-MM-DD); defaults to the terminal's current batch.
   */
  lastSettlement(date?: string): Promise<SettlementRow[]>;
}
