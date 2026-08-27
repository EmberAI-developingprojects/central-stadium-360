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
    unitPrice: z.number().int().nonnegative(), // MNT, VAT-inclusive
});
const ReceiptBody = z.object({
    orderRef: z.string().min(1),
    items: z.array(ReceiptItem).min(1),
    // 'B2C_RECEIPT' | 'B2B_INVOICE' — derived from customerTin below.
    type: z.string().default('B2C_RECEIPT'),
    customerTin: z.string().optional(), // for B2B
    // POSAPI payment code; defaults to PAYMENT_CARD (the card rail).
    paymentCode: z.string().optional(),
});
/**
 * Should the bridge print the И-Баримт to the POS80 automatically after POSAPI
 * issues it? Default ON so the operator gets a paper receipt out-of-the-box
 * without the Flutter client having to be updated to call /print/receipt
 * explicitly. Turn OFF via PRINT_EBARIMT=off when the client owns printing.
 */
const AUTOPRINT_EBARIMT = (process.env.PRINT_EBARIMT ?? 'on').toLowerCase() !== 'off';
/**
 * POST /ebarimt/receipt — issue a fiscal receipt via the on-box E-Barimt
 * POSAPI 3.0 (returns the bill id + QR + lottery). The card rail uses this
 * after charging the terminal. Idempotent on orderRef so a retry never
 * double-issues a fiscal receipt.
 *
 * When PRINT_EBARIMT is on (default), the bridge also fires the POS80 print
 * job — the fiscal issue is authoritative, so a printer failure is logged and
 * surfaced as `printed:false` but does NOT undo the receipt.
 */
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
                        // Legal identity — printed exactly as POSAPI stamped it.
                        id: receipt.id,
                        date: receipt.date,
                        merchantName: receipt.merchantName,
                        merchantTin: receipt.merchantTin,
                        posNo: receipt.posNo,
                        districtCode: receipt.districtCode,
                        branchNo: receipt.branchNo,
                        customerTin,
                        // Signed lines (already VAT-decomposed by POSAPI).
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
                // The receipt is already fiscally recorded — do not fail the response.
                // Print failure is logged so the operator can retry via /print/receipt
                // (idempotent by orderRef; the `once` cache above kept the successful
                // outcome, so this path only fires on a genuine print failure).
                printed = false;
                printError = String(e).slice(0, 300);
                console.error(`[ebarimt] print failed for ${orderRef} (receipt already issued):`, printError);
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
        res.status(502).json({ error: 'posapi_unreachable', detail: String(e) });
    }
});
//# sourceMappingURL=ebarimt.js.map
