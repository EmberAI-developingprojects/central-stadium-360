-- Ice rink skate rental, sold on the kiosk.
--
-- A rink is an event with kind = 'rink'. Its zones are skate sizes: one zone
-- per size, capacity = pairs of that size, all at the event price. Unlike a
-- match, a pair comes back: zones.sold counts pairs that are out (bought and
-- not yet returned), so a ticket's skate is released when its session ends,
-- when it is voided, or when it is never started on the day it was bought.
--
-- A rink ticket's time starts at its first scan, not at purchase:
--   valid  → (scan) active   started_at, ends_at = started_at + duration
--   active → (scan) done     returned on time
--   active → (scan) overdue  late: overtime frozen at the scan, to be paid
--   overdue → (QPay | cash)  done
-- 'scanner' is a staff role that may only scan rink tickets and show the board.

alter type public.user_role add value if not exists 'scanner';

alter table public.events
  add column if not exists kind text not null default 'event',
  add column if not exists rink_duration_minutes integer,
  add column if not exists rink_overtime_per_minute integer;

alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('event', 'rink'));

alter table public.events drop constraint if exists events_rink_terms_check;
alter table public.events add constraint events_rink_terms_check
  check (
    kind <> 'rink'
    or (rink_duration_minutes > 0 and rink_overtime_per_minute >= 0)
  );

create index if not exists events_kind_idx on public.events(kind) where kind = 'rink';

alter table public.venue_tickets
  add column if not exists started_at          timestamptz,
  add column if not exists ends_at             timestamptz,
  add column if not exists ended_at            timestamptz,
  add column if not exists started_by          uuid references public.users(id) on delete set null,
  add column if not exists ended_by            uuid references public.users(id) on delete set null,
  add column if not exists overtime_minutes    integer check (overtime_minutes >= 0),
  add column if not exists overtime_amount     integer check (overtime_amount >= 0),
  add column if not exists overtime_paid_via   text check (overtime_paid_via in ('qpay', 'cash')),
  add column if not exists overtime_paid_at    timestamptz,
  add column if not exists overtime_invoice_id text,
  add column if not exists overtime_qr_text    text,
  add column if not exists overtime_settled_by uuid references public.users(id) on delete set null,
  add column if not exists reminded_at         timestamptz;

alter table public.venue_tickets drop constraint if exists venue_tickets_status_check;
alter table public.venue_tickets add constraint venue_tickets_status_check
  check (status in ('valid', 'used', 'void', 'active', 'overdue', 'done'));

-- The board and the reminder job read only live sessions.
create index if not exists venue_tickets_rink_live_idx
  on public.venue_tickets(ends_at) where status in ('active', 'overdue');
create index if not exists venue_tickets_overtime_invoice_idx
  on public.venue_tickets(overtime_invoice_id) where overtime_invoice_id is not null;
