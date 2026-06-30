# Kiosk payments — `/api/kiosk/orders*`

> **Status:** implemented in the cs360 backend (branch
> `feat/in-person-kiosk-ticketing`). This supersedes the earlier *guessed*
> contract. Source of truth: `@cs360/shared` + `docs/in-person-ticketing-design.md`
> and `docs/payments-architecture.md`.

All under `{KIOSK_API_BASE}/api/kiosk`, header `X-Kiosk-Key`. Envelope is
`{ ok, data }`. The buyer is anonymous; the backend holds the QPay credentials.

## 1. Create order

`POST /api/kiosk/orders`
```jsonc
{ "event_id": "...", "items": [{ "zone_id": "...", "qty": 2 }],
  "method": "qpay" | "card", "buyer_phone": "8800..." }
```
Backend reserves capacity (atomic), creates a `venue_order`. For `qpay` it also
makes a QPay invoice.
```jsonc
// data
{ "order_id": "...", "reference": "...", "total": 90000,
  "qr_text": "...", "qr_image": "<base64 PNG>", "urls": [ ... ] }   // qr_* only for qpay
```

## 2. Poll status

`GET /api/kiosk/orders/:id/status` — settles on first PAID (mints tickets,
issues e-barimt via QPay), idempotent.
```jsonc
// data
{ "order_id": "...", "reference": "...", "status": "pending|paid|cancelled",
  "total": 90000, "paid_at": null,
  "tickets": [ { "code": "NS-…", "zone_name_mn": "…", "zone_name_en": "…" } ],
  "ebarimt": { "qrData": "…", "lottery": "QQ …" } }   // tickets+ebarimt once paid
```

## 3. Card rail result

`POST /api/kiosk/orders/:id/card-result` — after the bridge charges the terminal
+ POSAPI issues the e-barimt.
```jsonc
{ "approved": true, "payment_ref": "…",
  "ebarimt": { "qrData": "…", "lottery": "…" } }
```
→ same `data` shape as status (mints tickets, marks paid).

## Then: print (on the box, via the bridge)

Not part of the cloud contract — the kiosk calls the local **kiosk-bridge**
with the `venue_ticket.code`s and the e-barimt: `POST {bridge}/print/ticket`
and `POST {bridge}/print/receipt`. See `backend/README.md`.

## Kiosk side (wired)

- `frontend/lib/services/payment_service.dart` — `createOrder` / `status` /
  `pollUntilSettled` / `cardResult`.
- `frontend/lib/models/payment.dart` — `KioskOrder`, `KioskOrderStatus`,
  `KioskTicket`, `EbarimtReceipt`.
- `frontend/lib/services/print_service.dart` — bridge ticket + receipt printing.
