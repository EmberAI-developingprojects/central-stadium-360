-- Per-event tier price overrides. Each event may set its own price for any of
-- the three licensing tiers; a NULL means "inherit the platform catalog price"
-- (shared TICKET_TIERS). Only PRICE is per-event — the device cap and replay
-- entitlement remain the tier's fixed definition (enforced from TICKET_TIERS).
alter table public.events
  add column if not exists tier_standard_price integer
    check (tier_standard_price is null or tier_standard_price >= 0),
  add column if not exists tier_multi3_price integer
    check (tier_multi3_price is null or tier_multi3_price >= 0),
  add column if not exists tier_multi5_price integer
    check (tier_multi5_price is null or tier_multi5_price >= 0);

comment on column public.events.tier_standard_price is
  'Per-event price (MNT) for the Standard tier; NULL = inherit TICKET_TIERS catalog.';
comment on column public.events.tier_multi3_price is
  'Per-event price (MNT) for the 3-User tier; NULL = inherit TICKET_TIERS catalog.';
comment on column public.events.tier_multi5_price is
  'Per-event price (MNT) for the 5-User tier; NULL = inherit TICKET_TIERS catalog.';
