-- In-person (kiosk) ticketing.
-- The stadium kiosk sells PHYSICAL admission tickets (printed, anonymous) for
-- the same events the website sells live/replay stream access for. This adds:
--   * zones           — capacity tiers per event (VIP/Premium/GA), gate-priced
--   * venue_orders     — one anonymous kiosk purchase (may span zones/quantities)
--   * venue_tickets    — one printed admission per row, each a gate-scannable QR
-- plus reserve_zone()/release_zone() for oversell-safe capacity.

set check_function_bodies = off;

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- zones — in-person capacity tiers (per the brief: counters, never seats)
------------------------------------------------------------
create table if not exists public.zones (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name_mn     text not null,
  name_en     text not null,
  desc_mn     text,
  desc_en     text,
  price       integer not null check (price >= 0),            -- MNT, gate price
  capacity    integer not null check (capacity >= 0),
  sold        integer not null default 0
                check (sold >= 0 and sold <= capacity),
  color       text,                                           -- hex accent for kiosk UI
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists zones_event_idx on public.zones(event_id);

------------------------------------------------------------
-- venue_orders — one anonymous in-person purchase
------------------------------------------------------------
create table if not exists public.venue_orders (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete restrict,
  reference       text not null unique,                       -- kiosk ref = QPay sender_invoice_no
  status          public.ticket_status not null default 'pending',
  -- requested composition, kept so tickets can be minted on payment and the
  -- receipt can list lines: [{zone_id,zone_name_mn,zone_name_en,qty,unit_price}]
  items           jsonb not null default '[]'::jsonb,
  total           integer not null check (total >= 0),        -- MNT
  payment_method  text check (payment_method in ('qpay', 'card')),
  qpay_invoice_id text,
  paid_at         timestamptz,
  buyer_phone     text,                                       -- optional, for e-barimt
  ebarimt_id        text,
  ebarimt_qr_data   text,
  ebarimt_lottery   text,
  kiosk_id        text,                                       -- which physical kiosk
  created_at      timestamptz not null default now()
);

create index if not exists venue_orders_event_idx   on public.venue_orders(event_id);
create index if not exists venue_orders_invoice_idx  on public.venue_orders(qpay_invoice_id);
create index if not exists venue_orders_status_idx   on public.venue_orders(status);
create index if not exists venue_orders_created_idx  on public.venue_orders(created_at);

------------------------------------------------------------
-- venue_tickets — one printed admission per row (gate-scannable QR)
------------------------------------------------------------
create table if not exists public.venue_tickets (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.venue_orders(id) on delete cascade,
  zone_id     uuid not null references public.zones(id) on delete restrict,
  code        text not null unique,                           -- QR payload for the gate
  status      text not null default 'valid'
                check (status in ('valid', 'used', 'void')),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists venue_tickets_order_idx on public.venue_tickets(order_id);
create index if not exists venue_tickets_zone_idx  on public.venue_tickets(zone_id);

------------------------------------------------------------
-- capacity: atomic reserve / release (oversell-safe)
------------------------------------------------------------
create or replace function public.reserve_zone(p_zone uuid, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  if p_qty <= 0 then return false; end if;
  update public.zones
     set sold = sold + p_qty
   where id = p_zone and sold + p_qty <= capacity
  returning true into ok;
  return coalesce(ok, false);
end;
$$;

create or replace function public.release_zone(p_zone uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then return; end if;
  update public.zones
     set sold = greatest(0, sold - p_qty)
   where id = p_zone;
end;
$$;

revoke all on function public.reserve_zone(uuid, int) from public;
revoke all on function public.release_zone(uuid, int) from public;
grant execute on function public.reserve_zone(uuid, int) to service_role;
grant execute on function public.release_zone(uuid, int) to service_role;

------------------------------------------------------------
-- RLS
--   zones         : public read (kiosk needs availability), admin writes
--   venue_orders  : service-role only (+ admin read for reporting)
--   venue_tickets : service-role only (+ admin read)
------------------------------------------------------------
alter table public.zones         enable row level security;
alter table public.venue_orders  enable row level security;
alter table public.venue_tickets enable row level security;

-- zones -------------------------------------------------------------
drop policy if exists zones_public_select on public.zones;
drop policy if exists zones_admin_all     on public.zones;

create policy zones_public_select on public.zones
  for select to anon, authenticated
  using (true);

create policy zones_admin_all on public.zones
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- venue_orders ------------------------------------------------------
-- Writes happen via the service role (kiosk API), which bypasses RLS.
-- Admins may read for the orders dashboard.
drop policy if exists venue_orders_admin_select on public.venue_orders;
create policy venue_orders_admin_select on public.venue_orders
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- venue_tickets -----------------------------------------------------
drop policy if exists venue_tickets_admin_select on public.venue_tickets;
create policy venue_tickets_admin_select on public.venue_tickets
  for select to authenticated
  using (public.is_admin(auth.uid()));
