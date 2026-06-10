-- Ticket access window: each paid ticket unlocks 30 days of VOD access
-- from a specific anchor (live_end_at for live tickets, paid_at for replay).
-- Recordings stay on S3 for the full replay-sell window (default 365 days
-- after live_end_at), but every individual ticket expires 30 days from its
-- own anchor.

------------------------------------------------------------
-- 1) Column + index
------------------------------------------------------------
alter table public.tickets
  add column if not exists access_expires_at timestamptz;

comment on column public.tickets.access_expires_at is
  'Timestamp after which this ticket no longer grants VOD/live access. '
  'Live tickets: events.live_end_at + 30 days. '
  'Replay tickets: paid_at + 30 days.';

create index if not exists idx_tickets_access_expires_at
  on public.tickets(access_expires_at);

------------------------------------------------------------
-- 2) Backfill: live tickets — anchor on events.live_end_at + 30 days
------------------------------------------------------------
update public.tickets t
   set access_expires_at = e.live_end_at + interval '30 days'
  from public.events e
 where t.event_id = e.id
   and t.ticket_type = 'live'
   and t.status = 'paid'
   and t.access_expires_at is null
   and e.live_end_at is not null;

------------------------------------------------------------
-- 3) Backfill: replay tickets — anchor on paid_at + 30 days
------------------------------------------------------------
update public.tickets
   set access_expires_at = paid_at + interval '30 days'
 where ticket_type = 'replay'
   and status = 'paid'
   and access_expires_at is null
   and paid_at is not null;

------------------------------------------------------------
-- 4) Default replay-sell window for legacy events (365 days)
------------------------------------------------------------
update public.events
   set replay_available_until = live_end_at + interval '365 days'
 where replay_available_until is null
   and live_end_at is not null;
