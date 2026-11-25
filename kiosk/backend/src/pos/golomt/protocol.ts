import type { SaleResult, SaleStatus } from '../types.js';
import { decodeData } from './crypto.js';

/**
 * Golomt IPPOS REST protocol — Request/Response shapes and mapping.
 *
 * Confirmed by decompiling the shipped PobRestLibrary.dll (Pos/Request/Response/
 * ResponseMaker) and running the real Pos() code path:
 *   Request  → JSON (field-named) → Base64 → GET {url}/message?data=<urlencoded>
 *   Response ← JSON ResponseMaker { data, responseCode, responseDesc }
 *              data = Base64(JSON of the inner Response).
 * Envelope responseDesc map seen in the assembly: 00→SUCCESS, 01→"Command mode
 * 201", 91→"Issuer system error", 99→"Other error".
 */

/** Fields of PobRestLibrary.Request (JSON keys are these names verbatim). */
export interface GolomtRequest {
  requestID?: string;
  portNo?: string;
  bandwidth?: string;
  timeout?: string;
  terminalID?: string;
  amount?: string;
  currencyCode?: string;
  operationCode?: string;
  cMode?: string;
  cMode2?: string;
  additionalData?: string;
  cardEntryMode?: string;
  fileData?: string;
  token?: string;
}

/**
 * Operation codes sent as Request.operationCode.
 *
 * ⚠️ CONFIRM against Golomt's REST API doc before production. These are numeric
 * constants inside the DLL (not string literals), and DC_64.exe prompts for them
 * interactively, so they could not be extracted statically. Defaults follow the
 * common Golomt IPPOS convention; override via env. Everything else in this
 * driver (envelope, JSON codec, field layout) is confirmed against the assembly.
 */
export const OP = {
  SALE: process.env.GOLOMT_OP_SALE ?? '1',
  VOID: process.env.GOLOMT_OP_VOID ?? '2',
  REFUND: process.env.GOLOMT_OP_REFUND ?? '3',
  SETTLEMENT: process.env.GOLOMT_OP_SETTLEMENT ?? '9',
} as const;

/**
 * Build the request payload. Drops only null/undefined — EMPTY STRINGS ARE KEPT,
 * because Pos() requires cMode/cMode2/cardEntryMode to be present, and their empty
 * value is exactly what selects the terminal's default (card-accepting) mode.
 */
export function buildRequest(req: GolomtRequest): GolomtRequest {
  const out: GolomtRequest = {};
  for (const [k, v] of Object.entries(req)) {
    if (v != null) (out as Record<string, string>)[k] = String(v);
  }
  return out;
}

/** Inner PobRestLibrary.Response, as JSON field names. */
export interface GolomtResponse {
  errorDesc?: string | null;
  status?: string | null;
  pan?: string | null;
  authorizationCode?: string | null;
  terminalID?: string | null;
  merchantID?: string | null;
  amount?: string | null;
  referenceNo?: string | null;
  textResp?: string | null;
  receiptData?: string | null;
  token?: string | null;
}

/** Outer envelope PobRestLibrary.ResponseMaker. */
export interface GolomtResponseMaker {
  data?: string | null;
  responseCode?: string | null;
  responseDesc?: string | null;
}

/**
 * Parse the HTTP body into a ResponseMaker. The WCF endpoint wraps the operation's
 * string return value under a `PosResult` property, itself a JSON *string*, e.g.
 *   {"PosResult":"{\"data\":\"..\",\"responseCode\":\"91\",\"responseDesc\":\"..\"}"}
 * (confirmed live on 2026-07-02). We unwrap that, and also tolerate a bare
 * ResponseMaker in case a firmware build returns it unwrapped.
 */
export function parseEnvelope(body: string): GolomtResponseMaker {
  let obj: unknown;
  try { obj = JSON.parse(body); } catch { throw new Error(`golomt_bad_response: ${body.slice(0, 300)}`); }
  const rec = obj as Record<string, unknown>;
  const wrapped = rec?.PosResult;
  if (typeof wrapped === 'string') {
    try { return JSON.parse(wrapped) as GolomtResponseMaker; }
    catch { throw new Error(`golomt_bad_posresult: ${wrapped.slice(0, 300)}`); }
  }
  if (wrapped && typeof wrapped === 'object') return wrapped as GolomtResponseMaker;
  return rec as GolomtResponseMaker;
}

/**
 * Recover the inner Response from a ResponseMaker. `data` is Base64(JSON of the
 * Response); we parse defensively (base64→JSON, then plain JSON, then object) so
 * we stay robust if a firmware build encodes it slightly differently. Returns
 * undefined when no structured inner payload is present (e.g. an error envelope
 * whose `data` is a base64'd plain error string).
 */
export function parseInnerResponse(maker: GolomtResponseMaker): GolomtResponse | undefined {
  const data = maker.data;
  if (data == null || data === '') return undefined;
  if (typeof data === 'object') return data as GolomtResponse;
  const asObj = (s: string): GolomtResponse | undefined => {
    try { const o = JSON.parse(s); return o && typeof o === 'object' ? (o as GolomtResponse) : undefined; }
    catch { return undefined; }
  };
  let decoded: string | undefined;
  try { decoded = decodeData(data); } catch { decoded = undefined; }
  return (decoded ? asObj(decoded) : undefined) ?? asObj(data);
}

/**
 * "00" is the ISO-8583 approval code; the envelope also echoes responseDesc
 * "SUCCESS". Approval = inner Response.status "00" (preferred) or, absent an
 * inner status, envelope responseCode "00"/SUCCESS. Anything else is a decline.
 */
export function mapStatus(maker: GolomtResponseMaker, inner?: GolomtResponse): SaleStatus {
  const ok = (v?: string | null) => v === '00' || v === '000';
  if (inner?.status != null) return ok(inner.status) ? 'approved' : 'declined';
  if (ok(maker.responseCode)) return 'approved';
  if ((maker.responseDesc ?? '').toUpperCase() === 'SUCCESS') return 'approved';
  return 'declined';
}

/** Map a parsed Golomt response envelope to the bridge's SaleResult. */
export function toSaleResult(
  input: { orderRef: string; amount: number },
  maker: GolomtResponseMaker,
): SaleResult {
  const inner = parseInnerResponse(maker);
  const status = mapStatus(maker, inner);
  const reason =
    inner?.errorDesc || inner?.textResp || maker.responseDesc || maker.responseCode || undefined;
  return {
    status,
    orderRef: input.orderRef,
    amount: inner?.amount ? Number(inner.amount) || input.amount : input.amount,
    authCode: inner?.authorizationCode ?? undefined,
    rrn: inner?.referenceNo ?? undefined,
    cardMasked: inner?.pan ?? undefined,
    terminalId: inner?.terminalID ?? undefined,
    reason: status === 'approved' ? undefined : reason ?? undefined,
  };
}
