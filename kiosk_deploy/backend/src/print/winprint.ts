import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { config } from '../config.js';
import type { PrintBlock, PrintSpec } from './layout.js';

/** What print_doc.ps1 actually reads: qr blocks resolved to PNG files on disk. */
type ScriptBlock =
  | Exclude<PrintBlock, { type: 'qr' }>
  | { type: 'qr'; path: string; sizeMm: number };

/**
 * Prints a receipt/ticket on the on-box POS80 thermal printer (Windows).
 *
 * We render with GDI+ in a PowerShell helper (print_doc.ps1) rather than raw
 * ESC/POS because Mongolian Cyrillic — Ө/Ү in particular — has no single-byte
 * codepage the printer could render. The helper rasterises the layout (Unicode
 * text + QR PNGs) and sends it to the named printer via the Windows spooler, so
 * there are no native Node deps (none would build here without Visual Studio).
 */
// scripts/print_doc.ps1 sits next to the compiled output's ../scripts at runtime;
// resolve relative to this module so it works from both src (tsx) and dist.
const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, '..', '..', 'scripts', 'print_doc.ps1');

/**
 * Render [spec] and print it (or, when [outFile] is set, save a PNG preview
 * instead of printing — used for testing the layout without a printer).
 */
export async function printDocument(spec: PrintSpec, outFile?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'kiosk-print-'));
  try {
    // Turn each {type:'qr', data} into a PNG on disk and a {path} the script reads.
    const blocks: ScriptBlock[] = [];
    let qrIndex = 0;
    for (const b of spec.blocks) {
      if (b.type === 'qr') {
        const path = join(dir, `qr-${qrIndex++}.png`);
        await QRCode.toFile(path, b.data, { margin: 1, width: 600, errorCorrectionLevel: 'M' });
        blocks.push({ type: 'qr', path, sizeMm: b.sizeMm ?? 36 });
      } else {
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
      // Native ESC/POS raster by default — the POS80 driver kept rescaling GDI
      // pages (shrunken/oversized tickets). PRINT_MODE=gdi restores the old path.
      '-Mode',
      process.env.PRINT_MODE ?? 'raw',
    ];
    const out = await runPowershell(args);
    // Surface the script's PAGE/PRINTED lines on the bridge console — they show
    // the page size the driver ACTUALLY granted, which is the whole diagnosis
    // when a thermal driver clips or splits a ticket.
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (
        t.startsWith('PAGE') ||
        t.startsWith('PAPER') ||
        t.startsWith('RAW') ||
        t.startsWith('PRINTED')
      ) {
        console.log('[print]', t);
      }
    }
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runPowershell(args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const ps = spawn('powershell.exe', args, { windowsHide: true });
    let out = '';
    let err = '';
    ps.stdout.on('data', (d: Buffer) => (out += d.toString()));
    ps.stderr.on('data', (d: Buffer) => (err += d.toString()));
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`print_doc.ps1 exited ${code}: ${(err || out).trim().slice(0, 400)}`));
    });
  });
}
