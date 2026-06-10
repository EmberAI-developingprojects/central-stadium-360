-- VOD support: live + replay pricing, IVS recordings, ticket type split.
--
-- Notes:
--   * events.status was previously a public.event_status enum
--     ('upcoming','live','ended'). VOD adds 'archived' and 'expired',
--     so we convert the column to varchar(20) + check constraint as
--     specified.
--   * Existing event prices stay in the `price` (integer MNT) column;
--     new `live_price` / `replay_price` are NUMERIC(10,2) for VOD.

------------------------------------------------------------
-- events: VOD columns + status widening
------------------------------------------------------------
alter table public.events
  add column if not exists live_price             numeric(10, 2) not null default 0,
  add column if not exists replay_price           numeric(10, 2) not null default 0,
  add column if not exists live_start_at          timestamptz,
  add column if not exists live_end_at            timestamptz,
  add column if not exists replay_available_until timestamptz,
  add column if not exists thumbnail_url          text;

-- Widen status: enum -> varchar(20) with check, allow archived/expired.
--
-- Postgres blocks ALTER TYPE on a column referenced by an RLS policy, so
-- drop the dependent policy first and recreate it after the column change.
drop policy if exists events_public_select on public.events;

alter table public.events
  alter column status drop default;

alter table public.events
  alter column status type varchar(20)
  using status::text;

alter table public.events
  alter column status set default 'upcoming';

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('upcoming', 'live', 'ended', 'archived', 'expired'));

-- Recreate the policy with the widened status set so anon/auth users
-- can keep listing events (including archived for the VOD catalogue).
create policy events_public_select on public.events
  for select to anon, authenticated
  using (status in ('upcoming', 'live', 'ended', 'archived', 'expired'));

-- The old public.event_status enum is now unreferenced; drop it so the
-- type system stays consistent with the varchar column.
drop type if exists public.event_status;

comment on column public.events.live_price is
  'Price (MNT) for a live ticket. NUMERIC for fractional currencies / promos.';
comment on column public.events.replay_price is
  'Price (MNT) for a replay (VOD) ticket.';
comment on column public.events.live_start_at is
  'Scheduled live-stream start. NULL until the stream is scheduled.';
comment on column public.events.live_end_at is
  'Scheduled live-stream end.';
comment on column public.events.replay_available_until is
  'Replay availability cutoff. NULL = no replay offered.';
comment on column public.events.thumbnail_url is
  'Event cover/thumbnail image URL.';

------------------------------------------------------------
-- recordings: per-camera VOD assets backed by IVS + S3
------------------------------------------------------------
create table if not exists public.recordings (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references public.events(id) on delete cascade,
  camera_number         integer not null check (camera_number between 1 and 4),
  channel_arn           text,
  s3_bucket             text,
  s3_key_prefix         text,
  master_playlist_path  text,
  duration_seconds      integer,
  recording_started_at  timestamptz,
  recording_ended_at    timestamptz,
  status                varchar(20) not null default 'ready'
                          check (status in ('recording', 'processing', 'ready', 'expired')),
  created_at            timestamptz not null default now(),
  unique (event_id, camera_number)
);

create index if not exists recordings_event_idx  on public.recordings(event_id);
create index if not exists recordings_status_idx on public.recordings(status);

comment on table public.recordings is
  'VOD recording per camera. One row per (event, camera) pairing.';

------------------------------------------------------------
-- tickets: live vs replay
------------------------------------------------------------
alter table public.tickets
  add column if not exists ticket_type varchar(20) not null default 'live';

alter table public.tickets
  drop constraint if exists tickets_ticket_type_check;

alter table public.tickets
  add constraint tickets_ticket_type_check
  check (ticket_type in ('live', 'replay'));

create index if not exists tickets_ticket_type_idx on public.tickets(ticket_type);

comment on column public.tickets.ticket_type is
  'Which entitlement this ticket grants: live stream access or VOD replay access.';

------------------------------------------------------------
-- RLS for recordings
------------------------------------------------------------
alter table public.recordings enable row level security;

drop policy if exists recordings_public_select on public.recordings;
drop policy if exists recordings_service_all   on public.recordings;
drop policy if exists recordings_admin_all     on public.recordings;

-- Public can read only ready recordings; ARNs/S3 paths are still
-- considered safe metadata (playback URLs are signed at the API layer).
create policy recordings_public_select on public.recordings
  for select to anon, authenticated
  using (status = 'ready');

-- Service role is unrestricted by RLS by default, but we add an
-- explicit policy so admin-tier authenticated calls also work and the
-- intent is captured in the policy list.
create policy recordings_admin_all on public.recordings
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
