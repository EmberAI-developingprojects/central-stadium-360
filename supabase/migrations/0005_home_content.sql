do $$ begin
  create type public.roadmap_position as enum ('top', 'bot');
exception when duplicate_object then null; end $$;

------------------------------------------------------------
-- home_news
------------------------------------------------------------
create table if not exists public.home_news (
  id          uuid primary key default gen_random_uuid(),
  label       text not null default '',
  title       text not null default '',
  body        text not null default '',
  image       text,
  featured    boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists home_news_sort_idx     on public.home_news(sort_order);
create index if not exists home_news_featured_idx on public.home_news(featured) where featured = true;

------------------------------------------------------------
-- home_partners
------------------------------------------------------------
create table if not exists public.home_partners (
  id          uuid primary key default gen_random_uuid(),
  image       text not null default '',
  alt         text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists home_partners_sort_idx on public.home_partners(sort_order);

------------------------------------------------------------
-- home_roadmap (history milestones)
------------------------------------------------------------
create table if not exists public.home_roadmap (
  id          uuid primary key default gen_random_uuid(),
  year        text not null default '',
  title       text not null default '',
  position    public.roadmap_position not null default 'top',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists home_roadmap_sort_idx on public.home_roadmap(sort_order);

------------------------------------------------------------
-- home_services (service cards — admin UI calls these "members" for legacy
-- reasons; the public label is "Үйлчилгээ" / services)
------------------------------------------------------------
create table if not exists public.home_services (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default '',
  description  text not null default '',
  icon_key     text not null default 'music',
  href         text not null default '#',
  badge        text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists home_services_sort_idx on public.home_services(sort_order);

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.home_news     enable row level security;
alter table public.home_partners enable row level security;
alter table public.home_roadmap  enable row level security;
alter table public.home_services enable row level security;

-- home_news ---------------------------------------------------------
drop policy if exists home_news_public_select on public.home_news;
drop policy if exists home_news_admin_all     on public.home_news;

create policy home_news_public_select on public.home_news
  for select to anon, authenticated
  using (true);

create policy home_news_admin_all on public.home_news
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- home_partners -----------------------------------------------------
drop policy if exists home_partners_public_select on public.home_partners;
drop policy if exists home_partners_admin_all     on public.home_partners;

create policy home_partners_public_select on public.home_partners
  for select to anon, authenticated
  using (true);

create policy home_partners_admin_all on public.home_partners
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- home_roadmap ------------------------------------------------------
drop policy if exists home_roadmap_public_select on public.home_roadmap;
drop policy if exists home_roadmap_admin_all     on public.home_roadmap;

create policy home_roadmap_public_select on public.home_roadmap
  for select to anon, authenticated
  using (true);

create policy home_roadmap_admin_all on public.home_roadmap
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- home_services -----------------------------------------------------
drop policy if exists home_services_public_select on public.home_services;
drop policy if exists home_services_admin_all     on public.home_services;

create policy home_services_public_select on public.home_services
  for select to anon, authenticated
  using (true);

create policy home_services_admin_all on public.home_services
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

comment on table public.home_news     is 'Public home page news cards. Admin-editable.';
comment on table public.home_partners is 'Partner logos shown on the home page. Admin-editable.';
comment on table public.home_roadmap  is 'Stadium history timeline shown on the home page. Admin-editable.';
comment on table public.home_services is 'Service cards on the home page. Admin-editable.';
