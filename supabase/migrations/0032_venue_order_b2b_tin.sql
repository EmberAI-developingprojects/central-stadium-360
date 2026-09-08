-- B2B for in-person kiosk sales: the buying company's TIN.
--
-- The kiosk asks "Хувь хүн эсвэл Байгууллага?" before payment. When a company
-- is chosen the TIN is stored here, the QPay rail issues the eBarimt as
-- COMPANY instead of CITIZEN, and the printed slip shows "ААН (B2B)" plus a
-- Худ.авагч ТТД row. Mirrors tickets.ebarimt_customer_tin (0026) for the
-- online rail.
alter table public.venue_orders
  add column if not exists ebarimt_customer_tin text;
