import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { config } from '../config.js';
const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, '..', '..', 'scripts', 'print_doc.ps1');
export async function printDocument(spec, outFile) {
    const dir = await mkdtemp(join(tmpdir(), 'kiosk-print-'));
    try {
        // Turn each {type:'qr', data} into a PNG on disk and a {path} the script reads.
        const blocks = [];
        let qrIndex = 0;
        for (const b of spec.blocks) {
            if (b.type === 'qr') {
                const path = join(dir, `qr-${qrIndex++}.png`);
                await QRCode.toFile(path, b.data, { margin: 1, width: 600, errorCorrectionLevel: 'M' });
                blocks.push({ type: 'qr', path, sizeMm: b.sizeMm ?? 36 });
            }
            else {
                blocks.push(b);
            }
        }
        const specPath = join(dir, 'spec.json');
        await writeFile(specPath, JSON.stringify({ widthMm: config.printWidthMm, title: spec.title, blocks }, null, 0), 'utf8');
        const args = [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            SCRIPT,
            '-SpecPath',
            specPath,
            ...(outFile ? ['-OutFile', outFile] : ['-PrinterName', config.printerName]),
            '-Mode',
            process.env.PRINT_MODE ?? 'raw',
        ];
        const out = await runPowershell(args);
        for (const line of out.split('\n')) {
            const t = line.trim();
            if (t.startsWith('PAGE') ||
                t.startsWith('PAPER') ||
                t.startsWith('RAW') ||
                t.startsWith('PRINTED')) {
                console.log('[print]', t);
            }
        }
        return out;
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
}
function runPowershell(args) {
    return new Promise((resolve, reject) => {
        const ps = spawn('powershell.exe', args, { windowsHide: true });
        let out = '';
        let err = '';
        ps.stdout.on('data', (d) => (out += d.toString()));
        ps.stderr.on('data', (d) => (err += d.toString()));
        ps.on('error', reject);
        ps.on('close', (code) => {
            if (code === 0)
                resolve(out.trim());
            else
                reject(new Error(`print_doc.ps1 exited ${code}: ${(err || out).trim().slice(0, 400)}`));
        });
    });
}
//# sourceMappingURL=winprint.js.map