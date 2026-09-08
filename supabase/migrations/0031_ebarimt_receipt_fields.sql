alter table public.tickets
  add column if not exists ebarimt_ddtd text,
  add column if not exists ebarimt_date timestamptz,
  add column if not exists ebarimt_vat numeric(14, 4),
  add column if not exists ebarimt_city_tax numeric(14, 4);

alter table public.venue_orders
  add column if not exists ebarimt_ddtd text,
  add column if not exists ebarimt_date timestamptz,
  add column if not exists ebarimt_vat numeric(14, 4),
  add column if not exists ebarimt_city_tax numeric(14, 4);
