import { config } from '../config.js';

const OP = {
    SALE: Number(process.env.POS_OP_SALE ?? 200),
    VOID: Number(process.env.POS_OP_VOID ?? 201),
    REFUND: Number(process.env.POS_OP_REFUND ?? 202),
    SETTLEMENT: Number(process.env.POS_OP_SETTLEMENT ?? 500),
};
const AMOUNT_MULT = Number(process.env.POS_AMOUNT_MULTIPLIER ?? 1);
const APPROVED_STATUS = (process.env.POS_APPROVED_STATUS ?? 'approved').toLowerCase();
const REQUEST_TIMEOUT_MS = Number(process.env.POS_REQUEST_TIMEOUT_MS ?? 180000);

function b64encodeUtf8(s) {
    return Buffer.from(s, 'utf-8').toString('base64');
}
function b64decodeUtf8(s) {
    return Buffer.from(s, 'base64').toString('utf-8');
}

async function sendToPos(payload) {
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
    let res;
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

    let outer;
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
    return outer;
}

function isApproved(r) {
    const status = String(r?.Status ?? '').toLowerCase();
    if (status === APPROVED_STATUS)
        return true;
    if (r?.OperationCode === 0)
        return true;
    if (String(r?.ResponseCode ?? '') === '00')
        return true;
    return false;
}

export class GolomtTerminal {
    name = 'golomt';

    async startSale(input) {
        const req = {
            OperationCode: OP.SALE,
            Amount: Math.round(input.amount * AMOUNT_MULT),
            TerminalID: process.env.POS_TERMINAL_ID ?? '',
            MerchantID: process.env.POS_MERCHANT_ID ?? '',
            requestID: input.orderRef,
        };
        const r = await sendToPos(req);
        const approved = isApproved(r);
        return {
            status: approved ? 'approved' : 'declined',
            orderRef: input.orderRef,
            amount: input.amount,
            authCode: r?.AuthorizationCode ?? undefined,
            rrn: r?.ReferenceNumber ?? undefined,
            cardMasked: r?.PAN ?? undefined,
            terminalId: r?.TerminalID ?? undefined,
            merchantId: r?.MerchantID ?? undefined,
            receipt: r?.ReceiptData ?? r?.TextResponse ?? undefined,
            errorText: approved ? undefined : (r?.ErrorDescription ?? r?.TextResponse ?? undefined),
            raw: r,
        };
    }

    async cancel(orderRef) {
        const req = {
            OperationCode: OP.VOID,
            requestID: orderRef,
            TerminalID: process.env.POS_TERMINAL_ID ?? '',
            MerchantID: process.env.POS_MERCHANT_ID ?? '',
        };
        const r = await sendToPos(req);
        const approved = isApproved(r);
        return {
            status: approved ? 'cancelled' : 'error',
            orderRef,
            amount: r?.Amount ? Math.round(Number(r.Amount) / (AMOUNT_MULT || 1)) : 0,
            authCode: r?.AuthorizationCode ?? undefined,
            rrn: r?.ReferenceNumber ?? undefined,
            errorText: approved ? undefined : (r?.ErrorDescription ?? r?.TextResponse ?? undefined),
            raw: r,
        };
    }

    async lastSettlement(date) {
        const req = {
            OperationCode: OP.SETTLEMENT,
            requestID: `settle-${date || new Date().toISOString().slice(0, 10)}`,
            TerminalID: process.env.POS_TERMINAL_ID ?? '',
            MerchantID: process.env.POS_MERCHANT_ID ?? '',
        };
        const r = await sendToPos(req);
        if (Array.isArray(r?.Sales))
            return r.Sales;
        if (Array.isArray(r))
            return r;
        return [r];
    }
}
//# sourceMappingURL=golomt.js.map
