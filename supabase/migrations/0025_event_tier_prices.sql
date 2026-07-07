-- Per-event ticket-tier pricing, entered by the admin on event create/edit.
-- NULL (or 0) falls back to the platform defaults in shared TICKET_TIERS
-- (standard 9,900 / multi3 14,900 / multi5 19,900).
--
-- The 5-user tier's replay window is NOT a new column: it reuses
-- events.replay_available_until, which the admin form already fills from the
-- "нөхөж үзэх хоног" (replay days) input.

alter table public.events
  add column if not exists price_standard integer
    check (price_standard is null or price_standard >= 0),
  add column if not exists price_multi3 integer
    check (price_multi3 is null or price_multi3 >= 0),
  add column if not exists price_multi5 integer
    check (price_multi5 is null or price_multi5 >= 0);

comment on column public.events.price_standard is
  'Admin-set Standard (1-device) tier price, MNT. NULL -> platform default.';
comment on column public.events.price_multi3 is
  'Admin-set 3-User tier price, MNT. NULL -> platform default.';
comment on column public.events.price_multi5 is
  'Admin-set 5-User (replay) tier price, MNT. NULL -> platform default.';
