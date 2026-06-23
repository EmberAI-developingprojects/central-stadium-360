-- 0017_venue_tickets_zone_cascade.sql
-- When an event is deleted, its zones cascade-delete (from 0011), but
-- venue_tickets.zone_id was ON DELETE RESTRICT, which blocked the chain
-- as soon as any printed in-person ticket existed.
-- A venue_ticket is meaningless without its zone — cascade it.

alter table public.venue_tickets
  drop constraint if exists venue_tickets_zone_id_fkey;

alter table public.venue_tickets
  add constraint venue_tickets_zone_id_fkey
  foreign key (zone_id) references public.zones(id) on delete cascade;
