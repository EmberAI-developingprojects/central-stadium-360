import { config } from '../config.js';
import type { PaymentTerminal, SaleResult, SettlementRow } from './types.js';

/**
 * GolomtTerminal — driver for Golomt Bank's Integrated POS (КИОСК).
 *
 * NOT YET IMPLEMENTED. The public service page
 * (https://www.golomtbank.com/services/4511) confirms the Integrated POS is
 * built for self-service kiosks and connects to POS software, but gives no
 * technical spec. Before this can be filled in we need from Golomt's
 * integration team (see the inquiry we sent):
 *
 *   1. Integration model — ECR over serial/USB/TCP, or a local HTTP API/SDK?
 *      That decides whether startSale() opens a serial port / TCP socket and
 *      speaks their ECR protocol, or POSTs to config.posServiceUrl.
 *   2. The terminal model approved for an UNATTENDED kiosk.
 *   3. Response fields — confirm we get authCode, RRN, masked PAN, TID.
 *   4. Settlement/batch API for lastSettlement() reconciliation.
 *   5. A test/sandbox terminal to certify against.
 *
 * Implementation note: keep card handling entirely inside the terminal. The
 * kiosk only sends an amount and receives a result — never PAN/track/PIN data —
 * so the box stays out of PCI scope.
 */
export class GolomtTerminal implements PaymentTerminal {
  readonly name = 'golomt';

  async startSale(_input: {
    orderRef: string;
    amount: number;
    description?: string;
  }): Promise<SaleResult> {
    // --- TODO (ECR model) ---
    //   open serial/TCP to the terminal, send the "sale" command for `amount`,
    //   await the approval/decline frame, parse authCode/RRN/PAN/TID.
    // --- TODO (HTTP/SDK model) ---
    //   const r = await fetch(`${config.posServiceUrl}/sale`, {
    //     method: 'POST', headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ amount: _input.amount, orderRef: _input.orderRef }),
    //   });
    //   return mapGolomtResponse(await r.json());
    void config.posServiceUrl;
    throw new Error('golomt_driver_not_implemented: awaiting Golomt POS integration spec');
  }

  async cancel(_orderRef: string): Promise<SaleResult> {
    throw new Error('golomt_driver_not_implemented: awaiting Golomt POS integration spec');
  }

  async lastSettlement(_date?: string): Promise<SettlementRow[]> {
    throw new Error('golomt_driver_not_implemented: awaiting Golomt POS integration spec');
  }
}
