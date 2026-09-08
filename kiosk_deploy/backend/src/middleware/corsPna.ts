import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function corsPna(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;
    if (origin && origin === config.kioskOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
    if (req.headers['access-control-request-private-network'] === 'true') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
}
