-- B2B support for online 360 tickets: the buyer's company TIN. When set, the
-- eBarimt is issued as a B2B_RECEIPT (no lottery) instead of B2C.
alter table public.tickets
  add column if not exists ebarimt_customer_tin text;
