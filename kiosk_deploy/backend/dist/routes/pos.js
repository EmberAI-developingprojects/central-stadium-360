import { Router } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { terminal } from '../pos/index.js';
import { config } from '../config.js';
export const posRouter = Router();
const ChargeBody = z.object({
    orderRef: z.string().min(1),
    amount: z.number().int().positive(),
    description: z.string().optional(),
});
posRouter.post('/charge', async (req, res) => {
    const parsed = ChargeBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    }
    const { orderRef, amount, description } = parsed.data;
    try {
        const result = await once(`pos:${orderRef}`, () => terminal.startSale({ orderRef, amount, description }));
        const body = { ...result, approved: result.status === 'approved' };
        if (!body.approved) {
            return res.status(402).json(body);
        }
        res.json(body);
    }
    catch (e) {
        res.status(502).json({ error: 'pos_unreachable', detail: String(e) });
    }
});
posRouter.get('/status', async (_req, res) => {
    const info = {
        driver: config.posDriver,
        serviceUrl: config.posServiceUrl,
        terminalId: process.env.POS_TERMINAL_ID ?? '',
        merchantId: process.env.POS_MERCHANT_ID ?? '',
        debug: config.posDebug,
        checks: {},
    };
    if (config.posDriver === 'mock') {
        info.checks.reachable = 'skipped (mock)';
        return res.json(info);
    }
    try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 3000);
        const r = await fetch(config.posServiceUrl, { method: 'GET', signal: ctl.signal });
        clearTimeout(t);
        info.checks.reachable = true;
        info.checks.httpStatus = r.status;
    }
    catch (e) {
        info.checks.reachable = false;
        info.checks.error = String(e).slice(0, 200);
        info.checks.hint = 'Is PobRestService running? Check `sc query PobRestService`';
    }
    if (!info.terminalId)
        info.checks.terminalId = 'MISSING — set POS_TERMINAL_ID in .env';
    if (!info.merchantId)
        info.checks.merchantId = 'MISSING — set POS_MERCHANT_ID in .env';
    res.json(info);
});
posRouter.post('/probe', async (req, res) => {
    if (!config.posDebug) {
        return res.status(403).json({
            error: 'probe_disabled',
            hint: 'Set POS_DEBUG=on in .env to enable this endpoint.',
        });
    }
    if (config.posDriver === 'mock') {
        return res.status(400).json({
            error: 'mock_driver',
            hint: 'Probe hits the real POS service; set POS_DRIVER=golomt first.',
        });
    }
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const base = config.posServiceUrl.endsWith('/')
        ? config.posServiceUrl
        : config.posServiceUrl + '/';
    const url = new URL('message', base);
    url.searchParams.set('data', Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64'));
    try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 30000);
        const r = await fetch(url.toString(), { method: 'GET', signal: ctl.signal });
        clearTimeout(t);
        const text = await r.text();
        res.json({ httpStatus: r.status, requestUrl: url.toString(), requestPayload: payload, responseBody: text });
    }
    catch (e) {
        res.status(502).json({ error: 'pos_unreachable', detail: String(e) });
    }
});
//# sourceMappingURL=pos.js.map
