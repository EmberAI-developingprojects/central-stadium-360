import { config } from '../config.js';
import type { PaymentTerminal, SaleResult, SettlementRow } from './types.js';
import { SerialTransport } from './verifone/transport.js';
import { encodeSaleRequest, parseSaleResponse } from './verifone/protocol.js';

/**
 * VerifoneTerminal — driver for the Verifone ECR card terminal wired to the
 * kiosk box over USB-CDC serial (COM3). The kiosk only ever sends an amount and
 * gets back an approved/declined result; the terminal owns all card handling.
 *
 * Split of responsibility:
 *   ./verifone/transport.ts — universal ECR link (ENQ/ACK, STX/ETX/LRC).
 *   ./verifone/protocol.ts  — acquirer-specific sale/response field layout.
 * Only protocol.ts is gated on the bank's ECR spec; everything else is live.
 */
export class VerifoneTerminal implements PaymentTerminal {
  readonly name = 'verifone';
  private readonly transport: SerialTransport;

  constructor() {
    this.transport = new SerialTransport({
      path: config.posSerialPort,
      baudRate: config.posSerialBaud,
      ackTimeoutMs: config.posAckTimeoutMs,
      responseTimeoutMs: config.posResponseTimeoutMs,
    });
  }

  /** ENQ/ACK liveness check — starts no transaction. Backs GET /pos/probe. */
  async probe(): Promise<{ ok: true; port: string }> {
    await this.transport.probe();
    return { ok: true, port: config.posSerialPort };
  }

  async startSale(input: { orderRef: string; amount: number; description?: string }): Promise<SaleResult> {
    const req = { orderRef: input.orderRef, amount: input.amount };
    try {
      const payload = encodeSaleRequest(req); // throws until the spec is confirmed
      const resp = await this.transport.transact(payload);
      return parseSaleResponse(resp, req);
    } finally {
      // Keep the port open for the session; the process singleton reuses it.
    }
  }

  async cancel(orderRef: string): Promise<SaleResult> {
    // Void/cancel shares the transport; its frame layout is also spec-gated.
    throw new Error(`verifone_void_not_implemented: cannot void ${orderRef} until the ECR spec defines the void frame`);
  }

  async lastSettlement(_date?: string): Promise<SettlementRow[]> {
    throw new Error('verifone_settlement_not_implemented: ECR batch/settlement frame pending the acquirer spec');
  }
}
