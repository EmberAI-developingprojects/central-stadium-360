-- Ticket-tier access windows (product spec 2026-07):
--   Standard — live only, 1 device, no replay.
--   3-User   — live only, 3 devices, no replay.
--   5-User   — live on 5 devices + replay for the ADMIN-SET event window
--     (events.replay_available_until, the "нөхөж үзэх хоног" form input);
--     without one, until the END of the month the live ends in, Ulaanbaatar
--     time ("7 сар дуустал": Naadam Jul 11 -> expires Aug 1 00:00 UB).
-- 0010 stamped every live ticket with live_end_at + 30 days; multi5 must get
-- the replay window instead. Overwrite multi5, fill-only the rest.

update public.tickets t
   set access_expires_at = case
       when e.replay_available_until is not null
            and e.replay_available_until > e.live_end_at
         then e.replay_available_until
       else (date_trunc('month', e.live_end_at at time zone 'Asia/Ulaanbaatar')
               + interval '1 month') at time zone 'Asia/Ulaanbaatar'
     end
  from public.events e
 where e.id = t.event_id
   and t.ticket_type = 'live'
   and t.tier = 'multi5'
   and t.status in ('pending', 'paid')
   and e.live_end_at is not null;

update public.tickets t
   set access_expires_at = e.live_end_at + interval '30 days'
  from public.events e
 where e.id = t.event_id
   and t.ticket_type = 'live'
   and t.tier in ('standard', 'multi3')
   and t.status in ('pending', 'paid')
   and t.access_expires_at is null
   and e.live_end_at is not null;
