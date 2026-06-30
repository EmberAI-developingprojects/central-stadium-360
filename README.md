# Stadium Kiosk — Tsengeldeh / National Stadium

Self-service event ticketing kiosk for the **National Stadium (Цэнгэлдэх хүрээлэн)**,
for a 47" portrait (1080×1920) touchscreen. Monorepo: the kiosk UI and its on-box
hardware bridge.

```
kiosk/
  frontend/   Flutter kiosk app (UI) — runs as a web kiosk; native Windows also supported
  backend/    kiosk-bridge (Node/TS) — on-box proxy to E-Barimt POSAPI + card POS terminal
  docs/       project brief + the events API contract
  tool/       shared dev scripts (asset generation, fonts, Windows build/autostart)
```

## Architecture

The UI is a **Flutter web app** shown in browser **kiosk mode**, hosted alongside
the main site. It reads live events/prices from the cloud backend (`/events`) and
drives payments/tickets through it. Local hardware (E-Barimt fiscal receipts, card
POS) is reached through the **`backend/` bridge** on the kiosk box, because a
browser can't call those `localhost` services directly.

```
Browser (kiosk mode) → Flutter web (hosted)
     ├─► Cloud backend   events · QPay · tickets        (the team's Vercel API)
     └─► kiosk-bridge     /pos/charge · /ebarimt/receipt  (this repo's backend/)
```

See `docs/events-api-contract.md` for the catalog contract and
`backend/README.md` for the bridge.

## Develop

| Part      | Where        | Run |
|-----------|--------------|-----|
| Kiosk UI  | `frontend/`  | `C:\dev\flutter\bin\flutter run -d chrome` (add `--dart-define=KIOSK_API_BASE=https://…` for live data) |
| Bridge    | `backend/`   | `npm install && npm run dev` |

Full UI details (screens, design notes, native Windows build) are in
`frontend/README.md`.
