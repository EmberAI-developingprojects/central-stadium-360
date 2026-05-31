# Authentication setup — phone OTP + email verification

Central Stadium 360 uses **Supabase Auth** with **password-based registration**.
Users register on the frontend's existing Register page either with:

- a **Mongolian phone number** (8 digits, `+976` prefix) — confirmed via an
  SMS OTP code, or
- a **Gmail address** — confirmed via an email link that Supabase sends.

After confirmation the account is active and the user signs in with their
password from the Login page (identifier = phone _or_ email).

This document covers the one-time configuration in Supabase + the env vars
on the backend and frontend, and explains how to switch from the current
**dev / no-SMS** mode to a real SMS provider.

---

## 1. Dev mode (no SMS provider) — what you have right now

Out of the box, the backend is in **dev SMS mode**: when Supabase asks it to
deliver an OTP, the OTP is **logged to the backend console**. No real SMS is
sent, no carrier needs to be configured, and the full register → verify →
login flow can be tested end-to-end locally.

How it works:

1. The frontend calls `POST /api/auth/register/phone` with `{ fullName, phone,
password }`.
2. The backend calls `supabase.auth.signUp({ phone, password })`. Supabase
   generates an OTP and (because the **Send SMS Hook** is configured —
   see step 2 below) calls back to our backend at
   `POST /api/internal/sms-hook` with `{ user, sms: { phone, otp } }`.
3. The hook verifies the request signature, then dispatches via
   `backend/src/lib/sms.ts`. Because `SMS_PROVIDER` is unset (the default),
   the dispatcher takes the `dev` branch and just `console.log`s the OTP
   to the terminal where `pnpm dev` is running.
4. The frontend renders the verification step (same `.login-card` shell as
   the form — no design change). The developer copies the OTP from the
   backend terminal and pastes it in.
5. `POST /api/auth/verify-phone` calls `supabase.auth.verifyOtp(...)` which
   confirms the phone, returns a Supabase session, and the frontend
   hydrates `supabase-js` so the user is now logged in.

For Gmail, no SMS is involved — Supabase's built-in mailer sends the
verification email straight to the inbox. In dev with no SMTP configured,
the email appears in Supabase Dashboard → Authentication → Users → the
account in question shows the magic link.

### Free-tier fallback: Supabase test phone numbers

If you'd rather not configure the Send SMS Hook (or you're on Supabase's
free tier where Auth Hooks aren't available), you can register a "test
phone number" in the dashboard:

Authentication → Phone Auth → Test OTP

Add a phone number plus a fixed OTP (e.g. `+97699112233` → `123456`). When
that phone signs up, Supabase skips the real SMS dispatch and accepts only
the fixed code. Useful for repeatable manual testing.

---

## 2. Configure Supabase (one-time)

In the Supabase dashboard for your project:

### 2a. Enable phone + email auth providers

Authentication → Providers → Phone — toggle ON
Authentication → Providers → Email — toggle ON

For email, set **Confirm email** to ON (default) so accounts must verify.

### 2b. Configure the Send SMS Hook (paid plans)

Authentication → Hooks → Send SMS Hook

- **URL:** `{PUBLIC_BACKEND_URL}/api/internal/sms-hook`
- **Secret:** click "Generate secret" and copy the value (it looks like
  `v1,whsec_<base64>`). Paste the same value into the backend's
  `SMS_HOOK_SECRET` env var.
- **Enable** the hook.

This is what routes the OTP to our `lib/sms.ts` dispatcher.

> If you skip this step the backend will still expose
> `/api/internal/sms-hook`, but Supabase has no way to call it — so OTPs
> will be sent via Supabase's default path instead. That fallback only
> works if you also configured one of Supabase's built-in SMS providers
> (Twilio etc.) on the project. For dev, configure the hook + leave
> `SMS_PROVIDER` unset; you'll see OTPs in your terminal.

### 2c. Customize OTP/expiry (optional)

Authentication → Email Templates — branding for the email link
Authentication → Phone Auth → OTP length / expiry — default 6 / 60s.
Raise expiry to 300s if Mongolian carrier latency is a problem.

---

## 3. Environment variables

### Backend (`backend/.env`)

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh...

# Upstash (optional in dev — when unset, rate limits are skipped)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Send SMS Hook
SMS_HOOK_SECRET=v1,whsec_<base64>   # match the dashboard value verbatim

# SMS provider — leave unset to log OTPs to the console
SMS_PROVIDER=
# Optional per-provider creds (only the SMS_PROVIDER you pick uses these)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
MOBICOM_API_KEY=
MOBICOM_SENDER=
SKYTEL_API_KEY=
SKYTEL_SENDER=
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

The browser only ever sees the anon key; the service key never leaves the
backend.

---

## 4. Switching on a real SMS provider later

Everything is wired so swapping providers is a **config change**, never a
code change. The provider-agnostic dispatcher lives in
`backend/src/lib/sms.ts` and switches on `SMS_PROVIDER`:

| `SMS_PROVIDER`  | Effect                                             | Extra env vars                                                                                          |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| _unset_ / `dev` | Log OTP to backend console — useful for local dev. | none                                                                                                    |
| `twilio`        | Send via Twilio REST. Implemented.                 | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (E.164 number or `MG…` Messaging Service SID). |
| `mobicom`       | Stubbed — implement in `sendViaMobicom`.           | `MOBICOM_API_KEY`, `MOBICOM_SENDER`.                                                                    |
| `skytel`        | Stubbed — implement in `sendViaSkytel`.            | `SKYTEL_API_KEY`, `SKYTEL_SENDER`.                                                                      |

### Steps to enable Twilio for production

1. Supabase Dashboard → Authentication → Hooks → Send SMS Hook is enabled
   and pointing at `{PUBLIC_BACKEND_URL}/api/internal/sms-hook`.
2. On the backend host, set:
   - `SMS_PROVIDER=twilio`
   - `TWILIO_ACCOUNT_SID=AC...`
   - `TWILIO_AUTH_TOKEN=...`
   - `TWILIO_FROM=+1...` _(or `MGxxxx...` for a Messaging Service)_
3. Restart the backend.

### Steps to enable a Mongolian aggregator (Mobicom or SkyTel)

1. Get API credentials + sender ID from the carrier.
2. Open `backend/src/lib/sms.ts` and fill in the body of `sendViaMobicom`
   or `sendViaSkytel`. The function must:
   - Call the carrier's REST endpoint with the message + recipient.
   - Throw on failure (so the hook returns 502 and Supabase will retry).
   - Return `{ ok: true, provider, messageId? }` on success.
3. Set `SMS_PROVIDER=mobicom` (or `skytel`) plus the corresponding API key
   - sender env vars and restart the backend.

No frontend, schema, or auth-route changes are ever needed to swap
providers — only `lib/sms.ts` and the env vars touch the change.

---

## 5. Rate limiting (Upstash Redis)

`POST /api/auth/register/phone`, `/register/email`, and `/resend-code` are
rate-limited via `@upstash/ratelimit` sliding-window counters:

| Scope                           | Limit          | Reason                                                   |
| ------------------------------- | -------------- | -------------------------------------------------------- |
| Per identifier (phone or email) | **3 / 10 min** | Stops a single number/inbox from being pinned with OTPs. |
| Per IP                          | **5 / 10 min** | Second floor against scripted abuse across identifiers.  |

If `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` are unset, rate-limiting is
**silently skipped** so local dev isn't blocked. Set them in production.

Exceeded limits return `429` with a `Retry-After` header and
`{ ok: false, error: "rate_limited", retryAfterSeconds, scope }`.

---

## 6. Phone format

Accepted user inputs (server validation in `backend/src/routes/auth.ts`):

- `+97699112233` — preferred (E.164).
- `99112233` — also accepted; auto-prefixed with `+976`.

Mongolian mobile numbers are 8 digits starting with `6`, `7`, `8`, or `9`.

---

## 7. Endpoints

| Method | Path                       | Body                            | Notes                                                                                                                                       |
| ------ | -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register/phone` | `{ fullName, phone, password }` | Rate-limited. Triggers SMS OTP.                                                                                                             |
| POST   | `/api/auth/register/email` | `{ fullName, email, password }` | Rate-limited. Triggers Supabase verification email.                                                                                         |
| POST   | `/api/auth/verify-phone`   | `{ phone, code }`               | Returns `{ session, user }`; frontend hydrates `supabase-js` session.                                                                       |
| POST   | `/api/auth/login`          | `{ identifier, password }`      | `identifier` is phone or email. Returns 403 `not_verified` if account isn't confirmed yet, 403 `account_deleted` for soft-deleted accounts. |
| POST   | `/api/auth/resend-code`    | `{ identifier }`                | Re-sends OTP (phone) or verification email (gmail). Rate-limited.                                                                           |
| POST   | `/api/auth/logout`         | _(uses Bearer)_                 | Best-effort server signout.                                                                                                                 |
| GET    | `/api/auth/me`             | _(uses Bearer)_                 | Returns the current user + role + confirmation timestamps.                                                                                  |
| DELETE | `/api/auth/account`        | _(uses Bearer)_                 | Soft-deletes: bans the auth user, anonymizes `public.users`, leaves tickets + payments intact.                                              |
| POST   | `/api/internal/sms-hook`   | Supabase hook payload           | Authenticated by Supabase's standard-webhooks signature using `SMS_HOOK_SECRET`.                                                            |

---

## 8. Protected routes

The page-level hooks `useRequireAuth` / `useRequireAdmin` in
`frontend/src/auth.tsx` already enforce this — they redirect to
`/login?next=…` if the session is missing or unverified.

Routes that require a verified account:

- `/watch`
- `/profile`
- `/settings`
- `/orders/:code`
- `/admin/*` (additionally requires `users.role = 'admin'`)

`/login`, `/register`, and `/` use a `GuestOnly` wrapper that bounces
already-signed-in users to `/watch` (or `/admin` for admins).

---

## 9. Promoting a user to admin

There is no UI for this yet. Run once against your database:

```sql
update public.users set role = 'admin' where phone = '+97699112233';
-- or for an email-registered admin
update public.users set role = 'admin' where email = 'you@gmail.com';
```

The `users_self_update` RLS policy explicitly prevents users from changing
their own role — only the service role can.

---

## 10. Account deletion (soft-delete)

`DELETE /api/auth/account` is intentionally **soft**:

- `public.users.deleted_at` is set to `now()`.
- `phone`, `email`, and `full_name` on `public.users` are wiped.
- The Supabase auth user is banned (100-year `ban_duration`) so the
  credentials can't be reused to log back in.
- The `public.users` row itself stays in place so `tickets.user_id` and
  payments FKs remain valid — purchase history is preserved.
- `tickets.user_id` was changed to `ON DELETE RESTRICT` in migration
  `0003_users_profile_fields.sql` so an accidental hard-delete blocks
  rather than nukes purchase records.

This means once an account is deleted there is no way to "un-delete"
through the UI — re-registration would create a fresh `auth.users` row
with a new UUID, not the same one. That's a deliberate decision: tickets
are tied to the original UUID, so a fresh re-registration legitimately
gets a fresh purchase history.

---

## 11. Troubleshooting

| Symptom                                             | Likely cause                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `503 supabase_not_configured` on register/login     | `SUPABASE_URL` / `SUPABASE_ANON_KEY` missing on backend.                                                                                         |
| `429 rate_limited` immediately                      | Already hit 3 attempts on this number/email — wait 10 min or use a different identifier.                                                         |
| `403 not_verified` on login                         | Account exists but the OTP / email link was never confirmed. The frontend automatically swaps to the verification step + offers resend.          |
| `401 otp_invalid` after entering code               | OTP expired (default 60 s) or the wrong code. Use "Дахин код илгээх".                                                                            |
| Backend logs OTP but Supabase says SMS was sent     | Send SMS Hook is correctly intercepting — the "sent" status from Supabase just means "handed off to hook"; the hook decides what to actually do. |
| SMS never arrives in production                     | Confirm `SMS_PROVIDER` is set and the provider's API responded `2xx`. Twilio errors appear in their dashboard logs.                              |
| `401 invalid_signature` on `/api/internal/sms-hook` | The dashboard secret doesn't match `SMS_HOOK_SECRET`. Re-copy the secret verbatim (include the `v1,whsec_` prefix).                              |
