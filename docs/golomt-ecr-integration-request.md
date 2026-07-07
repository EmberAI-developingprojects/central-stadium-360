# Golomt ECR — integration spec request

Everything in the kiosk-bridge card path is built **except** the Golomt-specific
message layout in `backend/src/pos/verifone/protocol.ts` (gated behind
`SPEC_CONFIRMED=false`). The terminal is a Verifone (USB `VID_11CA`) on `COM3`,
confirmed as Golomt's "кассын системд холбогддог ПОС" (ECR-integrated POS,
https://www.golomtbank.com/cards/54868 — product page only, no protocol).

## Protocol identified (from research)

The product is Golomt **IPPOS** (Integrated Payment POS) and the underlying
protocol is **Verifone iPOS, "semi-integrated mode"**:
- single **RS-232 serial** port (here USB-CDC → `COM3`), no Ethernet;
- message framing = **STX / ETX / FS / LRC** one-byte control chars — exactly what
  `transport.ts` (STX/ETX + XOR-LRC) and `protocol.ts` (FS-delimited fields)
  already implement. So our wiring matches; only the field LAYOUT is still open.

Authoritative docs: Verifone's **iPOS Implementation Guide**
(`SE_Verifone_iPOS_..._Implementation_Guide.pdf`) + the GPA "Semi-Integrated Mode"
functional spec — given to integrators, not published openly (developer.verifone.com
cert expired; docs.verifone.com omits the wire spec). Golomt layers its IPPOS
acquirer-specific fields/response codes on top, so the production mapping must come
from Golomt.

## How to get it

Ask Golomt's **E-business Partnership / Card Division** by name for the **IPPOS
integration guide + Verifone iPOS Implementation Guide** (plus a sample sale
message and a test terminal). Contact: **1800-1646 / mail@golomtbank.com**;
developer hub (needs registration): https://developer-hub.golomtbank.com/.
Reference: Dayansoft (dayansoft.mn) already ships this IPPOS integration.

## Exactly what to ask for (each maps to a code seam)

1. **Link parameters** — baud rate, data bits, parity, stop bits, flow control for
   the serial/USB-CDC link. *(transport.ts SerialTransport opts; a bare ENQ got no
   reply at 9600–115200, so the terminal likely only answers a full request frame.)*
2. **Framing** — confirm STX/ETX + XOR-LRC, or the exact alternative (header
   length, checksum algorithm/coverage). *(transport.ts frame()/lrc())*
3. **Sale request** — transaction-type code for a purchase, full field order, the
   ECR-reference field (length + charset), and the **amount format** (MNT integer
   vs ×100 minor unit) and currency field. *(protocol.ts encodeSaleRequest)*
4. **Sale response** — response/result code table (approved / declined / cancelled
   / timeout) and the positions of authCode, **RRN**, masked PAN, terminal id (TID).
   *(protocol.ts parseSaleResponse + statusFromCode)*
5. **Void / cancel** — the frame to reverse the last/in-flight sale.
   *(verifone.ts cancel())*
6. **Settlement / batch close** — request + response row format for reconciliation.
   *(verifone.ts lastSettlement())*
7. **Timeouts & retries** — expected max cardholder wait, and ACK/NAK retry rules.
   *(POS_ACK_TIMEOUT_MS / POS_RESPONSE_TIMEOUT_MS)*
8. **Most valuable:** a **sample transaction trace (hex dump)** of one approved
   sale + its response, and a **test/sandbox terminal** to certify against.
9. **Alternative:** if Golomt ships a **Windows SDK/DLL** instead of raw ECR, send
   that + docs — we'd swap to an SDK-backed driver (config already has
   `POS_SERVICE_URL` for an HTTP/SDK model).

## When the spec arrives
Fill in `encodeSaleRequest` / `parseSaleResponse` (+ `TxnType`, `statusFromCode`)
in `protocol.ts`, set `SPEC_CONFIRMED = true`, then test end-to-end:
`POST /pos/charge` → approval/RRN → `POST /ebarimt/receipt`. Until then the
driver refuses to transmit, by design.
