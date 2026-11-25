import 'dotenv/config'; // load .env BEFORE config.ts reads process.env
import express from 'express';
import { config } from './config.js';
import { corsPna } from './middleware/corsPna.js';
import { posRouter } from './routes/pos.js';
import { ebarimtRouter } from './routes/ebarimt.js';
import { printRouter } from './routes/print.js';
import { emailRouter } from './routes/email.js';

const app = express();
app.use(express.json());
app.use(corsPna);

// Liveness probe for the autostart watchdog.
app.get('/health', (_req, res) => res.json({ ok: true, service: 'kiosk-bridge' }));

app.use('/pos', posRouter);
app.use('/ebarimt', ebarimtRouter);
app.use('/print', printRouter);
app.use('/email', emailRouter);

// Bind to loopback only — the bridge must never be reachable off the box.
app.listen(config.port, '127.0.0.1', () => {
  console.log(`kiosk-bridge listening on http://127.0.0.1:${config.port}`);
  console.log(`  allowed kiosk origin : ${config.kioskOrigin}`);
  console.log(`  E-Barimt POSAPI      : ${config.ebarimtPosApiUrl}`);
  console.log(`  POS terminal service : ${config.posServiceUrl}`);
  console.log(`  email (Resend)       : ${config.resendApiKey ? 'configured' : 'SIMULATED (no key)'}`);
});
