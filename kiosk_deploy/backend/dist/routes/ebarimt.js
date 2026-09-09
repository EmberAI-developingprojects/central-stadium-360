import { Router } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { issueReceipt } from '../ebarimt/posapi.js';
import { recordIssued } from '../ebarimt/issued.js';
import { printDocument } from '../print/winprint.js';
import { receiptSpec } from '../print/layout.js';
import { config } from '../config.js';
export const ebarimtRouter = Router();
const ReceiptItem = z.object({
    name: z.string(),
    qty: z.number().int().positive(),
    unitPrice: z.number().int().nonnegative(),
});
const ReceiptBody = z.object({
    orderRef: z.string().min(1),
    items: z.array(ReceiptItem).min(1),
    type: z.string().default('B2C_RECEIPT'),
    customerTin: z.string().optional(),
    paymentCode: z.string().optional(),
});
/**
 * GET /ebarimt/org?regno=1234567 — who is this register number?
 *
 * A B2B buyer types their organisation's *register* number, but the receipt
 * needs its ТТД, and the buyer needs to see a name before they accept. ТЕГ's
 * public directory answers both, in two hops:
 *
 *   getTinInfo?regNo=2027496   -> 43900438296
 *   getInfo?tin=43900438296    -> { name: "Төвцэнгэлдэх хүрээлэн", ... }
 *
 * It runs here rather than in the browser because api.ebarimt.mn sends no CORS
 * headers. Note this is the *public* directory, not the on-box PosAPI — it
 * works even while PosAPI activation is still blocked.
 */
const EBARIMT_DIRECTORY = 'https://api.ebarimt.mn/api/info/check';
async function directoryGet(path) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
        const r = await fetch(`${EBARIMT_DIRECTORY}/${path}`, { signal: ctl.signal });
        if (!r.ok)
            return null;
        return await r.json();
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(t);
    }
}
ebarimtRouter.get('/org', async (req, res) => {
    const regno = String(req.query.regno ?? '').trim();
    if (!/^\d{7}$/.test(regno)) {
        return res.status(400).json({ error: 'invalid_regno', hint: 'Register number is 7 digits.' });
    }
    const tinRes = await directoryGet(`getTinInfo?regNo=${encodeURIComponent(regno)}`);
    const tin = tinRes && tinRes.status === 200 && tinRes.data ? String(tinRes.data) : '';
    if (!tin) {
        return res.json({ found: false, regno, tin: '', name: '' });
    }
    const infoRes = await directoryGet(`getInfo?tin=${encodeURIComponent(tin)}`);
    const info = infoRes && infoRes.status === 200 ? infoRes.data : null;
    // A TIN with no directory entry is still a usable TIN; the buyer just
    // cannot confirm a name, so say so rather than pretending it failed.
    res.json({
        found: true,
        regno,
        tin,
        name: (info && info.name) ? String(info.name) : '',
        vatPayer: info ? info.vatPayer === true : null,
    });
});
const AUTOPRINT_EBARIMT = (process.env.PRINT_EBARIMT ?? 'on').toLowerCase() !== 'off';
ebarimtRouter.post('/receipt', async (req, res) => {
    const parsed = ReceiptBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    }
    const { orderRef, items, customerTin, paymentCode } = parsed.data;
    try {
        const receipt = await once(`ebarimt:${orderRef}`, () => issueReceipt({
            items: items.map((it) => ({ name: it.name, qty: it.qty, unitPrice: it.unitPrice })),
            customerTin,
            paymentCode,
        }));
        // Hand the printer what PosAPI actually issued. The cloud's print-jobs
        // feed reports ДДТД, date and VAT as null, so cloudprint.ts would
        // otherwise print a barimt with no fiscal id and no buyer company —
        // and would sit out RECEIPT_WAIT_MS waiting for data it already has.
        recordIssued({
            orderRef,
            id: receipt.id,
            qrData: receipt.qrData,
            lottery: receipt.lottery,
            date: receipt.date,
            totalVAT: receipt.totalVAT,
            totalCityTax: 0,
            customerTin,
            posNo: receipt.posNo,
        });
        let printed = null;
        let printError = null;
        if (AUTOPRINT_EBARIMT) {
            try {
                await once(`print:receipt:${orderRef}`, async () => {
                    await printDocument(receiptSpec({
                        orderRef,
                        id: receipt.id,
                        date: receipt.date,
                        merchantName: receipt.merchantName,
                        merchantTin: receipt.merchantTin,
                        posNo: receipt.posNo,
                        districtCode: receipt.districtCode,
                        branchNo: receipt.branchNo,
                        customerTin,
                        items: receipt.items,
                        subtotal: receipt.totalAmount,
                        totalVAT: receipt.totalVAT,
                        total: receipt.totalAmount,
                        paymentLabel: paymentCode === 'PAYMENT_CASH'
                            ? 'Бэлэн'
                            : paymentCode === 'PAYMENT_QPAY'
                                ? 'QPay'
                                : 'Карт',
                        ebarimtQrData: receipt.qrData,
                        ebarimtLottery: receipt.lottery,
                    }));
                    return true;
                });
                printed = true;
            }
            catch (e) {
                printed = false;
                printError = String(e).slice(0, 300);
                console.error(`[ebarimt] print failed for ${orderRef}:`, printError);
            }
        }
        res.json({
            orderRef,
            id: receipt.id,
            qrData: receipt.qrData,
            lottery: receipt.lottery,
            total: receipt.totalAmount,
            vat: receipt.totalVAT,
            printer: config.printerName,
            printed,
            printError,
        });
    }
    catch (e) {
        // Fail-open: never block the payment flow on e-barimt. The Flutter UI
        // calls this BETWEEN card approval and orders/:id/card-result, and
        // throws on any non-200 — so a 502 here made an APPROVED card sale
        // render as "Төлбөр амжилтгүй" while PosAPI sat unactivated (HTTP 503,
        // field-observed 2026-09-02). Return an empty receipt instead; the
        // fiscal receipt can be issued once PosAPI is activated.
        console.error(`[ebarimt] issue failed for ${orderRef}:`, String(e).slice(0, 300));
        res.json({
            orderRef,
            id: null,
            qrData: '',
            lottery: '',
            total: 0,
            vat: 0,
            printer: config.printerName,
            printed: false,
            printError: null,
            error: 'posapi_unreachable',
            detail: String(e).slice(0, 300),
        });
    }
});
//# sourceMappingURL=ebarimt.js.map