# Payments & E-Barimt — kiosk architecture

Source specs in `docs/vendor/` (QPay V2 Postman collection + "V2 API with Ebarimt 3.0" workbook).

## The key fact

**QPay V2 issues the E-Barimt 3.0 receipt itself.** A QPay payment's
`ebarimt/create` returns `ebarimt_qr_data` + `ebarimt_lottery` with
`ebarimt_by: QPAY`. So for QR payments there is **no local POSAPI involved** —
QPay does payment *and* fiscal receipt in the cloud.

That splits checkout into two rails:

### Rail A — QPay QR  (cloud only, no local hardware)
Lives entirely in the **cloud backend** (their `qpay.ts` / `payments.ts`). The
kiosk never holds QPay credentials.

```
kiosk → POST {cloud}/payments/qpay/create {orderRef, amount, items}
         backend: auth/token → /v2/invoice
      ← { invoiceId, qrImage(base64 PNG), deeplinks[] }
kiosk: show qrImage on screen   (QPay returns the PNG — no local QR rendering)
user: scans with any bank app, pays
QPay → callback_url (cloud, public)        ← why this MUST be cloud, not the box
kiosk → poll GET {cloud}/payments/{invoiceId}/status
         backend: /v2/payment/check
      ← { status: PAID, paymentId, ebarimt:{ qrData, lottery } }
         (backend calls /v2/ebarimt/create on PAID)
kiosk: confirmation screen
kiosk → bridge POST /print/ticket   → ESC/POS printer (entry ticket + QR)
kiosk → bridge POST /print/receipt  → ESC/POS printer (QPay-issued e-barimt)
```

The kiosk prints paper, so **even Rail A touches the bridge** — for printing
only (the printer is a local device). Payment + e-barimt stay in the cloud.

Why QPay belongs in the cloud, not the `kiosk-bridge`:
1. **`callback_url` must be publicly reachable** — the kiosk box / localhost
   bridge has no public URL; the Vercel backend does.
2. **Merchant `client_secret` stays server-side** — never on a kiosk box that
   can be physically opened.

### Rail B — Card terminal  (local hardware, the bridge)
Only for paying by inserting/tapping a card on the kiosk's reader. Payment is
**not** through QPay, so the fiscal receipt goes through the standalone
**POSAPI 3.0** on the box.

```
kiosk → bridge POST /pos/charge      → card POS terminal SDK   (charge)
kiosk → bridge POST /ebarimt/receipt → POSAPI 3.0              (fiscal receipt + print)
```

This is what `backend/` (kiosk-bridge) already stubs.

## Who builds what

| Piece | Where | Owner |
|-------|-------|-------|
| QPay auth/invoice/check/ebarimt | cloud backend `qpay.ts`/`payments.ts` | fullstack partner |
| Kiosk payment UI + polling | `frontend/lib/services/payment_service.dart` (TODO) | this repo |
| Card terminal + POSAPI + print | `backend/` kiosk-bridge | this repo |

## QPay V2 reference (for the cloud `qpay.ts`)

Base: `https://merchant.qpay.mn`

1. **Auth** — `POST /v2/auth/token`, Basic `client_id:client_secret`
   → `{ access_token, refresh_token, expires_in }` (cache; refresh before expiry).
2. **Create invoice** — `POST /v2/invoice` (Bearer)
   body: `{ invoice_code, sender_invoice_no (unique!), amount, invoice_description, callback_url, invoice_receiver_code, invoice_receiver_data{} }`
   → `{ invoice_id, qr_text, qr_image, qPay_shortUrl, qPay_deeplink[] }`
3. **Check payment** — `POST /v2/payment/check` (Bearer)
   body: `{ object_type:"INVOICE", object_id: invoice_id, offset:{page_number,page_limit} }`
   → `{ count, paid_amount, rows:[{ payment_id, payment_status: NEW|PAID|FAILED|PARTIAL|REFUNDED, payment_type: P2P|CARD, ebarimt_customer_no }] }`
4. **Create E-Barimt** — `POST /v2/ebarimt/create` (Bearer)
   body: `{ payment_id, ebarimt_receiver_type: CITIZEN|COMPANY, ebarimt_receiver? }`
   → `{ id, ebarimt_qr_data, ebarimt_lottery, ebarimt_status: REGISTERED, amount, vat_amount, ... }`

Notes: do **not** poll `payment/check` on a cron — rely on `callback_url`, poll
only while the user waits at the kiosk. `sender_invoice_no` must be unique per
invoice (use the kiosk order reference).

## ⚠ Secrets

`docs/vendor/` holds the QPay collection with **TEST** merchant creds/tokens
(`TEST_MERCHANT` / sample JWTs). Real `client_id`/`client_secret` live **only**
in the cloud backend env — never in this repo, the kiosk build, or the box.
