-- Central Stadium 360 — initial schema
-- Tables: users, events, channels, tickets, sessions
-- Auth: Supabase Auth (phone)
-- Access: RLS — user sees own rows; admins see all.

set check_function_bodies = off;

------------------------------------------------------------
-- extensions
------------------------------------------------------------
create extension if not exists "pgcrypto";

------------------------------------------------------------
-- enums
------------------------------------------------------------
do $$ begin
  create type public.user_role   as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('upcoming', 'live', 'ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum ('pending', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

------------------------------------------------------------
-- users (profile rows mirroring auth.users)
------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text unique,
  role        public.user_role not null default 'user',
  created_at  timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);

------------------------------------------------------------
-- events
------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       public.event_status not null default 'upcoming',
  start_time   timestamptz not null,
  created_at   timestamptz not null default now()
);

create index if not exists events_status_idx     on public.events(status);
create index if not exists events_start_time_idx on public.events(start_time);

create table if not exists public.channels (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id) on delete cascade,
  name               text not null,
  ivs_channel_arn    text,
  ivs_playback_url   text,
  position           smallint not null check (position between 1 and 4),
  created_at         timestamptz not null default now(),
  unique (event_id, position)
);

create index if not exists channels_event_idx on public.channels(event_id);


create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  event_id          uuid not null references public.events(id) on delete restrict,
  status            public.ticket_status not null default 'pending',
  price             integer not null check (price >= 0),
  qpay_invoice_id   text,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);

create index if not exists tickets_user_idx           on public.tickets(user_id);
create index if not exists tickets_event_idx          on public.tickets(event_id);
create index if not exists tickets_status_idx         on public.tickets(status);
create index if not exists tickets_qpay_invoice_idx   on public.tickets(qpay_invoice_id);

------------------------------------------------------------
-- sessions (active viewer device per ticket)
------------------------------------------------------------
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  device_id     text not null,
  started_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists sessions_ticket_idx     on public.sessions(ticket_id);
create index if not exists sessions_last_seen_idx  on public.sessions(last_seen_at);

------------------------------------------------------------
-- helper: is_admin(uid)
-- SECURITY DEFINER so RLS policies that reference users.role don't recurse.
------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = uid),
    false
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

------------------------------------------------------------
-- auto-create public.users row when a new auth user signs up
------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.users    enable row level security;
alter table public.events   enable row level security;
alter table public.channels enable row level security;
alter table public.tickets  enable row level security;
alter table public.sessions enable row level security;

-- users -------------------------------------------------------------
drop policy if exists users_self_select  on public.users;
drop policy if exists users_admin_select on public.users;
drop policy if exists users_self_update  on public.users;
drop policy if exists users_admin_all    on public.users;

create policy users_self_select on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_admin_select on public.users
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy users_self_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

create policy users_admin_all on public.users
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- events ------------------------------------------------------------
-- Public/anon can read events that are live or upcoming (catalog).
-- Admins can write.
drop policy if exists events_public_select on public.events;
drop policy if exists events_admin_all     on public.events;

create policy events_public_select on public.events
  for select to anon, authenticated
  using (status in ('upcoming', 'live', 'ended'));

create policy events_admin_all on public.events
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- channels ----------------------------------------------------------
-- Public can see channel metadata (name/position) so the player can list angles.
-- Playback URL exposure is controlled at the API layer (signed URLs), not RLS.
drop policy if exists channels_public_select on public.channels;
drop policy if exists channels_admin_all     on public.channels;

create policy channels_public_select on public.channels
  for select to anon, authenticated
  using (true);

create policy channels_admin_all on public.channels
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- tickets -----------------------------------------------------------
-- User sees only their own tickets. Admins see all.
drop policy if exists tickets_owner_select on public.tickets;
drop policy if exists tickets_owner_insert on public.tickets;
drop policy if exists tickets_admin_all    on public.tickets;

create policy tickets_owner_select on public.tickets
  for select to authenticated
  using (user_id = auth.uid());

create policy tickets_owner_insert on public.tickets
  for insert to authenticated
  with check (user_id = auth.uid());

create policy tickets_admin_all on public.tickets
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- sessions ----------------------------------------------------------
-- A user sees only sessions for tickets they own; admins see all.
drop policy if exists sessions_owner_select on public.sessions;
drop policy if exists sessions_owner_insert on public.sessions;
drop policy if exists sessions_owner_update on public.sessions;
drop policy if exists sessions_admin_all    on public.sessions;

create policy sessions_owner_select on public.sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = sessions.ticket_id and t.user_id = auth.uid()
    )
  );

create policy sessions_owner_insert on public.sessions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy sessions_owner_update on public.sessions
  for update to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = sessions.ticket_id and t.user_id = auth.uid()
    )
  );

create policy sessions_admin_all on public.sessions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
