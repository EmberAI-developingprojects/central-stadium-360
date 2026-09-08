import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { printDocument } from '../print/winprint.js';
import { ticketSpec, receiptSpec } from '../print/layout.js';

export const printRouter: Router = Router();

/** Result of a completed (or idempotently replayed) print job. */
interface PrintResult {
    printed: true;
    kind: 'ticket' | 'receipt';
    orderRef: string;
}

/**
 * Printing runs through the bridge because the POS80 thermal printer is a local
 * device on the kiosk box — the browser can't reach it. Both rails print the
 * entry ticket here; the И-Баримт receipt prints here too (POSAPI 3.0 itself is
 * headless — it issues fiscal data but does not print).
 *
 * Idempotent on orderRef so a double-tap / retry never prints twice.
 */
const TicketBody = z.object({
    orderRef: z.string().min(1),
    event: z.string(),
    zone: z.string(),
    quantity: z.number().int().positive(),
    startsAt: z.string(),
    venue: z.string(),
    qrData: z.string(), // entry-validation QR from the cloud (tickets.ts)
});

printRouter.post('/ticket', async (req: Request, res: Response) => {
    const parsed = TicketBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    }
    const { orderRef } = parsed.data;
    try {
        const result = await once<PrintResult>(`print:ticket:${orderRef}`, async () => {
            await printDocument(ticketSpec(parsed.data));
            return { printed: true, kind: 'ticket', orderRef };
        });
        res.json(result);
    }
    catch (e) {
        res.status(502).json({ error: 'printer_unreachable', detail: String(e) });
    }
});

const ReceiptLine = z.object({
    name: z.string(),
    qty: z.number().int().positive(),
    unitPrice: z.number().int().nonnegative(),
});

const ReceiptBody = z.object({
    orderRef: z.string().min(1),
    lines: z.array(ReceiptLine).min(1),
    total: z.number().int().nonnegative(),
    // E-Barimt issued by QPay (Rail A) or the local POSAPI (Rail B) — we print it.
    ebarimtQrData: z.string(),
    ebarimtLottery: z.string(),
});

printRouter.post('/receipt', async (req: Request, res: Response) => {
    const parsed = ReceiptBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    }
    const { orderRef, lines, total, ebarimtQrData, ebarimtLottery } = parsed.data;
    try {
        const result = await once<PrintResult>(`print:receipt:${orderRef}`, async () => {
            await printDocument(receiptSpec({ orderRef, lines, total, ebarimtQrData, ebarimtLottery }));
            return { printed: true, kind: 'receipt', orderRef };
        });
        res.json(result);
    }
    catch (e) {
        res.status(502).json({ error: 'printer_unreachable', detail: String(e) });
    }
});
