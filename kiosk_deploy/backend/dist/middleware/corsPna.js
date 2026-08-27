import { config } from '../config.js';
/**
 * CORS + Private Network Access for the kiosk.
 *
 * The kiosk UI is served over HTTPS from the public internet but calls this
 * bridge on `http://localhost`. Browsers treat that as a "private network"
 * request and send a CORS **and** a PNA preflight. We must echo the allowed
 * origin and answer the PNA header, or the browser blocks the call.
 */
export function corsPna(req, res, next) {
    const origin = req.headers.origin;
    if (origin && origin === config.kioskOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
    // Private Network Access preflight (Chrome/Edge send this for localhost).
    if (req.headers['access-control-request-private-network'] === 'true') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
}
//# sourceMappingURL=corsPna.js.map