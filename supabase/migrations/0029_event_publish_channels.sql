-- Per-surface publish flags for events.
--
-- Until now a single `events` row was published to BOTH surfaces at once: the
-- website (live / replay stream tickets) and the stadium kiosk (printed zone
-- admissions). Creating an event for one surface silently created it for the
-- other. These two flags split that decision, so an event can be sold online
-- only, at the gate only, or on both.
--
-- Both default to `true` so every existing event keeps the behaviour it had
-- before this migration.

alter table public.events
  add column if not exists show_on_web   boolean not null default true,
  add column if not exists show_on_kiosk boolean not null default true;

comment on column public.events.show_on_web is
  'Event is listed and sellable on the website (live / replay stream tickets).';
comment on column public.events.show_on_kiosk is
  'Event is listed and sellable on the stadium kiosk (in-person zone tickets).';

-- Both listings filter on the flag, so index only the rows they actually read.
create index if not exists events_show_on_web_idx
  on public.events (start_time) where show_on_web;
create index if not exists events_show_on_kiosk_idx
  on public.events (start_time) where show_on_kiosk;
