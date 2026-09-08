# web-v2 — kiosk buying screen

A plain static page (no build step, no framework). Replaces the compiled
Flutter bundle in `../web`, which could no longer be rebuilt because its Dart
sources are not in this repository.

## What it adds over the Flutter screen

1. **B2B** — after the payment the buyer picks **Хувь хүн / Байгууллага**;
   picking Байгууллага opens a large ТТД keypad and the И-Баримт is issued to
   that company (`B2B_RECEIPT`).
2. **Card starts immediately** — tapping "Картаар төлөх" creates the order and
   sends the charge to the terminal in the same tap. There is no second button.
3. **"Та баримт хэвлэх хүртэл түр хүлээнэ үү"** — after payment the buyer is
   held on a waiting screen that polls `GET /print/status?ref=<order id>` until
   the slip is actually out of the printer.

## Where the buyer-type question appears

- **Card**: after the terminal approves — exactly as asked.
- **QPay**: before the QR. QPay's cloud stamps the И-Баримт the moment the
  payment lands, and it cannot be re-issued to a company afterwards, so the
  choice has to be on the order before the invoice is created.

## Running it

`Start Kiosk.bat` still points at `../web`. To switch:

    powershell -ExecutionPolicy Bypass -File run_web_kiosk.ps1 -WebRoot "%~dp0web-v2" -Port 8080

or edit the last line of `Start Kiosk.bat` to say `web-v2` instead of `web`.
Nothing in `../web` is touched, so switching back is the same one-word edit.

## Credentials

This page holds none. Everything cloud-side goes through the bridge's
`/cloud/*` proxy, which adds `X-Kiosk-Key` from `backend/.env` — so KIOSK_KEY
can be rotated without touching the UI. (The old Flutter bundle had the key
compiled into `main.dart.js`.)

For off-box testing, `?bridge=http://127.0.0.1:11017` points the page at a stub.
