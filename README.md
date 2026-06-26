<div align="center">

<img src="https://stadium.mn/favicon.ico" width="72" height="72" alt="CS360 Logo" />

# Central Stadium 360

**Монгол Улсын Үндэсний Цэнгэлдэх Хүрээлэнгийн**  
тасалбар худалдаа ба 360° олон өнцгийн шууд дамжуулалтын платформ

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.6-E36002?style=flat-square&logo=hono&logoColor=white)](https://hono.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![AWS](https://img.shields.io/badge/AWS-IVS%20%2F%20SES%20%2F%20S3-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Deployed on](https://img.shields.io/badge/Deploy-Cloud%20Run-4285F4?style=flat-square&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)

[stadium.mn](https://stadium.mn) · Улаанбаатар, Монгол Улс

</div>

---

## Товч танилцуулга

Central Stadium 360 нь Монгол Улсын Үндэсний Цэнгэлдэх Хүрээлэнгийн арга хэмжээнүүдийг **4 синхрон 360° камераар** шууд дамжуулж, үзэгчид онлайнаар тасалбар худалдан авч, хаанаас ч үзэх боломжийг олгодог платформ юм.

Наадам 2026 (7/11–15) хүртэл **шууд дамжуулал, тасалбар**, **киоск**, **admin** зэрэг бүрэн систем ажиллуулна.

---

## Архитектур

```
┌─────────────────────────────────────────────────────────┐
│                      stadium.mn                         │
│              React 18 + Vite + Tailwind CSS             │
│         (frontend)          (admin — :5174)             │
└─────────────────┬───────────────────────────────────────┘
                  │ REST + WebSocket
┌─────────────────▼───────────────────────────────────────┐
│              Hono API  (Cloud Run)                      │
│   auth · events · tickets · payments · recordings       │
│   kiosk · admin · email-hook · sms-hook · watch         │
└──────┬───────────┬───────────┬────────────┬─────────────┘
       │           │           │            │
  Supabase     AWS IVS      AWS SES      QPay
  Auth + DB    4× 360°      Email        Монгол
  Storage      камер        (DKIM)       төлбөр
               │
          AWS CloudFront
          VOD streaming
```

---

## Монорепо бүтэц

```
central-stadium-360/
├── frontend/          # React 18 · Vite · Tailwind · react-router v6
│   └── src/
│       ├── pages/     # Хэрэглэгчийн UI (Home, Events, Watch, Tickets…)
│       ├── admin/     # Admin панел (Events, Orders, Users, Kiosk…)
│       ├── data/      # Zustand store + Supabase query layer
│       ├── lib/       # API client, i18n, auth helpers
│       └── components/
├── backend/           # Hono · Node.js · tsx · Cloud Run
│   └── src/
│       ├── routes/    # REST endpoints + webhook handlers
│       └── lib/       # Email, SMS, QPay, CloudFront, tickets…
├── shared/            # Хуваалцсан TypeScript type-ууд
├── supabase/          # Migration-ууд + Edge Functions
├── cloudbuild.yaml    # Google Cloud Build (Docker image build)
└── env-vars.yaml      # Cloud Run environment variables
```

---

## Үндсэн онцлогууд

| Бүсэд | Онцлог |
|---|---|
| **Шууд дамжуулал** | AWS IVS — 4 синхрон 360° камер, HLS.js player |
| **VOD** | AWS S3 + CloudFront signed URL, бичлэгийн автомат discovery |
| **Тасалбар** | Zone-based суудал, QPay интеграц, e-barimt |
| **Киоск** | Turnstile admission scanning, sell-through report |
| **Имэйл** | AWS SES v2 · DKIM · Supabase Auth webhook |
| **SMS** | Callpro provider · Supabase Auth webhook |
| **Admin** | Events CRUD, хэрэглэгч, тасалбар, тооцоо, контент |
| **i18n** | Монгол / Англи (react-i18next) |
| **Auth** | Supabase Auth — имэйл, утас, magic link |

---

## Хөгжүүлэлтийн орчин

### Шаардлага

- **Node.js** ≥ 20
- **pnpm** 9.x
- **Supabase CLI**

### Суулгах

```bash
git clone https://github.com/your-org/central-stadium-360.git
cd central-stadium-360
pnpm install
```

### Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Утгуудыг бөглөнө үү
```

**Backend-н гол хувьсагчид:**

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
EMAIL_PROVIDER=ses          # dev | ses | postmark
SES_FROM=no-reply@stadium.mn
EMAIL_HOOK_SECRET=          # Supabase Auth hook signing secret
SMS_HOOK_SECRET=
QPAY_USERNAME=
QPAY_PASSWORD=
```

### Dev сервер ажиллуулах

```bash
pnpm dev
# Frontend  → http://localhost:5173
# Admin     → http://localhost:5174
# Backend   → http://localhost:3000
```

### Database

```bash
pnpm db:push      # Migration шинэчлэх
pnpm db:reset     # DB дахин тохируулах
pnpm db:diff      # Шинэ migration үүсгэх
```

---

## Deployment

### Docker image build (Cloud Build)

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_TAG=latest \
  --project=stadium360
```

### Cloud Run deploy

```bash
gcloud run deploy cs360-backend \
  --image=asia-northeast1-docker.pkg.dev/stadium360/cs360-backend/server:latest \
  --region=asia-northeast1 \
  --project=stadium360
```

### Environment variable шинэчлэх

```bash
gcloud run services update cs360-backend \
  --region=asia-northeast1 \
  --project=stadium360 \
  --flags-file=env-vars.yaml
```

---

## Email (AWS SES)

Supabase Auth hook → `/email-hook` → AWS SES v2

| Шат | Байдал |
|---|---|
| `stadium.mn` DKIM verified | ✅ |
| `EMAIL_HOOK_SECRET` тохируулагдсан | ✅ |
| Supabase Send email hook | ✅ |
| SES Production access | ⏳ AWS хянаж байна |

---

## Typecheck

```bash
pnpm typecheck          # Бүх package
pnpm --filter @cs360/frontend typecheck
pnpm --filter @cs360/backend typecheck
```

---

## Лиценз

© 2026 Монгол Улсын Үндэсний Цэнгэлдэх Хүрээлэн. Бүх эрх хуулиар хамгаалагдсан.
