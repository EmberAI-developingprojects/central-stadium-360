------------------------------------------------------------
-- history_figures
-- Historical persons (general directors, founders, etc.) shown
-- as cards on the public "Түүхэн хэсэг" page. Admin-editable.
------------------------------------------------------------
create table if not exists public.history_figures (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  role        text not null default '',
  year_start  text not null default '',
  year_end    text not null default '',
  image       text,
  bio         text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists history_figures_sort_idx on public.history_figures(sort_order);

alter table public.history_figures enable row level security;

drop policy if exists history_figures_public_select on public.history_figures;
drop policy if exists history_figures_admin_all     on public.history_figures;

create policy history_figures_public_select on public.history_figures
  for select to anon, authenticated
  using (true);

create policy history_figures_admin_all on public.history_figures
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

comment on table public.history_figures is
  'Historical figures (e.g. past general directors) shown on the public history page. Admin-editable.';
