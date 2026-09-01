import 'dotenv/config';
import express from 'express';
import { config } from './config.js';
import { corsPna } from './middleware/corsPna.js';
import { posRouter } from './routes/pos.js';
import { ebarimtRouter } from './routes/ebarimt.js';
import { printRouter } from './routes/print.js';
import { emailRouter } from './routes/email.js';
import { startCloudPrintPoller } from './cloudprint.js';
const app = express();
app.use(express.json());
app.use(corsPna);
app.get('/health', (_req, res) => res.json({ ok: true, service: 'kiosk-bridge' }));
app.use('/pos', posRouter);
app.use('/ebarimt', ebarimtRouter);
app.use('/print', printRouter);
app.use('/email', emailRouter);
async function preflight() {
    const rows = [];
    if (config.posDriver === 'mock') {
        rows.push(['POS terminal', 'mock', '(simulated approvals, no real charges)']);
    }
    else {
        try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 2500);
            const r = await fetch(config.posServiceUrl, { signal: ctl.signal });
            clearTimeout(t);
            rows.push(['POS terminal', 'READY', `${config.posDriver} → ${config.posServiceUrl} (HTTP ${r.status})`]);
        }
        catch (e) {
            rows.push(['POS terminal', 'DOWN', `${config.posDriver} → ${config.posServiceUrl} unreachable — install PobRestService / start service`]);
        }
    }
    try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 2500);
        const r = await fetch(`${config.ebarimtPosApiUrl.replace(/\/$/, '')}/rest/info`, { signal: ctl.signal });
        clearTimeout(t);
        if (r.ok) {
            const j = await r.json().catch(() => ({}));
            const m = Array.isArray(j?.merchants) && j.merchants[0]?.tin;
            rows.push(['E-Barimt POSAPI', m ? 'READY' : 'NO MERCHANT', `${config.ebarimtPosApiUrl} — ${m ? `merchant TIN ${m}` : 'no company synced (restart PosAPI)'}`]);
        }
        else {
            rows.push(['E-Barimt POSAPI', 'HTTP ' + r.status, config.ebarimtPosApiUrl]);
        }
    }
    catch (e) {
        rows.push(['E-Barimt POSAPI', 'DOWN', `${config.ebarimtPosApiUrl} unreachable — install E-Barimt PosAPI 3.0`]);
    }
    if (process.platform === 'win32') {
        try {
            const { spawn } = await import('node:child_process');
            const p = spawn('powershell.exe', [
                '-NoProfile', '-Command',
                `Get-Printer -Name "${config.printerName}" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name`,
            ], { windowsHide: true });
            let out = '';
            p.stdout.on('data', (d) => out += d.toString());
            const code = await new Promise((r) => p.on('close', r));
            if (code === 0 && out.trim().includes(config.printerName)) {
                rows.push(['Printer (POS80)', 'READY', config.printerName]);
            }
            else {
                rows.push(['Printer (POS80)', 'MISSING', `no printer named "${config.printerName}"`]);
            }
        }
        catch {
            rows.push(['Printer (POS80)', 'UNCHECKED', config.printerName]);
        }
    }
    else {
        rows.push(['Printer (POS80)', 'SKIPPED', `not Windows (host: ${process.platform})`]);
    }
    rows.push(['Email (Resend)', config.resendApiKey ? 'READY' : 'SIMULATED', config.resendApiKey ? 'RESEND_API_KEY set' : 'no key — /email/ticket returns simulated=true']);
    const w1 = Math.max(...rows.map(r => r[0].length));
    const w2 = Math.max(...rows.map(r => r[1].length));
    console.log('\n  ── Preflight ' + '─'.repeat(60));
    for (const [k, s, v] of rows) {
        const badge = s === 'READY' ? '✓' : s === 'DOWN' || s === 'MISSING' ? '✗' : '·';
        console.log(`  ${badge} ${k.padEnd(w1)}  ${s.padEnd(w2)}  ${v}`);
    }
    console.log('  ' + '─'.repeat(72) + '\n');
}
const srv = app.listen(config.port, '127.0.0.1', () => {
    console.log(`kiosk-bridge listening on http://127.0.0.1:${config.port}`);
    console.log(`  allowed kiosk origin : ${config.kioskOrigin}`);
    console.log(`  E-Barimt POSAPI      : ${config.ebarimtPosApiUrl}`);
    console.log(`  POS terminal service : ${config.posServiceUrl}`);
    console.log(`  email (Resend)       : ${config.resendApiKey ? 'configured' : 'SIMULATED (no key)'}`);
    startCloudPrintPoller();
    preflight().catch((e) => console.error('[preflight] internal error:', e));
});
srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\nPort ${config.port} is already in use — a bridge is probably`);
        console.error('already running. Close its window (or reboot) and re-run Start Kiosk.bat.');
    }
    else if (err.code === 'EACCES') {
        console.error(`\nWindows refused to bind port ${config.port} (EACCES).`);
        console.error('Run in admin PowerShell:  netsh interface ipv4 show excludedportrange protocol=tcp');
        console.error(`and pick a PORT in backend\\.env outside every listed range (ports below 1025 are never reserved).`);
    }
    else {
        console.error('kiosk-bridge failed to start:', err);
    }
    process.exit(1);
});
//# sourceMappingURL=server.js.map
