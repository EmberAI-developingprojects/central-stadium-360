-- Add admin-managed presentation fields to events.
--
-- - image: cover image URL displayed on the catalog cards and the watch page.
-- - pill: short category label ("Концерт", "Live Concert", ...). Free-form text
--   so marketing can introduce new categories without a schema change.
-- - featured: marks the single event that gets the hero treatment on the home
--   page. Enforced as "at most one featured" via a partial unique index — the
--   admin UI already assumes only one can be featured at a time.

alter table public.events
  add column if not exists image    text,
  add column if not exists pill     text,
  add column if not exists featured boolean not null default false;

create unique index if not exists events_single_featured_idx
  on public.events ((featured))
  where featured = true;

comment on column public.events.image is
  'Cover image URL. Served from /assets or a CDN.';
comment on column public.events.pill is
  'Short category label shown on event cards (e.g. "Концерт").';
comment on column public.events.featured is
  'Hero slot on the home page. At most one row may be true (partial unique idx).';
