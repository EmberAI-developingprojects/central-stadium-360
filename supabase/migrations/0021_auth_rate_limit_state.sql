-- Distributed auth rate-limit counters and password-reset OTPs.
-- Both previously lived in per-instance process memory, which breaks on
-- Cloud Run with more than one instance: limits reset per instance and an
-- OTP written on one instance is invisible to another. These tables are
-- accessed only by the backend service role; RLS is enabled with no
-- policies so anon/authenticated clients cannot touch them.

create table if not exists public.auth_rate_counters (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

alter table public.auth_rate_counters enable row level security;
revoke all on table public.auth_rate_counters from anon, authenticated;

create table if not exists public.auth_reset_otps (
  phone text primary key,
  code text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.auth_reset_otps enable row level security;
revoke all on table public.auth_reset_otps from anon, authenticated;

-- Fixed-window counter. Increments past the max as well: blocked attempts
-- are counted but never extend the window, so the reset time stays stable.
create or replace function public.auth_rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns table (allowed boolean, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_hits integer;
begin
  insert into public.auth_rate_counters as c (key, window_start, hits)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set window_start = case
          when c.window_start <= v_now - make_interval(secs => p_window_seconds)
            then v_now
          else c.window_start
        end,
        hits = case
          when c.window_start <= v_now - make_interval(secs => p_window_seconds)
            then 1
          else c.hits + 1
        end
  returning c.window_start, c.hits into v_window_start, v_hits;

  -- Opportunistic cleanup of long-expired counters.
  if random() < 0.01 then
    delete from public.auth_rate_counters
    where window_start < v_now - interval '1 day';
  end if;

  allowed := v_hits <= p_max;
  reset_at := v_window_start + make_interval(secs => p_window_seconds);
  return next;
end;
$$;

revoke all on function public.auth_rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;

-- Atomically checks a reset OTP. A correct code does NOT consume the row
-- (verify and reset both check it; reset deletes it after the password
-- update succeeds). A wrong code increments attempts and deletes the row
-- once p_max_attempts is reached.
create or replace function public.consume_reset_otp(
  p_phone text,
  p_code text,
  p_max_attempts integer
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select code, attempts, expires_at into v
  from public.auth_reset_otps
  where phone = p_phone
  for update;

  if not found then
    return 'invalid';
  end if;

  if v.expires_at < now() then
    delete from public.auth_reset_otps where phone = p_phone;
    return 'invalid';
  end if;

  if v.code = p_code then
    return 'ok';
  end if;

  if v.attempts + 1 >= p_max_attempts then
    delete from public.auth_reset_otps where phone = p_phone;
  else
    update public.auth_reset_otps
    set attempts = attempts + 1
    where phone = p_phone;
  end if;
  return 'invalid';
end;
$$;

revoke all on function public.consume_reset_otp(text, text, integer)
  from public, anon, authenticated;
