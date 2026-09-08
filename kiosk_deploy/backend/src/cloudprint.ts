import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { printDocument } from './print/winprint.js';
import { ticketSpec, receiptSpec, combineSpecs } from './print/layout.js';
import type { PrintSpec } from './print/layout.js';
import { findIssued } from './ebarimt/issued.js';

interface CloudOrderItem {
    zone_name_mn?: string;
    unit_price?: number;
    qty?: number;
}
interface CloudTicket {
    code?: string;
    zone_name_mn?: string;
}
interface CloudOrder {
    order_id?: string | number;
    reference?: string;
    event_title?: string;
    event_start?: string;
    paid_at?: string;
    total?: number;
    payment_method?: string;
    ebarimt_id?: string;
    ebarimt_ddtd?: string;
    ebarimt_qr_data?: string;
    ebarimt_lottery?: string;
    /**
     * Buyer company ТТД for a B2B sale. The cloud issues the barimt (Rail A),
     * so it is the only party that knows this — the bridge never sees the
     * choice. Reading it here means the slip prints 'ААН (B2B)' and a
     * Худ.авагч ТТД row the moment the cloud starts sending the field.
     */
    ebarimt_customer_tin?: string;
    ebarimt_date?: string;
    ebarimt_vat?: number | null;
    ebarimt_city_tax?: number | null;
    items?: CloudOrderItem[];
    tickets?: CloudTicket[];
}

interface PrintJobsResponse {
    data?: CloudOrder[];
}

const RECEIPT_WAIT_MS = 20000;

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
/**
 * The live ledger, shared with GET /print/status.
 *
 * The kiosk UI holds the buyer on a "printing…" screen until the slip is out,
 * so it needs to know when this poller actually printed an order. Only the
 * poller owns the set; this is a read-only window onto it.
 */
let liveLedger: Set<string> | null = null;

/** Has the auto-printer already produced the slip for this order? */
export function hasPrinted(orderId: string): boolean {
    const l = liveLedger;
    if (!l) return false;
    return l.has(`order:${orderId}`);
}

export function startCloudPrintPoller(print: typeof printDocument = printDocument): (() => void) | null {
    if (!config.cloudApiBase || !config.cloudKioskKey) {
        console.log('  cloud auto-print     : OFF — set KIOSK_API_BASE + KIOSK_KEY in .env to enable');
        return null;
    }
    const ledger = loadLedger();
    liveLedger = ledger;
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
                const okey = `order:${order.order_id}`;
                const rkey = `receipt:${order.order_id}`;
                const all = (order.tickets ?? []).filter((tk) => !!tk?.code);
                // Orders printed under the older per-ticket scheme keep their
                // codes in the ledger — treat those as already done.
                const ticketsDone = ledger.has(okey)
                    || (all.length > 0 && all.every((tk) => ledger.has(tk.code!)));
                const receiptDone = ledger.has(rkey);
                if (ticketsDone && receiptDone)
                    continue;

                // Any rail that produced an e-barimt joins it onto the ticket.
                // This used to require payment_method === 'qpay', so a CARD sale —
                // the rail this kiosk actually runs — printed its ticket alone here
                // while /ebarimt/receipt printed the fiscal receipt as a SECOND slip.
                // One purchase, one piece of paper, whichever rail issued the barimt.
                // Rail B (routes/ebarimt.ts → local PosAPI) records what it issued.
                // Prefer it: the feed reports ДДТД, date and VAT as null, and a
                // B2B sale's buyer TIN never reaches the cloud at all.
                const issued = findIssued(order.reference, order.order_id);
                const hasReceipt = !!issued || !!order.ebarimt_qr_data;
                // Zone name → unit price, for the ticket's Үнэ row.
                const priceByZone = new Map((order.items ?? []).map((i): [string | undefined, number | undefined] => [i.zone_name_mn, i.unit_price]));

                const buildReceipt = (compact: boolean): PrintSpec => {
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
                    const totalVAT = issued?.totalVAT
                        ?? (order.ebarimt_vat != null
                            ? Number(order.ebarimt_vat)
                            : Math.round(items.reduce((a, i) => a + i.totalVAT, 0) * 100) / 100);
                    return receiptSpec({
                        compact,
                        orderRef: order.reference ?? '',
                        // Legal identity + bill meta, as the standard requires.
                        merchantName: config.ebarimtMerchantName,
                        merchantTin: config.ebarimtMerchantTin,
                        posNo: issued?.posNo || config.ebarimtPosNo,
                        districtCode: config.ebarimtDistrictCode,
                        branchNo: config.ebarimtBranchNo,
                        // Set → the slip prints 'ААН (B2B)' and a Худ.авагч ТТД row.
                        customerTin: issued?.customerTin || order.ebarimt_customer_tin || undefined,
                        id: issued?.id || order.ebarimt_ddtd || order.ebarimt_id || '',
                        date: issued?.date || order.ebarimt_date || order.paid_at || '',
                        items,
                        subtotal,
                        totalVAT,
                        totalCityTax: issued?.totalCityTax
                            ?? (order.ebarimt_city_tax != null
                                ? Number(order.ebarimt_city_tax)
                                : 0),
                        total: order.total ?? subtotal,
                        paymentLabel: order.payment_method === 'qpay' ? 'QPay' : 'Карт',
                        ebarimtQrData: issued?.qrData || order.ebarimt_qr_data,
                        ebarimtLottery: issued?.lottery || order.ebarimt_lottery || '',
                    });
                };

                if (!ticketsDone) {
                    const paidMs = order.paid_at ? Date.parse(order.paid_at) : NaN;
                    const waited = Number.isNaN(paidMs) ? Infinity : Date.now() - paidMs;
                    // Hold the tickets briefly on EVERY rail: a card sale registers
                    // its e-barimt a moment after approval too, and without the wait
                    // the ticket raced ahead and left the receipt to print on its own.
                    if (!hasReceipt && waited < RECEIPT_WAIT_MS)
                        continue;

                    const specs: PrintSpec[] = all.map((tk, idx) => ticketSpec({
                        orderRef: order.reference ?? '',
                        code: tk.code,
                        event: order.event_title ?? '',
                        zone: tk.zone_name_mn ?? '',
                        quantity: 1,
                        seq: all.length > 1 ? `${idx + 1} / ${all.length}` : undefined,
                        price: priceByZone.get(tk.zone_name_mn),
                        startsAt: order.event_start ?? '',
                        purchasedAt: order.paid_at ?? '',
                        venue: config.venueName,
                        qrData: tk.code!,
                        // The receipt below repeats price and purchase time.
                        compact: hasReceipt,
                    }));
                    if (hasReceipt)
                        specs.push(buildReceipt(true));
                    if (specs.length === 0)
                        continue;

                    await print(combineSpecs(`Захиалга ${order.reference ?? ''}`.trim(), specs));
                    ledger.add(okey);
                    for (const tk of all)
                        ledger.add(tk.code!);
                    if (hasReceipt)
                        ledger.add(rkey);
                    saveLedger(ledger);
                    console.log(`[cloudprint] order ${String(order.reference).slice(0, 8)} printed — ${all.length} ticket(s)${hasReceipt ? ' + И-Баримт' : ', receipt pending'}`);
                }
                else if (hasReceipt && !receiptDone) {
                    // Tickets already went out without the receipt — print it
                    // on its own now that the e-barimt has landed.
                    await print(buildReceipt(false));
                    ledger.add(rkey);
                    saveLedger(ledger);
                    console.log(`[cloudprint] receipt printed (order ${String(order.reference).slice(0, 8)})`);
                }
            }
        }
        catch (e) {
            failures += 1;
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
