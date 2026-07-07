#!/usr/bin/env node
// Golomt IPPOS smoke test — drives the on-box GLMTPOS REST service directly.
//
//   node scripts/golomt-smoke.mjs            # SAFE: connectivity only, no terminal
//   node scripts/golomt-smoke.mjs --charge 10  # REAL sale — terminal prompts for a card
//
// The safe default sends a valid base64(JSON) request pinned to a NONEXISTENT
// port (COM255): it reaches Pos(), which fails at device-connect and returns its
// error envelope {responseCode:"91",...} — proving the full HTTP + JSON + base64
// round trip (request AND response) WITHOUT engaging the real terminal on COM9.
// --charge builds a real sale on the configured port and the terminal asks for a card.
//
// Env (or bridge .env): GOLOMT_POS_URL, GOLOMT_TERMINAL_ID, GOLOMT_CURRENCY_CODE,
// GOLOMT_POS_PORT, GOLOMT_POS_BAUD, GOLOMT_OP_SALE.

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const base = (process.env.GOLOMT_POS_URL ?? 'http://localhost:8500/requestToPos').replace(/\/$/, '');
const chargeAmt = flag('--charge');

const b64 = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');

// Unwrap the WCF {"PosResult":"<json string>"} envelope → ResponseMaker.
function unwrap(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return undefined; }
  if (typeof obj?.PosResult === 'string') { try { return JSON.parse(obj.PosResult); } catch { return undefined; } }
  if (obj?.PosResult && typeof obj.PosResult === 'object') return obj.PosResult;
  return obj;
}

async function call(data, label) {
  const url = `${base}/message?data=${encodeURIComponent(data)}`;
  const t0 = Date.now();
  const res = await fetch(url);
  const text = await res.text();
  console.log(`\n[${label}] HTTP ${res.status} in ${Date.now() - t0}ms`);
  const m = unwrap(text);
  if (!m) { console.log('  RAW (unparsed):', text.slice(0, 400)); return; }
  console.log('  responseCode:', m.responseCode, '| responseDesc:', m.responseDesc);
  if (m.data) {
    try { console.log('  decoded data:', Buffer.from(m.data, 'base64').toString('utf8').slice(0, 800)); }
    catch { console.log('  data (not base64):', String(m.data).slice(0, 200)); }
  }
}

(async () => {
  console.log('GLMTPOS smoke test →', base);
  try {
    const probe = { requestID: 'smoke-probe', terminalID: '13133707', currencyCode: '496',
      operationCode: process.env.GOLOMT_OP_SALE || '1', amount: '10', portNo: '255',
      bandwidth: '115200', timeout: '4000', cMode: '0', cMode2: '0', cardEntryMode: '0' };
    await call(b64(probe), 'connectivity (safe — pinned to absent COM255)');
  } catch (e) {
    console.error(`\nService unreachable at ${base}\n  ${e.message}`);
    console.error('  Is the "Golomt POS" service running? Register it with:');
    console.error('  scripts\\install_golomt_service.ps1  (elevated)');
    process.exit(2);
  }

  if (!chargeAmt) {
    console.log('\nConnectivity OK. To drive a REAL sale (terminal will prompt for a card):');
    console.log('  node scripts/golomt-smoke.mjs --charge 10');
    return;
  }

  const req = {
    requestID: 'smoke-' + Date.now(),
    terminalID: process.env.GOLOMT_TERMINAL_ID || '',
    currencyCode: process.env.GOLOMT_CURRENCY_CODE || '496',
    operationCode: process.env.GOLOMT_OP_SALE || '1',
    amount: String(chargeAmt),
    timeout: '120000',
    // Present-but-empty selects the terminal's default (card-accepting) mode;
    // "0" makes the terminal cancel immediately. Numeric port for SetChannelTerminalParam.
    cMode: process.env.GOLOMT_CMODE ?? '',
    cMode2: process.env.GOLOMT_CMODE2 ?? '',
    cardEntryMode: process.env.GOLOMT_CARD_ENTRY_MODE ?? '',
  };
  const portNum = (process.env.GOLOMT_POS_PORT || '').replace(/\D/g, '');
  if (portNum) {
    req.portNo = portNum;
    req.bandwidth = process.env.GOLOMT_POS_BAUD || '115200';
  }
  if (!req.terminalID) console.warn('\n⚠️  GOLOMT_TERMINAL_ID is empty — set your provisioned TID first.');
  console.log(`\n⚠️  REAL sale for ${chargeAmt} MNT — the terminal will prompt for a card. Ctrl+C to abort.`);
  console.log('  request:', JSON.stringify(req));
  await call(b64(req), `SALE ${chargeAmt} MNT`);
})();
