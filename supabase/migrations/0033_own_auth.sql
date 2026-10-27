-- Own auth, replacing Supabase GoTrue after the move to Cloud SQL.
-- Credentials stay in auth.users (bcrypt encrypted_password, phone/email,
-- *_confirmed_at, banned_until), so existing passwords and user ids carry
-- over and the on_auth_user_created trigger keeps creating public.users rows.

-- One row per signed-in device. Only a hash of the refresh token is stored;
-- it is rotated on every refresh and revoked on logout / password change.
create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token_hash text not null unique,
  created_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  ip text
);

create index if not exists auth_sessions_user_id_idx on public.auth_sessions (user_id);

alter table public.auth_sessions enable row level security;

-- Short-lived codes: phone signup OTPs and email verification tokens.
-- Password-reset OTPs keep using auth_reset_otps / consume_reset_otp.
create table if not exists public.auth_otps (
  purpose text not null,
  identifier text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (purpose, identifier)
);

alter table public.auth_otps enable row level security;
