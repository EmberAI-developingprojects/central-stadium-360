import { Router } from 'express';
import { z } from 'zod';
import { once } from '../lib/idempotency.js';
import { terminal } from '../pos/index.js';
import { config } from '../config.js';
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
        const result = await once(`pos:${orderRef}`, () => terminal.startSale({ orderRef, amount, description }));
        // Keep the legacy `approved` boolean the Flutter client reads, alongside the
        // richer status/rrn/authCode fields.
        const body = { ...result, approved: result.status === 'approved' };
        // A clean decline is still a successful request — surface it as 402.
        if (!body.approved) {
            return res.status(402).json(body);
        }
        res.json(body);
    }
    catch (e) {
        res.status(502).json({ error: 'pos_unreachable', detail: String(e) });
    }
});
/**
 * GET /pos/status — pre-flight check for the operator setting up a new box.
 * Reports which driver is active, whether the underlying PobRestService is
 * reachable, and which env vars are still empty. Safe to hit repeatedly.
 */
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
    // Ping the service base URL; a WCF WebHttp endpoint that is up will return
    // some HTTP status (often 400/415 for GET without data) — anything that is
    // not a connection error means the service is listening.
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
        info.checks.hint = 'Is PobRestService running? Check `sc query PobRestService` and http://localhost:8500/requestToPos/';
    }
    if (!info.terminalId)
        info.checks.terminalId = 'MISSING — set POS_TERMINAL_ID in .env';
    if (!info.merchantId)
        info.checks.merchantId = 'MISSING — set POS_MERCHANT_ID in .env';
    res.json(info);
});
/**
 * POST /pos/probe — send an arbitrary payload to PobRestService and return the
 * raw response. This is the tool for figuring out OperationCode values and any
 * envelope quirks before wiring the real /charge path. Guarded behind
 * POS_DEBUG=on so it never runs on a locked-down production box.
 */
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
