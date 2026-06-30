# kiosk-bridge

Local hardware bridge for the stadium kiosk. Runs **on the kiosk box** and lets
the hosted web UI reach the on-box hardware services it can't call directly from
a browser:

```
Kiosk web UI (browser, kiosk mode)
   │  http://127.0.0.1:7070   (CORS + Private Network Access handled here)
   ▼
kiosk-bridge
   ├─ POST /pos/charge      → card POS terminal service   (POS_SERVICE_URL)
   └─ POST /ebarimt/receipt → E-Barimt POSAPI 3.0          (EBARIMT_POSAPI_URL)
```

Both downstream services are **localhost HTTP** on the box. The bridge exists to
(1) satisfy the browser's CORS/PNA preflights, and (2) make money operations
**idempotent** (keyed on `orderRef`) so a retry never double-charges or
double-issues a fiscal receipt.

## Status

- **`/ebarimt/receipt`** — wired to the on-box **E-Barimt PosAPI 3.0**
  (`/rest/receipt`) and verified live against staging (issues real test
  barimt: `id` + QR + lottery). See `src/ebarimt/`.
- **`/print/ticket`, `/print/receipt`** — wired. The bridge renders the ticket /
  И-Баримт to a bitmap (GDI+, Unicode-safe for Mongolian Cyrillic) and prints to
  the **POS80** thermal printer via the Windows spooler — no native deps. See
  `src/print/` + `scripts/print_doc.ps1`. Preview a layout without a printer:
  `powershell -File scripts/print_doc.ps1 -SpecPath spec.json -OutFile out.png`.
- **`/pos/charge`** — driver layer in `src/pos/` (mock default). The real
  **Golomt** Integrated POS driver is stubbed pending its integration spec.

## Run (dev)

```bash
cd backend
npm install
cp .env.example .env   # edit for your box
npm run dev            # tsx watch, http://127.0.0.1:7070/health
```

## Endpoints

| Method | Path                | Body                                            | Returns |
|--------|---------------------|-------------------------------------------------|---------|
| GET    | `/health`           | —                                               | `{ ok: true }` |
| POST   | `/pos/charge`       | `{ orderRef, amount, description? }`            | charge result (`approved`, `rrn`, …) |
| POST   | `/ebarimt/receipt`  | `{ orderRef, items[], type?, customerTin? }`   | fiscal bill (`id`, `qrData`, `lottery`, …) |

## Deploy on the kiosk box

Build (`npm run build`) and run `node dist/server.js` as a Windows service that
starts at logon and restarts on crash — same pattern as
`tool/kiosk/install_autostart.ps1` uses for the app.
