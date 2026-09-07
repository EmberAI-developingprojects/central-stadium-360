alter table public.tickets
  add column if not exists qpay_payment_id text;

alter table public.venue_orders
  add column if not exists qpay_payment_id text;
