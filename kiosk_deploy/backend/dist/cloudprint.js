import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { printDocument } from './print/winprint.js';
import { ticketSpec, receiptSpec, combineSpecs } from './print/layout.js';
/**
 * Cloud print poller.
 *
 * The shipped kiosk web build never calls the bridge's /print routes, so the
 * bridge itself polls the cloud backend for recently PAID orders of this kiosk
 * (GET /api/kiosk/print-jobs, gated by X-Kiosk-Key) and prints each entry
 * ticket exactly once. A small on-disk ledger of printed codes survives
 * restarts, so a bridge restart inside the cloud's 15-minute window never
 * reprints a ticket.
 */
/**
 * How long to hold a paid order's tickets while the cloud registers its
 * e-barimt, so both land on one slip. Issuance normally completes within a
 * second or two of payment; past this the tickets print on their own.
 */
const RECEIPT_WAIT_MS = 20000;
const LEDGER_PATH = path.resolve('printed-codes.json');
function loadLedger() {
    try {
        const arr = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        return new Set(Array.isArray(arr) ? arr : []);
    }
    catch {
        return new Set();
    }
}
function saveLedger(set) {
    try {
        // Keep the tail only — old codes age out of the cloud window anyway.
        fs.writeFileSync(LEDGER_PATH, JSON.stringify([...set].slice(-5000)));
    }
    catch { /* a full disk must not stop the kiosk */ }
}
export function startCloudPrintPoller(print = printDocument) {
    if (!config.cloudApiBase || !config.cloudKioskKey) {
        console.log('  cloud auto-print     : OFF — set KIOSK_API_BASE + KIOSK_KEY in .env to enable');
        return null;
    }
    const ledger = loadLedger();
    let failures = 0;
    let stopped = false;
    const tick = async () => {
        if (stopped)
            return;
        try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 10000);
            const r = await fetch(`${config.cloudApiBase}/api/kiosk/print-jobs`, {
                headers: {
                    'X-Kiosk-Key': config.cloudKioskKey,
                    'X-Kiosk-Id': config.cloudKioskId,
                },
                signal: ctl.signal,
            });
            clearTimeout(t);
            if (!r.ok)
                throw new Error(`HTTP ${r.status}`);
            const j = (await r.json());
            failures = 0;
            for (const order of j?.data ?? []) {
                const okey = `order:${order.order_id}`;
                const rkey = `receipt:${order.order_id}`;
                const all = (order.tickets ?? []).filter((tk) => !!tk?.code);
                // Orders printed under the older per-ticket scheme keep their
                // codes in the ledger — treat those as already done.
                const ticketsDone = ledger.has(okey)
                    || (all.length > 0 && all.every((tk) => ledger.has(tk.code)));
                const receiptDone = ledger.has(rkey);
                if (ticketsDone && receiptDone)
                    continue;
                const hasReceipt = order.payment_method === 'qpay' && !!order.ebarimt_qr_data;
                // Zone name → unit price, for the ticket's Үнэ row.
                const priceByZone = new Map((order.items ?? []).map((i) => [i.zone_name_mn, i.unit_price]));
                const buildReceipt = () => {
                    // Full ТЕГ paper template. VAT here is 10% INCLUSIVE
                    // (price/11), matching how the bill itself was declared.
                    const vatable = config.ebarimtVatable;
                    const items = (order.items ?? []).map((i) => {
                        const lineTotal = (i.qty ?? 1) * (i.unit_price ?? 0);
                        return {
                            name: `${order.event_title ?? ''} — ${i.zone_name_mn ?? ''}`.replace(/^ — /, ''),
                            qty: i.qty ?? 1,
                            unitPrice: i.unit_price ?? 0,
                            totalAmount: lineTotal,
                            totalVAT: vatable ? Math.round((lineTotal / 11) * 100) / 100 : 0,
                            measureUnit: 'ширхэг',
                        };
                    });
                    const subtotal = items.reduce((a, i) => a + i.totalAmount, 0);
                    // Prefer the VAT the tax authority actually registered for
                    // this bill; fall back to the per-line 1/11 computation.
                    const totalVAT = order.ebarimt_vat != null
                        ? Number(order.ebarimt_vat)
                        : Math.round(items.reduce((a, i) => a + i.totalVAT, 0) * 100) / 100;
                    return receiptSpec({
                        orderRef: order.reference ?? '',
                        // Legal identity + bill meta, as the standard requires.
                        merchantName: config.ebarimtMerchantName,
                        merchantTin: config.ebarimtMerchantTin,
                        posNo: config.ebarimtPosNo,
                        districtCode: config.ebarimtDistrictCode,
                        branchNo: config.ebarimtBranchNo,
                        id: order.ebarimt_ddtd || order.ebarimt_id || '',
                        date: order.ebarimt_date || order.paid_at || '',
                        items,
                        subtotal,
                        totalVAT,
                        totalCityTax: order.ebarimt_city_tax != null
                            ? Number(order.ebarimt_city_tax)
                            : 0,
                        total: order.total ?? subtotal,
                        paymentLabel: order.payment_method === 'qpay' ? 'QPay' : 'Карт',
                        ebarimtQrData: order.ebarimt_qr_data,
                        ebarimtLottery: order.ebarimt_lottery ?? '',
                    });
                };
                if (!ticketsDone) {
                    // One purchase, one slip: hold the tickets briefly so the
                    // e-barimt (issued cloud-side a moment after payment) rides
                    // along. If it never shows, the buyer still gets their
                    // tickets and the receipt follows on its own.
                    const paidMs = order.paid_at ? Date.parse(order.paid_at) : NaN;
                    const waited = Number.isNaN(paidMs) ? Infinity : Date.now() - paidMs;
                    if (order.payment_method === 'qpay' && !hasReceipt && waited < RECEIPT_WAIT_MS)
                        continue;
                    const specs = all.map((tk, idx) => ticketSpec({
                        orderRef: order.reference ?? '',
                        code: tk.code,
                        event: order.event_title ?? '',
                        zone: tk.zone_name_mn ?? '',
                        quantity: 1,
                        // "1 ширхэг" on single-ticket orders; "n / total" only
                        // when several physical tickets need telling apart.
                        seq: all.length > 1 ? `${idx + 1} / ${all.length}` : undefined,
                        price: priceByZone.get(tk.zone_name_mn),
                        startsAt: order.event_start ?? '',
                        purchasedAt: order.paid_at ?? '',
                        venue: config.venueName,
                        qrData: tk.code,
                    }));
                    if (hasReceipt)
                        specs.push(buildReceipt());
                    if (specs.length === 0)
                        continue;
                    await print(combineSpecs(`Захиалга ${order.reference ?? ''}`.trim(), specs));
                    ledger.add(okey);
                    for (const tk of all)
                        ledger.add(tk.code);
                    if (hasReceipt)
                        ledger.add(rkey);
                    saveLedger(ledger);
                    console.log(`[cloudprint] order ${String(order.reference).slice(0, 8)} printed — ${all.length} ticket(s)${hasReceipt ? ' + И-Баримт' : ', receipt pending'}`);
                }
                else if (hasReceipt && !receiptDone) {
                    // Tickets already went out without the receipt — print it
                    // on its own now that the e-barimt has landed.
                    await print(buildReceipt());
                    ledger.add(rkey);
                    saveLedger(ledger);
                    console.log(`[cloudprint] receipt printed (order ${String(order.reference).slice(0, 8)})`);
                }
            }
        }
        catch (e) {
            failures += 1;
            // First failure logs immediately; then once a minute so a dead
            // network doesn't flood the console.
            if (failures === 1 || failures % 12 === 0)
                console.warn(`[cloudprint] poll failed (${failures}x): ${String(e)}`);
        }
        finally {
            if (!stopped)
                setTimeout(tick, config.printPollMs);
        }
    };
    console.log(`  cloud auto-print     : ON — ${config.cloudApiBase} every ${config.printPollMs}ms as ${config.cloudKioskId}`);
    tick();
    return () => { stopped = true; };
}
//# sourceMappingURL=cloudprint.js.map