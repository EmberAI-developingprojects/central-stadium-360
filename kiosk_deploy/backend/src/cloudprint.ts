import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { printDocument } from './print/winprint.js';
import { ticketSpec, receiptSpec } from './print/layout.js';
/** One line item of a paid order, as the cloud's print-jobs feed reports it. */
interface CloudOrderItem {
    zone_name_mn?: string;
    unit_price?: number;
    qty?: number;
}
/** One entry ticket of an order (each prints its own QR). */
interface CloudTicket {
    code?: string;
    zone_name_mn?: string;
}
/** One recently paid order in the print-jobs feed. */
interface CloudOrder {
    order_id?: string | number;
    reference?: string;
    event_title?: string;
    event_start?: string;
    paid_at?: string;
    total?: number;
    payment_method?: string;
    ebarimt_id?: string;
    ebarimt_qr_data?: string;
    ebarimt_lottery?: string;
    items?: CloudOrderItem[];
    tickets?: CloudTicket[];
}
/** Body of GET /api/kiosk/print-jobs. */
interface PrintJobsResponse {
    data?: CloudOrder[];
}
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
const LEDGER_PATH = path.resolve('printed-codes.json');
function loadLedger(): Set<string> {
    try {
        const arr = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        return new Set<string>(Array.isArray(arr) ? arr : []);
    }
    catch {
        return new Set<string>();
    }
}
function saveLedger(set: Set<string>): void {
    try {
        // Keep the tail only — old codes age out of the cloud window anyway.
        fs.writeFileSync(LEDGER_PATH, JSON.stringify([...set].slice(-5000)));
    }
    catch { /* a full disk must not stop the kiosk */ }
}
export function startCloudPrintPoller(print: typeof printDocument = printDocument): (() => void) | null {
    if (!config.cloudApiBase || !config.cloudKioskKey) {
        console.log('  cloud auto-print     : OFF — set KIOSK_API_BASE + KIOSK_KEY in .env to enable');
        return null;
    }
    const ledger = loadLedger();
    let failures = 0;
    let stopped = false;
    const tick = async (): Promise<void> => {
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
            const j = (await r.json()) as PrintJobsResponse | null;
            failures = 0;
            for (const order of j?.data ?? []) {
                // Zone name → unit price, for the ticket's Үнэ row.
                const priceByZone = new Map((order.items ?? []).map((i): [string | undefined, number | undefined] => [i.zone_name_mn, i.unit_price]));
                const all = order.tickets ?? [];
                for (let idx = 0; idx < all.length; idx++) {
                    const tk = all[idx];
                    if (!tk?.code || ledger.has(tk.code))
                        continue;
                    await print(ticketSpec({
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
                    ledger.add(tk.code);
                    saveLedger(ledger);
                    console.log(`[cloudprint] ticket ${tk.code} printed (order ${String(order.reference).slice(0, 8)})`);
                }
                // Fiscal receipt — only when the cloud has ebarimt data for the
                // order (QPay rail today has none; prints once it appears).
                const rkey = `receipt:${order.order_id}`;
                if (order.ebarimt_qr_data && !ledger.has(rkey)) {
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
                    const totalVAT = Math.round(items.reduce((a, i) => a + i.totalVAT, 0) * 100) / 100;
                    await print(receiptSpec({
                        orderRef: order.reference ?? '',
                        // Legal identity + bill meta, as the standard requires.
                        merchantName: config.ebarimtMerchantName,
                        merchantTin: config.ebarimtMerchantTin,
                        posNo: config.ebarimtPosNo,
                        districtCode: config.ebarimtDistrictCode,
                        branchNo: config.ebarimtBranchNo,
                        id: order.ebarimt_id ?? '',
                        date: order.paid_at ?? '',
                        items,
                        subtotal,
                        totalVAT,
                        total: order.total ?? subtotal,
                        paymentLabel: order.payment_method === 'qpay' ? 'QPay' : 'Карт',
                        ebarimtQrData: order.ebarimt_qr_data,
                        ebarimtLottery: order.ebarimt_lottery ?? '',
                    }));
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
