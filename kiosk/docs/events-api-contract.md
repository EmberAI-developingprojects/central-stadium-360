# Kiosk catalog — `GET /api/kiosk/events`

> **Status:** implemented in the cs360 backend (branch
> `feat/in-person-kiosk-ticketing`). This supersedes the earlier *guessed*
> contract — the kiosk now reads the **real** cs360 shape. Source of truth:
> `@cs360/shared` (`KioskEvent`/`KioskZone`) and `docs/in-person-ticketing-design.md`.

The kiosk reads its catalog from the same backend the website uses. An admin
edits an event/zone price or capacity in the admin panel → it writes to Supabase
→ `GET /api/kiosk/events` serves it → the kiosk picks it up on its next load.

- **Endpoint:** `GET {KIOSK_API_BASE}/api/kiosk/events`
- **Auth:** header `X-Kiosk-Key: <KIOSK_API_KEY>` (device auth; buyer is anonymous)
- **Response:** `{ "ok": true, "data": KioskEvent[] }`

## KioskEvent

| field           | type            | notes |
|-----------------|-----------------|-------|
| `id`            | string          | |
| `title`         | string          | single language (proper name) |
| `description`   | string \| null  | single language |
| `status`        | string          | `upcoming` / `live` (kiosk only sees these) |
| `start_time`    | string ISO-8601 | |
| `image`         | string \| null  | banner URL |
| `thumbnail_url` | string \| null  | fallback image |
| `zones`         | `KioskZone[]`   | in-person capacity tiers |

## KioskZone

| field        | type           | notes |
|--------------|----------------|-------|
| `id`         | string         | |
| `name_mn`    | string         | e.g. VIP / Premium / Энгийн |
| `name_en`    | string         | |
| `desc_mn`    | string \| null | |
| `desc_en`    | string \| null | |
| `price`      | number (MNT)   | gate price |
| `capacity`   | number         | |
| `sold`       | number         | kiosk shows `available = capacity - sold` + sold-out |
| `color`      | string `#RRGGBB` \| null | tier accent |
| `available`  | number         | convenience (= capacity - sold) |

## Kiosk side (wired)

- `frontend/lib/services/events.dart` → this endpoint, unwraps `data`.
- `frontend/lib/models/event.dart` / `zone.dart` — `fromJson` maps this shape
  (the app's `Event` has extra UI fields — subtitle/venue/icon/tint — that the
  backend doesn't supply; they're left blank or derived).
- Falls back to bundled `mock_events.dart` offline.

Run live (from `frontend/`):
```
flutter run -d chrome \
  --dart-define=KIOSK_API_BASE=https://<cs360-backend> \
  --dart-define=KIOSK_KEY=<X-Kiosk-Key> --dart-define=KIOSK_ID=gate-1
```
