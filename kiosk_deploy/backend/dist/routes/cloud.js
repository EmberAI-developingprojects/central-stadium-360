import { Router } from 'express';
import { config } from '../config.js';
export const cloudRouter = Router();
async function callCloud(res, call) {
    if (!config.cloudApiBase || !config.cloudKioskKey) {
        res.status(503).json({
            error: 'cloud_not_configured',
            hint: 'Set KIOSK_API_BASE and KIOSK_KEY in backend/.env.',
        });
        return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20000);
    try {
        const r = await fetch(`${config.cloudApiBase}${call.path}`, {
            method: call.method,
            headers: {
                'X-Kiosk-Key': config.cloudKioskKey,
                'X-Kiosk-Id': config.cloudKioskId,
                ...(call.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(call.method === 'POST' ? { body: JSON.stringify(call.body) } : {}),
            signal: ctl.signal,
        });
        const text = await r.text();
        res.status(r.status).type('application/json').send(text || '{}');
    }
    catch (e) {
        res.status(502).json({ error: 'cloud_unreachable', detail: String(e).slice(0, 300) });
    }
    finally {
        clearTimeout(t);
    }
}
cloudRouter.get('/events', (_req, res) => {
    void callCloud(res, { method: 'GET', path: '/api/kiosk/events' });
});
cloudRouter.post('/orders', (req, res) => {
    const body = (req.body ?? {});
    void callCloud(res, {
        method: 'POST',
        path: '/api/kiosk/orders',
        // The box knows which kiosk it is; the page should not have to.
        body: { ...body, kiosk_id: config.cloudKioskId },
    });
});
cloudRouter.get('/orders/:id/status', (req, res) => {
    void callCloud(res, {
        method: 'GET',
        path: `/api/kiosk/orders/${encodeURIComponent(req.params.id)}/status`,
    });
});
cloudRouter.post('/orders/:id/card-result', (req, res) => {
    void callCloud(res, {
        method: 'POST',
        path: `/api/kiosk/orders/${encodeURIComponent(req.params.id)}/card-result`,
        body: req.body ?? {},
    });
});
//# sourceMappingURL=cloud.js.map