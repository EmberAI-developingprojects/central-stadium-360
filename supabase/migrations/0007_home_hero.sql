------------------------------------------------------------
-- home_hero  (4 fixed image slots for the homepage hero section)
------------------------------------------------------------
create table if not exists public.home_hero (
  slot       text primary key,
  image_url  text not null default '',
  alt        text not null default ''
);

-- Seed the 4 default slots so they always exist
insert into public.home_hero (slot, image_url, alt) values
  ('tile1', '/assets/images/hero/featured.jpg',       'Онцлох үйл явдал'),
  ('tile2', '/assets/images/hero/stadium-aerial.png', 'Төв цэнгэлдэх хүрээлэн'),
  ('tile3', '/assets/images/hero/event-tengri.png',   'THUNDERZ — TENGRI'),
  ('tile4', '/assets/images/hero/live-360.png',       'Live streaming · 360°')
on conflict (slot) do nothing;

-- RLS
alter table public.home_hero enable row level security;

drop policy if exists home_hero_public_select on public.home_hero;
drop policy if exists home_hero_admin_all     on public.home_hero;

create policy home_hero_public_select on public.home_hero
  for select to anon, authenticated
  using (true);

create policy home_hero_admin_all on public.home_hero
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

comment on table public.home_hero is 'Fixed hero image slots (tile1–tile4) for the homepage. Admin-editable.';
