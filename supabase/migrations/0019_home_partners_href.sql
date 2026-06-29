alter table public.home_partners
  add column if not exists href text not null default '';

comment on column public.home_partners.href is 'Optional outbound URL for the partner logo. Empty string means no link.';
