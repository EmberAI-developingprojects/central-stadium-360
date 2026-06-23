-- 0016_event_delete_cascade.sql
-- Allow admin to delete an event together with its tickets and venue_orders.
-- The admin UI already warns "бүх захиалга, тасалбарын хамт устгагдана",
-- so the FKs must cascade instead of restricting.

alter table public.tickets
  drop constraint if exists tickets_event_id_fkey;

alter table public.tickets
  add constraint tickets_event_id_fkey
  foreign key (event_id) references public.events(id) on delete cascade;

alter table public.venue_orders
  drop constraint if exists venue_orders_event_id_fkey;

alter table public.venue_orders
  add constraint venue_orders_event_id_fkey
  foreign key (event_id) references public.events(id) on delete cascade;
