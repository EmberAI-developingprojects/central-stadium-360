<div align="center">
  <br />
  <img src="https://stadium.mn/favicon.ico" width="80" alt="logo" />
  <br /><br />

  <h1>Central Stadium 360</h1>

  <p>
    Монгол Улсын Үндэсний Цэнгэлдэх Хүрээлэнгийн<br />
    <strong>тасалбар худалдаа ба 360° шууд дамжуулалтын платформ</strong>
  </p>

  <p>
    <a href="https://stadium.mn"><img src="https://img.shields.io/badge/🌐_stadium.mn-live-22c55e?style=for-the-badge" alt="live" /></a>
    &nbsp;
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    &nbsp;
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    &nbsp;
    <img src="https://img.shields.io/badge/AWS_IVS-4×_360°-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
  </p>

  <br />
</div>

---

## Юу вэ?

**Central Stadium 360** нь Улаанбаатарын зүрхэнд байрлах Монгол Улсын Үндэсний Цэнгэлдэх Хүрээлэнгийн арга хэмжээнүүдийг **4 синхрон 360° камераар** шууд дамжуулж, хэрэглэгчдэд онлайнаар тасалбар худалдан авах боломж олгодог платформ юм.

Наадам 2026 (7/11–15)-д Монголын хамгийн том үндэсний баяраар дүүрэн цэнгэлдэхийн нээлтийн ёслол, бөх барилдаан, сурын харваа зэрэг арга хэмжээнүүдийг **хаанаас ч, ямар ч өнцгөөс** үзэх боломж.

---

## Онцлогууд

| | |
|---|---|
| 📡 **360° Шууд дамжуулал** | AWS IVS — 4 синхрон камер, HLS player |
| 🎬 **VOD бичлэг** | CloudFront signed URL, автомат discovery |
| 🎟️ **Тасалбар** | Zone-based суудал, QPay, e-Barimt |
| 🖥️ **Киоск** | Turnstile admission scanning, sell-through |
| 📧 **Имэйл** | AWS SES v2, DKIM, Mongolian template |
| 📱 **SMS** | Callpro OTP, magic link |
| 🛡️ **Auth** | Supabase — имэйл, утас, magic link |
| 🌐 **i18n** | Монгол / Англи |

---

## Tech stack

```
Frontend   React 18 · Vite · Tailwind CSS · react-router v6
Backend    Hono · Node.js · TypeScript · Cloud Run
Database   Supabase (PostgreSQL + Auth + Storage)
Streaming  AWS IVS · AWS CloudFront · HLS.js
Email      AWS SES v2 · DKIM
Payments   QPay · e-Barimt
Deploy     Google Cloud Run · Cloud Build
```

---

## Хурдан эхлэх

```bash
# 1. Суулгах
git clone https://github.com/your-org/central-stadium-360.git
cd central-stadium-360
pnpm install

# 2. Environment тохируулах
cp backend/.env.example backend/.env
# Утгуудыг бөглөнө үү

# 3. Dev сервер
pnpm dev
# → Frontend  http://localhost:5173
# → Admin     http://localhost:5174
# → Backend   http://localhost:3000
```

---

## Deploy

```bash
# Image build
gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=latest --project=stadium360

# Cloud Run
gcloud run deploy cs360-backend \
  --image=asia-northeast1-docker.pkg.dev/stadium360/cs360-backend/server:latest \
  --region=asia-northeast1 \
  --project=stadium360
```

---

<div align="center">
  <sub>© 2026 Монгол Улсын Үндэсний Цэнгэлдэх Хүрээлэн · Бүх эрх хуулиар хамгаалагдсан</sub>
</div>
