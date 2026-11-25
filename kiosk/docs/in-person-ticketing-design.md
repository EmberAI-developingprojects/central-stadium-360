# In-person (kiosk) ticketing — design for the cs360 backend

Extends `central-stadium-360` (Hono + Supabase, base path `/api`) to sell
**physical admission tickets** at the stadium kiosk, alongside the existing
online `live`/`replay` stream tickets. Same events, same admin panel.

Decisions: **capacity zones** (VIP/Premium/GA), **anonymous** walk-up buyers,
built **into the cs360 backend**.

## Why new tables (not the existing `tickets`)

The current `tickets` table is **one row per logged-in user per event** = stream
access. In-person is **anonymous, multi-quantity, multi-zone, printed**. Forcing
that into `tickets` (which has a NOT NULL `user_id`) would be a hack. So
in-person gets its own small domain that reuses events + QPay + the admin panel.

## Schema (new migration)

```sql
-- Capacity tiers for in-person admission (none exist today). Per the brief,
-- zones are CAPACITY COUNTERS, never seats.
create table public.zones (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name_mn     text not null,
  name_en     text not null,
  desc_mn     text,
  desc_en     text,
  price       integer not null check (price >= 0),     -- MNT, gate price
  capacity    integer not null check (capacity >= 0),
  sold        integer not null default 0 check (sold >= 0 and sold <= capacity),
  color       text,                                    -- hex accent for kiosk UI
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index zones_event_idx on public.zones(event_id);

-- An anonymous kiosk purchase (may cover several zones / quantities).
create table public.venue_orders (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete restrict,
  reference       text not null unique,                -- kiosk ref = QPay sender_invoice_no
  status          public.ticket_status not null default 'pending', -- reuse enum
  total           integer not null check (total >= 0), -- MNT
  payment_method  text check (payment_method in ('qpay','card')),
  qpay_invoice_id text,
  paid_at         timestamptz,
  buyer_phone     text,                                -- optional, for e-barimt
  -- e-barimt (QPay-issued for qpay rail, POSAPI-issued for card rail)
  ebarimt_id        text,
  ebarimt_qr_data   text,
  ebarimt_lottery   text,
  kiosk_id        text,                                -- which physical kiosk
  created_at      timestamptz not null default now()
);
create index venue_orders_event_idx on public.venue_orders(event_id);
create index venue_orders_invoice_idx on public.venue_orders(qpay_invoice_id);

-- One row per admission = one printed ticket with a gate-scannable QR.
create table public.venue_tickets (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.venue_orders(id) on delete cascade,
  zone_id     uuid not null references public.zones(id) on delete restrict,
  code        text not null unique,                    -- QR payload for the gate
  status      text not null default 'valid' check (status in ('valid','used','void')),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index venue_tickets_order_idx on public.venue_tickets(order_id);
```

### Atomic capacity (no oversell)
A Postgres RPC reserves under a row lock:
```sql
create or replace function public.reserve_zone(p_zone uuid, p_qty int)
returns boolean language plpgsql as $$
declare ok boolean;
begin
  update public.zones
     set sold = sold + p_qty
   where id = p_zone and sold + p_qty <= capacity
  returning true into ok;
  return coalesce(ok, false);
end $$;
```
Reserved on order create; released (`sold = sold - qty`) if the order expires
unpaid. RLS: `zones` public-read (kiosk needs availability); `venue_orders` /
`venue_tickets` service-role only.

## Endpoints (new, kiosk-scoped, behind a device key)

All under `/api/kiosk/*`, guarded by `requireKiosk` (a `X-Kiosk-Key` header
checked against `KIOSK_API_KEY` env) — the buyer is anonymous, the *device* is
authenticated.

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/kiosk/events` | events + their `zones` (with `available = capacity - sold`) |
| POST | `/api/kiosk/orders` | create order: `{eventId, items:[{zoneId,qty}], method, buyerPhone?}` → reserve capacity, create `venue_order(pending)`; for `qpay` also create QPay invoice → `{orderId, reference, total, qrImage?, qrText?}` |
| GET  | `/api/kiosk/orders/:id/status` | poll: check QPay; on first PAID → issue e-barimt (`/v2/ebarimt/create`), generate `venue_tickets`, return `{status, ebarimt:{qrData,lottery}, tickets:[{code,zoneName}]}` |
| POST | `/api/kiosk/orders/:id/card-result` | card rail: bridge reports charge + POSAPI e-barimt → mark paid, store e-barimt, generate tickets |

Admin: extend `admin-events` with zone CRUD (`GET/POST/PATCH/DELETE /api/admin/events/:id/zones`) so prices/capacity are set in the existing panel.

## Reused as-is
- **QPay** (`lib/qpay.ts`): `createInvoice` / `checkInvoicePayment` / `isPaid` — already there. Add **`createEbarimt(paymentId)`** (`/v2/ebarimt/create`) — the ~12 lines we discussed; not in the repo yet.
- **Callback**: `qpay-callback` pattern + `qpay-signature.ts` — point `callback_url` at the order instead of a ticket.
- **Events catalog + admin panel** — unchanged.

## Kiosk app side (mostly done already)
- `Event`/`Zone` Dart models already match this `zones` shape.
- `EventsService` → point at `GET /api/kiosk/events`.
- `PaymentService` → `POST /api/kiosk/orders` + poll `/status` (replaces the guessed contract).
- `PrintService` → bridge `/print/ticket` (per `venue_ticket.code`) + `/print/receipt` (e-barimt).
- Bridge `/pos/charge` + `/ebarimt/receipt` feed the `card-result` call.

## Two payment rails (recap)
- **QPay QR**: backend issues invoice + e-barimt (cloud); kiosk shows QR, polls, prints.
- **Card terminal**: bridge charges + POSAPI issues e-barimt (on box); kiosk posts result to `card-result`; prints.
Both: gate ticket QR from `venue_tickets`, printed on the kiosk.
