alter table public.users
  add column if not exists full_name  text not null default '',
  add column if not exists email      text,
  add column if not exists deleted_at timestamptz;

create unique index if not exists users_email_unique_idx
  on public.users(email)
  where email is not null;

create index if not exists users_deleted_at_idx
  on public.users(deleted_at);

comment on column public.users.full_name is
  'User-supplied display name. Captured on signup from raw_user_meta_data.';
comment on column public.users.email is
  'Mirror of auth.users.email; null for phone-only accounts.';
comment on column public.users.deleted_at is
  'Soft-delete marker. Row stays so tickets/payments FKs remain valid.';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, email, full_name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
    set phone     = excluded.phone,
        email     = excluded.email,
        full_name = case
                      when public.users.full_name = '' then excluded.full_name
                      else public.users.full_name
                    end;
  return new;
end;
$$;


do $$
declare
  cons_name text;
begin
  select conname
    into cons_name
    from pg_constraint
   where conrelid = 'public.tickets'::regclass
     and conname like 'tickets_user_id%';
  if cons_name is not null then
    execute format('alter table public.tickets drop constraint %I', cons_name);
  end if;
end $$;

alter table public.tickets
  add constraint tickets_user_id_fkey
  foreign key (user_id) references public.users(id) on delete restrict;
