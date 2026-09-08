import fs from 'node:fs';
import path from 'node:path';

/**
 * What the local PosAPI actually issued for one order.
 *
 * The cloud's print-jobs feed carries only the QR and the lottery number — it
 * reports ebarimt_ddtd, ebarimt_date and ebarimt_vat as null — so a barimt
 * printed from the feed alone loses its ДДТД and cannot name the buying
 * company. Rail B (routes/ebarimt.ts → PosAPI) holds all of it at issue time,
 * so we keep it here and cloudprint.ts prefers this record over the feed.
 *
 * Keeping it also removes the wait: cloudprint no longer has to sit out
 * RECEIPT_WAIT_MS hoping the cloud catches up, because the moment PosAPI
 * answers, the receipt is already complete on this box.
 */
export interface IssuedReceiptRecord {
    orderRef: string;
    /** ДДТД — the fiscal receipt id. */
    id: string;
    qrData: string;
    lottery: string;
    date: string;
    totalVAT: number;
    totalCityTax: number;
    /** Set only for B2B — the buying company's ТТД. */
    customerTin?: string;
    posNo: string;
    /** Epoch ms, for ageing entries out. */
    at: number;
}

const STORE_PATH = path.resolve('issued-receipts.json');
/** Two hours — well past the cloud feed's 15-minute window, still tiny on disk. */
const TTL_MS = 2 * 60 * 60 * 1000;

let cache: Map<string, IssuedReceiptRecord> | null = null;

function load(): Map<string, IssuedReceiptRecord> {
    if (cache)
        return cache;
    try {
        const arr = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as IssuedReceiptRecord[];
        cache = new Map((Array.isArray(arr) ? arr : []).map((r) => [r.orderRef, r]));
    }
    catch {
        cache = new Map();
    }
    return cache;
}

/** Drop aged entries from both the map and disk, so neither grows without end. */
function save(m: Map<string, IssuedReceiptRecord>): void {
    const cutoff = Date.now() - TTL_MS;
    for (const [k, v] of m) {
        if (v.at < cutoff)
            m.delete(k);
    }
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify([...m.values()]));
    }
    catch { /* a full disk must not stop the kiosk */ }
}

/** Remember what PosAPI issued for [orderRef] so the printer can use it. */
export function recordIssued(rec: Omit<IssuedReceiptRecord, 'at'>): void {
    const m = load();
    m.set(rec.orderRef, { ...rec, at: Date.now() });
    save(m);
}

/**
 * The locally issued receipt for any of [refs] — the cloud feed names an order
 * by both `reference` and `order_id`, and which one the UI sent as orderRef is
 * not guaranteed, so try each.
 */
export function findIssued(...refs: Array<string | number | undefined>): IssuedReceiptRecord | undefined {
    const m = load();
    for (const r of refs) {
        if (r == null)
            continue;
        const hit = m.get(String(r));
        if (hit)
            return hit;
    }
    return undefined;
}
