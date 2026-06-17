-- Track when a user first watched something they had access to (live or VOD).
-- Used by the admin dashboard "Тасалбар үзсэн хэрэглэгч" metric so the count
-- survives backend restarts and also picks up VOD/replay views (previously the
-- count was kept only in-process and only the live /watch/token path bumped it).

alter table public.users
  add column if not exists first_viewed_at timestamptz;

comment on column public.users.first_viewed_at is
  'Set once when the user first accesses a live stream token or a signed VOD '
  'recording URL. Powers the buyer-to-viewer ratio in the admin dashboard.';

create index if not exists idx_users_first_viewed_at
  on public.users(first_viewed_at);
