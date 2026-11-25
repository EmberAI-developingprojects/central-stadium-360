import { config } from '../config.js';
import type { PaymentTerminal, SaleResult, SettlementRow } from './types.js';
import { encodeRequestData } from './golomt/crypto.js';
import {
  buildRequest, toSaleResult, parseInnerResponse, parseEnvelope, OP,
  type GolomtRequest, type GolomtResponseMaker,
} from './golomt/protocol.js';

/**
 * GolomtTerminal — driver for Golomt Bank's IPPOS (Integrated Payment POS) via
 * the on-box GLMTPOS REST service (PobRestService.exe), which fronts the
 * DualConnector COM library that speaks to the Verifone/iPOS terminal.
 *
 * The kiosk stays out of PCI scope: it only sends amount + operation and gets
 * back an approved/declined result. Card handling lives entirely in the terminal
 * and the local service.
 *
 * Confirmed by decompiling + running the shipped GLMTPOS.msi assemblies:
 *   - endpoint: GET {golomtPosUrl}/message?data={data}   (WCF webHttpBinding, JSON out)
 *   - data:     Base64(UTF8(JSON of the Request))   (NOT encrypted; see golomt/crypto.ts)
 *   - response: JSON ResponseMaker { data=Base64(JSON Response), responseCode, responseDesc }
 *
 * Prerequisites on the kiosk box: install GLMTPOS.msi (registers the service on
 * :8500), drop the SAClient.lic license, and point the service's DualConnector.xml
 * at the terminal's COM port. Then set POS_DRIVER=golomt + GOLOMT_TERMINAL_ID.
 *
 * NOTE — one unverified value remains: the numeric operationCode mapping (OP.*
 * in protocol.ts). Everything else (transport/crypto/field layout) is confirmed.
 */
export class GolomtTerminal implements PaymentTerminal {
  readonly name = 'golomt';
  private readonly base = config.golomtPosUrl.replace(/\/$/, '');

  /** Common Request fields for every call. */
  private baseRequest(orderRef: string): GolomtRequest {
    // Pos() feeds portNo to SetChannelTerminalParam(Int64 nCOM, ...), so it must be
    // the numeric port (9), not "COM9" — normalize either form to digits.
    const portNum = (config.golomtPortNo || '').replace(/\D/g, '');
    return {
      requestID: orderRef,
      terminalID: config.golomtTerminalId || undefined,
      currencyCode: config.golomtCurrencyCode,
      timeout: String(config.golomtTerminalTimeoutMs),
      portNo: portNum || undefined,
      bandwidth: portNum ? config.golomtBandwidth : undefined,
      // Required non-null: Pos() dereferences cMode/cMode2/cardEntryMode (NullRef otherwise).
      cMode: config.golomtCmode,
      cMode2: config.golomtCmode2,
      cardEntryMode: config.golomtCardEntryMode,
    };
  }

  /** Encrypt + GET /message, returning the parsed ResponseMaker envelope. */
  private async exchange(req: GolomtRequest): Promise<GolomtResponseMaker> {
    if (!config.golomtTerminalId) {
      throw new Error('golomt_not_configured: set GOLOMT_TERMINAL_ID for the provisioned TID');
    }
    const data = encodeRequestData(buildRequest(req));
    const url = `${this.base}/message?data=${encodeURIComponent(data)}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.golomtHttpTimeoutMs);
    try {
      const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`golomt_http_${res.status}: ${text.slice(0, 300)}`);
      }
      return parseEnvelope(text);
    } finally {
      clearTimeout(timer);
    }
  }

  async startSale(input: { orderRef: string; amount: number; description?: string }): Promise<SaleResult> {
    const maker = await this.exchange({
      ...this.baseRequest(input.orderRef),
      amount: String(input.amount),
      operationCode: OP.SALE,
    });
    return toSaleResult({ orderRef: input.orderRef, amount: input.amount }, maker);
  }

  async cancel(orderRef: string): Promise<SaleResult> {
    const maker = await this.exchange({
      ...this.baseRequest(orderRef),
      operationCode: OP.VOID,
    });
    const result = toSaleResult({ orderRef, amount: 0 }, maker);
    // A successful void surfaces as 'cancelled' rather than 'approved'.
    if (result.status === 'approved') result.status = 'cancelled';
    return result;
  }

  async lastSettlement(_date?: string): Promise<SettlementRow[]> {
    // Batch close / settlement. The service returns the batch summary in the
    // response's receiptData/textResp (a printable roll, per the DualConnector
    // logs) rather than structured rows, so we expose what we can parse and
    // otherwise return an empty set. Reconcile against the printed batch report.
    const maker = await this.exchange({
      ...this.baseRequest(`settle-${_date ?? 'current'}`),
      operationCode: OP.SETTLEMENT,
    });
    const inner = parseInnerResponse(maker);
    if (inner?.referenceNo && inner.amount) {
      return [{
        rrn: inner.referenceNo,
        amount: Number(inner.amount) || 0,
        authCode: inner.authorizationCode ?? undefined,
        settledAt: undefined,
      }];
    }
    return [];
  }
}
