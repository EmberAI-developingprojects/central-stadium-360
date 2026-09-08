import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.js';

export const cloudRouter: Router = Router();

/**
 * Thin proxy onto the cloud kiosk API.
 *
 * The kiosk UI is a page in a browser, so anything it calls directly must ship
 * its credentials to that browser — which is how KIOSK_KEY ended up baked into
 * the old Flutter bundle. Routing the same calls through the bridge keeps the
 * key in backend/.env on the box, where it can be rotated without rebuilding
 * the UI, and gives the UI one origin to talk to.
 *
 * Only the four endpoints the buying flow needs are reachable; the path is
 * never taken from the request, so a page bug can't turn this into an open
 * relay for the rest of the admin API.
 */
type CloudCall =
    | { method: 'GET'; path: string }
    | { method: 'POST'; path: string; body: unknown };

async function callCloud(res: Response, call: CloudCall): Promise<void> {
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

cloudRouter.get('/events', (_req: Request, res: Response) => {
    void callCloud(res, { method: 'GET', path: '/api/kiosk/events' });
});

cloudRouter.post('/orders', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    void callCloud(res, {
        method: 'POST',
        path: '/api/kiosk/orders',
        // The box knows which kiosk it is; the page should not have to.
        body: { ...body, kiosk_id: config.cloudKioskId },
    });
});

cloudRouter.get('/orders/:id/status', (req: Request, res: Response) => {
    void callCloud(res, {
        method: 'GET',
        path: `/api/kiosk/orders/${encodeURIComponent(req.params.id)}/status`,
    });
});

cloudRouter.post('/orders/:id/card-result', (req: Request, res: Response) => {
    void callCloud(res, {
        method: 'POST',
        path: `/api/kiosk/orders/${encodeURIComponent(req.params.id)}/card-result`,
        body: req.body ?? {},
    });
});
