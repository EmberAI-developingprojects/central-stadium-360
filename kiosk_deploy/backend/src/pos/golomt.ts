import { config } from '../config.js';
import type { PaymentTerminal, SaleInput, SaleResult, CancelResult } from './types.js';

// Real SAO_* enum values extracted from Golomt's DualConnector.dll metadata
// (2026-09-01): SALE=1, REFUND=3, VOID=4, SETTLEMENT=59. The old 200/201/202/500
// defaults were placeholders that made the service NRE-crash as "error 91".
const OP = {
    SALE: Number(process.env.POS_OP_SALE ?? 1),
    VOID: Number(process.env.POS_OP_VOID ?? 4),
    REFUND: Number(process.env.POS_OP_REFUND ?? 3),
    SETTLEMENT: Number(process.env.POS_OP_SETTLEMENT ?? 59),
};
// Envelope amount is in MINOR units (möngö, ₮ × 100) — field-proven 2026-09-02:
// sending "10000" made the terminal charge 100.00₮.
const AMOUNT_MULT = Number(process.env.POS_AMOUNT_MULTIPLIER ?? 100);
// Terminal channel params — PobRestLibrary passes these straight into
// DCLink.SetChannelTerminalParam / Exchange. Values match DualConnector.xml
// (terminal on COM10 @ 115200) and the 3-minute card timeout, in seconds.
const COM_PORT = process.env.POS_COM_PORT ?? '10';
const BAUD_RATE = process.env.POS_BAUDRATE ?? '115200';
// Exchange timeout is in MILLISECONDS — field-proven 2026-09-01: sending "180"
// cancelled the terminal ~0.2s after the card prompt ("Operation timeout",
// code 11). 180000 = the intended 3 minutes for tap + PIN.
const EXCHANGE_TIMEOUT_MS = String(
    Number(process.env.POS_EXCHANGE_TIMEOUT_MS
        ?? (process.env.POS_EXCHANGE_TIMEOUT_S
            ? Number(process.env.POS_EXCHANGE_TIMEOUT_S) * 1000
            : 180000)));

/** The 14-field PobRestLibrary request envelope — every field a string. */
interface PosEnvelope {
    requestID: string;
    portNo: string;
    bandwidth: string;
    timeout: string;
    terminalID: string;
    amount: string;
    currencyCode: string;
    operationCode: string;
    cMode: string;
    cMode2: string;
    additionalData: string;
    cardEntryMode: string;
    fileData: string;
    token: string;
}

/**
 * Full 14-field request contract of PobRestLibrary (recovered from the DLL's
 * field table, 2026-09-01). EVERY string field must be present: the service
 * calls .Equals("") on cMode/cMode2/cardEntryMode without a null check, so a
 * missing key = NullReferenceException = the infamous "91 Issuer system error".
 * All values are strings — the service Int32.Parse-es the numeric ones itself.
 */
function baseEnvelope(operationCode: number, requestID: string): PosEnvelope {
    return {
        requestID,
        portNo: COM_PORT,
        bandwidth: BAUD_RATE,
        timeout: EXCHANGE_TIMEOUT_MS,
        terminalID: process.env.POS_TERMINAL_ID ?? '',
        amount: '',
        currencyCode: '496',
        operationCode: String(operationCode),
        cMode: '',
        cMode2: '',
        additionalData: '',
        cardEntryMode: '',
        fileData: '',
        token: '',
    };
}
const APPROVED_STATUS = (process.env.POS_APPROVED_STATUS ?? 'approved').toLowerCase();
const REQUEST_TIMEOUT_MS = Math.max(
    Number(process.env.POS_REQUEST_TIMEOUT_MS ?? 180000),
    Number(process.env.POS_EXCHANGE_TIMEOUT_MS ?? 180000) + 30000);

function b64encodeUtf8(s: string): string {
    return Buffer.from(s, 'utf-8').toString('base64');
}
function b64decodeUtf8(s: string): string {
    return Buffer.from(s, 'base64').toString('utf-8');
}

/**
 * Decoded POS service response. The shape is genuinely dynamic (it differs
 * between the mock, the WCF envelope, and the unwrapped SAPacket), so every
 * field is optional and unknown-indexed; access stays optional-chained.
 */
interface PosResponse {
    Status?: string;
    status?: string | number;
    OperationCode?: number;
    ResponseCode?: string | number;
    responseCode?: string;
    responseDesc?: string;
    PosResult?: string;
    PosResultRaw?: string;
    data?: string;
    dataText?: string;
    TextResponse?: string;
    errorDesc?: string;
    textResp?: string;
    authorizationCode?: string;
    AuthorizationCode?: string;
    referenceNo?: string;
    ReferenceNumber?: string;
    pan?: string;
    PAN?: string;
    terminalID?: string;
    TerminalID?: string;
    merchantID?: string;
    MerchantID?: string;
    receiptData?: string;
    ReceiptData?: string;
    Amount?: string | number;
    Sales?: unknown[];
    [key: string]: unknown;
}

async function sendToPos(payload: PosEnvelope): Promise<PosResponse> {
    const base = config.posServiceUrl.endsWith('/')
        ? config.posServiceUrl
        : config.posServiceUrl + '/';
    const url = new URL('message', base);
    url.searchParams.set('data', b64encodeUtf8(JSON.stringify(payload)));

    if (config.posDebug) {
        console.log('[pos.golomt] →', url.toString());
        console.log('[pos.golomt] req', JSON.stringify(payload));
    }

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
        res = await fetch(url.toString(), { method: 'GET', signal: ctl.signal });
    } finally {
        clearTimeout(timer);
    }
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (config.posDebug)
            console.log(`[pos.golomt] ← HTTP ${res.status}`, body);
        throw new Error(`pos_http_${res.status}: ${body.slice(0, 200)}`);
    }
    const text = await res.text();
    if (config.posDebug)
        console.log('[pos.golomt] ←', text.slice(0, 500));

    let outer: PosResponse | string;
    try {
        outer = JSON.parse(text);
    } catch {
        outer = text;
    }
    if (typeof outer === 'string') {
        try {
            return JSON.parse(b64decodeUtf8(outer));
        } catch {
            try {
                return JSON.parse(outer);
            } catch {
                return { TextResponse: outer };
            }
        }
    }
    if (outer && typeof outer === 'object' && typeof outer.data === 'string') {
        try {
            return JSON.parse(b64decodeUtf8(outer.data));
        } catch {
            return outer;
        }
    }
    return unwrapPosResult(outer);
}

/**
 * The live Golomt WCF service answers as
 *   { "PosResult": "{\"data\":\"<base64>\",\"responseCode\":\"91\",...}" }
 * — a JSON string inside a JSON envelope, with the transaction detail base64'd
 * inside THAT. Field-observed 2026-08-29; without this unwrap even an approved
 * sale (responseCode "00") would read as declined, because the code never
 * surfaced out of the PosResult wrapper.
 */
function unwrapPosResult(outer: PosResponse): PosResponse {
    if (!outer || typeof outer !== 'object' || typeof outer.PosResult !== 'string') {
        return outer;
    }
    let inner: PosResponse;
    try {
        inner = JSON.parse(outer.PosResult);
    } catch {
        return outer;
    }
    const result: PosResponse = {
        responseCode: inner?.responseCode,
        responseDesc: inner?.responseDesc,
        PosResultRaw: outer.PosResult,
    };
    if (typeof inner?.data === 'string' && inner.data) {
        try {
            const decoded = b64decodeUtf8(inner.data);
            try {
                Object.assign(result, JSON.parse(decoded));
            } catch {
                result.dataText = decoded;
            }
        } catch {
            result.dataText = inner.data;
        }
    }
    return result;
}

function isApproved(r: PosResponse): boolean {
    const status = String(r?.Status ?? '').toLowerCase();
    if (status === APPROVED_STATUS)
        return true;
    if (r?.OperationCode === 0)
        return true;
    if (String(r?.ResponseCode ?? '') === '00')
        return true;
    // Live envelope: ISO-8583-style approval code from the unwrapped PosResult.
    if (String(r?.responseCode ?? '') === '00')
        return true;
    // Inner SAPacket status: 1 = approved (set alongside responseCode 00).
    if (String(r?.status ?? '') === '1')
        return true;
    // A non-empty authorizationCode only ever comes back on a host-approved
    // transaction — declines and cancels return it null (field-observed).
    if (r?.authorizationCode || r?.AuthorizationCode)
        return true;
    return false;
}

export class GolomtTerminal implements PaymentTerminal {
    name = 'golomt';

    async startSale(input: SaleInput): Promise<SaleResult> {
        const req = baseEnvelope(OP.SALE, input.orderRef);
        req.amount = String(Math.round(input.amount * AMOUNT_MULT));
        const r = await sendToPos(req);
        const approved = isApproved(r);
        console.log(`[pos.golomt] sale ${approved ? 'APPROVED' : 'DECLINED'}`
            + ` status=${r?.status ?? ''} rc=${r?.responseCode ?? ''}`
            + ` auth=${r?.authorizationCode ?? ''} rrn=${r?.referenceNo ?? ''}`
            + ` err=${r?.errorDesc ?? r?.textResp ?? ''}`);
        return {
            status: approved ? 'approved' : 'declined',
            orderRef: input.orderRef,
            amount: input.amount,
            authCode: r?.authorizationCode ?? r?.AuthorizationCode ?? undefined,
            rrn: r?.referenceNo ?? r?.ReferenceNumber ?? undefined,
            cardMasked: r?.pan ?? r?.PAN ?? undefined,
            terminalId: r?.terminalID ?? r?.TerminalID ?? undefined,
            merchantId: r?.merchantID ?? r?.MerchantID ?? undefined,
            receipt: r?.receiptData ?? r?.ReceiptData ?? r?.textResp ?? undefined,
            errorText: approved ? undefined : (r?.errorDesc || (r?.responseDesc ?? r?.dataText) || undefined),
            raw: r,
        };
    }

    async cancel(orderRef: string): Promise<CancelResult> {
        const req = baseEnvelope(OP.VOID, orderRef);
        const r = await sendToPos(req);
        const approved = isApproved(r);
        return {
            status: approved ? 'cancelled' : 'error',
            orderRef,
            amount: r?.Amount ? Math.round(Number(r.Amount) / (AMOUNT_MULT || 1)) : 0,
            authCode: r?.AuthorizationCode ?? undefined,
            rrn: r?.ReferenceNumber ?? undefined,
            errorText: approved ? undefined : (r?.errorDesc || (r?.responseDesc ?? r?.dataText) || undefined),
            raw: r,
        };
    }

    async lastSettlement(date?: string): Promise<unknown[]> {
        const req = baseEnvelope(
            OP.SETTLEMENT,
            `settle-${date || new Date().toISOString().slice(0, 10)}`,
        );
        const r = await sendToPos(req);
        if (Array.isArray(r?.Sales))
            return r.Sales;
        if (Array.isArray(r))
            return r;
        return [r];
    }
}
