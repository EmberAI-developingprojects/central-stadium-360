import { Router } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { issueReceipt } from '../ebarimt/posapi.js';

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
 * POST /ebarimt/receipt — issue a fiscal receipt via the on-box E-Barimt
 * POSAPI 3.0 (returns the bill id + QR + lottery). The card rail uses this
 * after charging the terminal. Idempotent on orderRef so a retry never
 * double-issues a fiscal receipt.
 *
 * Note: POSAPI does NOT print — the caller prints via /print/receipt (POS80).
 */
ebarimtRouter.post('/receipt', async (req, res) => {
  const parsed = ReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
  }
  const { orderRef, items, customerTin, paymentCode } = parsed.data;
  try {
    const receipt = await once(`ebarimt:${orderRef}`, () =>
      issueReceipt({
        items: items.map((it) => ({ name: it.name, qty: it.qty, unitPrice: it.unitPrice })),
        customerTin,
        paymentCode,
      }),
    );
    res.json({
      orderRef,
      id: receipt.id,
      qrData: receipt.qrData,
      lottery: receipt.lottery,
      total: receipt.totalAmount,
      vat: receipt.totalVAT,
    });
  } catch (e) {
    res.status(502).json({ error: 'posapi_unreachable', detail: String(e) });
  }
});
