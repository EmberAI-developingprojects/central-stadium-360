import { Router } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { issueReceipt } from '../ebarimt/posapi.js';
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
