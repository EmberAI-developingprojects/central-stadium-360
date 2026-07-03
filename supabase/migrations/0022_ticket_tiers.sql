-- Ticket licensing tiers: Standard (1 device), 3-User (3), 5-User (5, + replay).
-- Platform-wide fixed prices are defined in application code (shared TICKET_TIERS);
-- here we only persist the tier chosen and its concurrent-device cap per ticket.

alter table public.tickets
  add column if not exists tier text not null default 'standard'
    check (tier in ('standard', 'multi3', 'multi5')),
  add column if not exists max_devices integer not null default 1
    check (max_devices >= 1);

-- Backfill existing rows: replay tickets came from the top-tier product, so map
-- them to multi5 (5 devices + replay); everything else is Standard (1 device).
update public.tickets
  set tier = 'multi5', max_devices = 5
  where ticket_type = 'replay';

update public.tickets
  set tier = 'standard', max_devices = 1
  where ticket_type <> 'replay';

comment on column public.tickets.tier is
  'Licensing tier: standard=1 device, multi3=3, multi5=5 (+replay).';
comment on column public.tickets.max_devices is
  'Concurrent-device cap enforced via public.sessions for this ticket.';

-- Helper: count currently-active devices for a ticket (session seen within the
-- given staleness window). Used to enforce the tier device cap on stream start.
create or replace function public.active_device_count(
  p_ticket_id uuid,
  p_stale_seconds integer default 90
)
returns integer
language sql
stable
as $$
  select count(distinct device_id)::int
  from public.sessions
  where ticket_id = p_ticket_id
    and last_seen_at > now() - make_interval(secs => p_stale_seconds);
$$;
