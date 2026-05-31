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
