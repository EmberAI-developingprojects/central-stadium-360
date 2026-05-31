alter table public.events
  add column if not exists price integer not null default 0
    check (price >= 0);

comment on column public.events.price is
  'Ticket price in MNT (Mongolian tögrög), integer. Backend-enforced.';
