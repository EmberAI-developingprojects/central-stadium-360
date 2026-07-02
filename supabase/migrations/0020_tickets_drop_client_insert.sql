-- Tickets are only ever created by the backend via the service-role client
-- (which bypasses RLS). The tickets_owner_insert policy allowed any
-- authenticated user to insert a ticket directly through the anon-key REST
-- API with arbitrary status/price (e.g. status='paid', price=0), bypassing
-- payment entirely. The frontend never inserts into tickets, so this policy
-- is dropped rather than tightened.
drop policy if exists tickets_owner_insert on public.tickets;
