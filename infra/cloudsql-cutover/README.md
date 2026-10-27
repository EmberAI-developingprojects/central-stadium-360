# Supabase → Cloud SQL шилжүүлэлт

Production-ийг Supabase-аас Cloud SQL (`cs360-db`) болон өөрсдийн auth руу
шилжүүлэх алхмууд. Скрипт алхам бүрийг тусад нь ажиллуулдаг; гаралтыг нь
шалгаад дараагийн алхам руу ор.

```bash
cd infra/cloudsql-cutover
export CUTOVER_STAMP=2026-11-03   # шилжүүлэх өдөр
./cutover.sh <алхам>
```

Бүх файл `~/Documents/cs360-backups/cutover-$CUTOVER_STAMP/`-д хадгалагдана
(мөн `gs://stadium360-db-backups/cutover-$CUTOVER_STAMP/`).

## 0. Урьдчилан (шилжүүлэх өдрөөс өмнө)

- `cutover-freeze` branch-ийг (main + maintenance mode) production-д deploy
  хийнэ. `MAINTENANCE_MODE` асаагаагүй үед ажиллагаа нь яг хэвээр.
  ```bash
  git switch cutover-freeze
  gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=freeze --project=stadium360
  gcloud run deploy cs360-backend --image=asia-northeast1-docker.pkg.dev/stadium360/cs360-backend/server:freeze --region=asia-northeast1 --project=stadium360
  ```
- Ойрын тоглолт байхгүй, шөнийн цаг сонгоно.

## Шилжүүлэх өдөр (~30–40 мин)

| # | Алхам | Юу хийх | Хэрэглэгчдэд |
|---|---|---|---|
| 1 | `preflight` | Хэрэгслүүд, нэвтрэлт, proxy, secret-ууд бэлэн эсэх; буцах revision-ийг тэмдэглэнэ | Нөлөөгүй |
| 2 | `freeze` | Одоогийн backend-д `MAINTENANCE_MODE=1` | Нүүр хуудас харагдана; нэвтрэх, худалдан авах түр хаагдана |
| — | **~10 мин хүлээх** | Эхэлсэн QPay төлбөрүүд дуусах хугацаа | |
| 3 | `backup` | Supabase-ийн эцсийн dump + зургууд → local + GCS | |
| 4 | `restore` | `cs360` database-ийг устгаж, dump-аас сэргээнэ; **мөр бүрийг** dump-тай тулгана; auth хүснэгт, GCS зургийн холбоос | |
| 5 | `deploy` | Шинэ backend-ийг `cutover` tag-тай, **traffic-гүй** deploy | |
| 6 | `smoke` | Шинэ revision-ийг хуучин (frozen)-той харьцуулна; дараа нь админаар нэвтэрч шалгах | |
| 7 | `go-live` | Бүх traffic шинэ revision руу | Backend Cloud SQL дээр |
| 8 | Frontend | `gcloud-migration`-ийг `main` руу merge + push → Vercel deploy | Нэг удаа дахин нэвтэрнэ |

`restore` нь database-ийг устгадаг тул нэрийг нь (`cs360`) бичиж баталгаажуулна.
Алдаа гарвал алхам зогсоно — тэр үед дараагийн алхам руу бүү ор.

## Буцах

- **go-live-оос өмнө** болих: `./cutover.sh unfreeze` — хуучин backend
  хэвээр, зөвхөн maintenance унтарна.
- **go-live-ийн дараа** буцах: `./cutover.sh rollback` (traffic-ийг
  preflight-ийн тэмдэглэсэн revision руу) + Vercel дээр өмнөх deployment-ийг
  promote. go-live-аас хойш Cloud SQL-д бичигдсэн дата Supabase-д байхгүй тул
  гараар шилжүүлэх хэрэгтэй.

## Дараа нь

- Supabase төслийг 2–4 долоо хоног **хөндөхгүй** хадгална, дараа нь устгана.
- Cloud SQL `db-f1-micro` 25 холболттой: backend `--max-instances=6`,
  `PG_POOL_MAX=3`. Тоглолтын өдөр instance-ийг томруулж
  (`gcloud sql instances patch cs360-db --tier=...`), max-instances-ийг нэмнэ.
- Cloud Run-ийн хуучин env (`SUPABASE_*`, `SMS_HOOK_SECRET`,
  `EMAIL_HOOK_SECRET`) ашиглагдахгүй болно — тогтворжсоны дараа хасна.

## Файлууд

- `cutover.sh` — дээрх алхмууд
- `prep_restore.py` — Supabase dump-ийг Cloud SQL-д тохируулна (Supabase-ийн
  role-ууд, owner, vault/realtime хасах, FK/trigger-ийг датаны дараа)
- `rewrite_image_urls.sql` — `supabase.co/storage` холбоосыг GCS руу
