import { Router } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { terminal } from '../pos/index.js';

export const posRouter = Router();

const ChargeBody = z.object({
  orderRef: z.string().min(1),
  amount: z.number().int().positive(), // MNT
  description: z.string().optional(),
});

/**
 * POST /pos/charge — take a card payment on the on-box POS terminal.
 * Idempotent on orderRef so a retry never double-charges.
 *
 * The actual terminal is chosen by POS_DRIVER (mock | golomt); this route only
 * knows the PaymentTerminal interface, so swapping drivers changes nothing here.
 */
posRouter.post('/charge', async (req, res) => {
  const parsed = ChargeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
  }
  const { orderRef, amount, description } = parsed.data;
  try {
    const result = await once(`pos:${orderRef}`, () =>
      terminal.startSale({ orderRef, amount, description }),
    );
    // Keep the legacy `approved` boolean the Flutter client reads, alongside the
    // richer status/rrn/authCode fields.
    const body = { ...result, approved: result.status === 'approved' };
    // A clean decline is still a successful request — surface it as 402.
    if (!body.approved) {
      return res.status(402).json(body);
    }
    res.json(body);
  } catch (e) {
    res.status(502).json({ error: 'pos_unreachable', detail: String(e) });
  }
});
