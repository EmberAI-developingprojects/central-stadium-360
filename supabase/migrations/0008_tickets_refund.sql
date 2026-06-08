-- Add 'refunded' state and refunded_at timestamp to tickets.

alter type public.ticket_status add value if not exists 'refunded';

alter table public.tickets
  add column if not exists refunded_at timestamptz;

create index if not exists tickets_created_at_idx on public.tickets(created_at);
