-- eBarimt fiscal receipt for ONLINE 360 streaming tickets (public.tickets).
-- Mirrors the venue_orders.ebarimt_* columns (migration 0011) so the online
-- rail can persist the PosAPI 3.0 receipt (QR + lottery) issued on payment.
alter table public.tickets
  add column if not exists ebarimt_id text,
  add column if not exists ebarimt_qr_data text,
  add column if not exists ebarimt_lottery text;
