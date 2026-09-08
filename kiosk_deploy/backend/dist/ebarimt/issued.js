import fs from 'node:fs';
import path from 'node:path';
const STORE_PATH = path.resolve('issued-receipts.json');
/** Two hours — well past the cloud feed's 15-minute window, still tiny on disk. */
const TTL_MS = 2 * 60 * 60 * 1000;
let cache = null;
function load() {
    if (cache)
        return cache;
    try {
        const arr = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        cache = new Map((Array.isArray(arr) ? arr : []).map((r) => [r.orderRef, r]));
    }
    catch {
        cache = new Map();
    }
    return cache;
}
/** Drop aged entries from both the map and disk, so neither grows without end. */
function save(m) {
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
export function recordIssued(rec) {
    const m = load();
    m.set(rec.orderRef, { ...rec, at: Date.now() });
    save(m);
}
/**
 * The locally issued receipt for any of [refs] — the cloud feed names an order
 * by both `reference` and `order_id`, and which one the UI sent as orderRef is
 * not guaranteed, so try each.
 */
export function findIssued(...refs) {
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
//# sourceMappingURL=issued.js.map