import type { SaleResult, SaleStatus } from '../types.js';

/**
 * protocol.ts — the ACQUIRER-SPECIFIC half of the Verifone ECR integration:
 * how a "sale" request is packed into the payload that ./transport.ts frames,
 * and how the terminal's response payload is parsed into a SaleResult.
 *
 * The transport (ENQ/ACK, STX/ETX/LRC) is universal; THIS file is the only
 * part that changes per acquirer. Field positions/codes below follow the common
 * Verifone ECR field-delimited shape, but the EXACT request opcode, field order,
 * amount scaling (MNT has no minor unit) and response tags MUST be confirmed
 * against the bank's ECR spec PDF before going live. Until that is verified,
 * `SPEC_CONFIRMED` stays false and the driver refuses to transmit a sale — it
 * will not push a guessed money frame to a live terminal.
 */
export const SPEC_CONFIRMED = false;

// Field separator used by the field-delimited ECR payload (FS = 0x1c is typical).
const FS = 0x1c;

/** Transaction type codes — PLACEHOLDERS, confirm against the spec. */
export const TxnType = {
  SALE: '01',
  VOID: '02',
  SETTLEMENT: '50',
} as const;

export interface SaleRequest {
  orderRef: string;
  amount: number; // MNT, integer (no minor unit)
}

/**
 * Encode a sale into the ECR payload (without STX/ETX/LRC — transport adds those).
 *
 * Representative layout (CONFIRM each field & order against the spec):
 *   <TxnType> FS <ECR-ref> FS <amount> FS <currency>
 * MNT is amount-as-integer (no ×100). The ECR reference echoes back in the
 * response so we can correlate to orderRef.
 */
export function encodeSaleRequest(req: SaleRequest): Buffer {
  if (!SPEC_CONFIRMED) {
    throw new Error(
      'verifone_spec_pending: card sale framing is not yet confirmed against the ' +
        'acquirer ECR spec. Provide the spec PDF, set the field layout here, then ' +
        'flip SPEC_CONFIRMED. Transport + handshake are ready; only this mapping is gated.',
    );
  }
  const ref = req.orderRef.slice(0, 16); // ECR ref field is length-bounded
  const fields = [TxnType.SALE, ref, String(req.amount), '496' /* ISO 4217 MNT */];
  return Buffer.from(fields.join(String.fromCharCode(FS)), 'ascii');
}

/** Map an acquirer response code to our SaleStatus. CONFIRM codes vs the spec. */
function statusFromCode(code: string): SaleStatus {
  if (code === '00' || code === '000') return 'approved';
  if (code === 'UC' || code === 'CN') return 'cancelled';
  if (code === 'TO' || code === 'CE') return 'error';
  return 'declined';
}

/**
 * Parse a terminal response payload into a SaleResult.
 * Representative field order — CONFIRM against the spec response section.
 */
export function parseSaleResponse(payload: Buffer, req: SaleRequest): SaleResult {
  const fields = payload.toString('ascii').split(String.fromCharCode(FS));
  const [respCode = '', authCode = '', rrn = '', pan = '', tid = ''] = fields;
  const status = statusFromCode(respCode.trim());
  return {
    status,
    orderRef: req.orderRef,
    amount: req.amount,
    authCode: authCode.trim() || undefined,
    rrn: rrn.trim() || undefined,
    cardMasked: maskPan(pan.trim()) || undefined,
    terminalId: tid.trim() || undefined,
    reason: status === 'approved' ? undefined : `terminal response ${respCode.trim() || 'unknown'}`,
  };
}

/** Keep only the last 4 of an already-masked PAN; never store the full number. */
function maskPan(pan: string): string {
  if (!pan) return '';
  const last4 = pan.replace(/\D/g, '').slice(-4);
  return last4 ? `****${last4}` : '';
}
