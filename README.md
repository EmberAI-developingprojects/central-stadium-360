<div align="center">
  <br />
  <img src="https://stadium.mn/favicon.ico" width="80" alt="Central Stadium 360 logo" />
  <br /><br />

  <h1>Central Stadium 360</h1>

  <p>
    Ticketing & 360° live-streaming platform for the<br />
    <strong>National Central Stadium of Mongolia</strong>
  </p>

  <p>
    <a href="https://stadium.mn"><img src="https://img.shields.io/badge/🌐_stadium.mn-live-22c55e?style=for-the-badge" alt="live site" /></a>
    &nbsp;
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    &nbsp;
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    &nbsp;
    <img src="https://img.shields.io/badge/360°_Live-4_cameras-FF6B00?style=for-the-badge" alt="4x 360 cameras" />
  </p>

  <br />
</div>

---

## What is this?

**Central Stadium 360** brings the events of Mongolia's National Central Stadium — in the heart of Ulaanbaatar — to every screen. Four synchronized **360° cameras** stream live over CDN, letting viewers watch the opening ceremony, wrestling, archery and concerts **from any angle, from anywhere**, with online tickets, replays, and on-site kiosk sales all running on one platform.

One `events` row powers **two independent storefronts**:

| Storefront                                    | What it sells                  | How                                                            |
| --------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| 🌐 **Web** ([stadium.mn](https://stadium.mn)) | Live-stream & replay access    | QPay invoice → device-capped streaming ticket                  |
| 🎪 **Kiosk** (at the stadium)                 | Printed zone admission tickets | Touch kiosk → QPay QR / bank card → thermal-printed QR tickets |

Admins choose per event whether it appears on the web, at the kiosk, or both.

---

## Features

|                            |                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| 📡 **360° live streaming** | Wowza Video → CloudFront, 4 synchronized cameras, HLS.js player, HMAC-tokenized stream paths           |
| 🎬 **VOD replays**         | Per-session HLS recordings on S3, CloudFront signed URLs, automatic discovery                          |
| 🎟️ **Web tickets**         | Three tiers (Standard / Multi-3 / Multi-5) with device caps and replay windows                         |
| 🖨️ **Kiosk tickets**       | VIP / Fan Zone / Standard zones, oversell-safe capacity, auto-printed QR admission tickets             |
| 💳 **Payments**            | QPay (web + kiosk) and Golomt integrated POS card terminal (kiosk)                                     |
| 🧾 **E-Barimt**            | Fiscal receipts on both rails — QPay cloud API and on-box PosAPI 3.0 — printed to TEG's paper standard |
| 🚪 **Gate admission**      | QR scanning with per-zone admitted/no-show reporting                                                   |
| 📊 **Admin panel**         | Events, zones, orders, sell-through, reconciliation per cashier, live admission dashboard              |
| 📧📱 **Messaging**         | Resend / AWS SES email, Callpro SMS OTP & magic links                                                  |
| 🛡️ **Auth**                | Supabase — email, phone, magic link; role-based admin                                                  |
| 🌐 **i18n**                | Mongolian / English                                                                                    |

---

## Architecture

```
                        ┌──────────────────────────────┐
     4 × 360° cameras ─▶│  Wowza Video  ─▶  CloudFront │─▶  HLS.js player
                        └──────────────────────────────┘         │
                                                                 │ signed URLs +
┌────────────────┐   ┌──────────────────────────────┐            │ stream tokens
│  Web frontend  │──▶│                              │◀───────────┘
│  React + Vite  │   │        Backend (Hono)        │   ┌─────────────────────┐
├────────────────┤   │        Google Cloud Run      │──▶│  Supabase Postgres  │
│  Admin panel   │──▶│                              │   │  Auth · Storage     │
└────────────────┘   │  QPay · e-Barimt · SES/SMS   │   └─────────────────────┘
                     └──────────────┬───────────────┘
                                    │  /api/kiosk/* (X-Kiosk-Key)
                     ┌──────────────▼───────────────┐
                     │   Stadium kiosk (Windows)     │
                     │  Flutter web UI · kiosk-bridge│
                     │  POS80 printer · Golomt POS   │
                     │  E-Barimt PosAPI · auto-print │
                     └──────────────────────────────┘
```

The **kiosk-bridge** is a small Node service on the kiosk box that owns the local hardware: it renders Cyrillic tickets with GDI+ and prints them on the built-in POS80 thermal printer, drives the Golomt card terminal, issues card-rail e-Barimt via the on-box PosAPI, and polls the cloud every few seconds to auto-print tickets and fiscal receipts the moment an order is paid — idempotently, with an on-disk printed-code ledger.

---

## Monorepo layout

```
central-stadium-360/
├── frontend/        React 18 + Vite — public site and /admin panel
├── backend/         Hono API on Cloud Run — tickets, streaming, kiosk, payments
├── shared/          TypeScript types shared across packages (@cs360/shared)
├── supabase/        SQL migrations (0001 … ) — pnpm db:push
└── kiosk_deploy/    Deployable kiosk bundle for the Windows box
    ├── web/           Flutter web build (touch UI)
    ├── backend/       kiosk-bridge (printing · POS · e-Barimt · auto-print)
    └── Start Kiosk.bat
```

---

## Quick start

```bash
# 1. Install
git clone https://github.com/your-org/central-stadium-360.git
cd central-stadium-360
pnpm install

# 2. Configure environment
cp backend/.env.example backend/.env
#   → fill in Supabase, QPay, AWS, Wowza credentials

# 3. Run everything
pnpm dev
#   → Frontend  http://localhost:5173
#   → Admin     http://localhost:5174
#   → Backend   http://localhost:3000
```

Useful scripts:

```bash
pnpm typecheck     # strict TS across all packages
pnpm build         # shared → frontend → backend
pnpm db:push       # apply supabase/migrations to the linked project
```

---

## Deployment

**Backend → Google Cloud Run** (build from the repo root so local changes ship):

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=latest --project=stadium360

gcloud run deploy cs360-backend \
  --image=asia-northeast1-docker.pkg.dev/stadium360/cs360-backend/server:latest \
  --region=asia-northeast1 \
  --project=stadium360
```

**Frontend → Vercel** — deploys automatically on push to `main`.

**Kiosk → Windows box** — copy `kiosk_deploy/` to the machine, fill in `backend\.env`
(kiosk key, printer, POS terminal, e-Barimt merchant identity), then run `Start Kiosk.bat`.
It launches the hardware bridge and opens the Flutter UI full-screen in browser kiosk mode.

---

<div align="center">
  <sub>© 2026 National Central Stadium of Mongolia · All rights reserved</sub>
</div>
