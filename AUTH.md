# Authentication setup — phone OTP

Central Stadium 360 uses **Supabase Auth** with **phone-based one-time
passwords** (SMS OTP). Mongolian users sign up and log in by phone, no email.

This document describes the one-time setup needed in the Supabase dashboard and
the environment variables required by the backend and frontend.

---

## 1. Pick an SMS provider

Supabase does **not** send SMS itself — it integrates with an external SMS
gateway. For Mongolia, supported options (as of 2025) are:

| Provider | Mongolia coverage | Notes |
|---|---|---|
| **Twilio** | ✅ via international SMS | Easiest, but per-message cost in MN is high. |
| **MessageBird** | ✅ | Solid coverage, requires verified sender ID. |
| **Vonage (Nexmo)** | ✅ | Similar to MessageBird. |
| **Textlocal** | ⚠ India-only | Don't use. |
| **Local Mongolian aggregator** (Mobicom / SkyTel) | ✅ best deliverability | Requires Supabase **custom SMS provider** (HTTP hook) — not a built-in option. |

For development we recommend Twilio's trial account (free credit). For
production with serious volume, negotiate with a local aggregator and use the
Supabase SMS webhook hook.

---

## 2. Configure the provider in Supabase

In the Supabase dashboard for your project:

1. **Authentication → Providers → Phone** — toggle on.
2. **Authentication → SMS Provider** — pick your provider (e.g. Twilio).
3. Paste the provider credentials:
   - **Twilio:** Account SID, Auth Token, Message Service SID (or From number).
   - **MessageBird:** Access Key, Originator.
   - **Vonage:** API Key, API Secret, From.
4. **Save**. Supabase stores the credentials server-side — they never leave the
   dashboard. **The application code does NOT receive or hold provider keys.**
5. Optionally tune **OTP length** (default 6) and **OTP expiry** (default 60s
   in Supabase, raise to 300s if you expect Mongolian carrier latency).

---

## 3. Environment variables

The backend and frontend each need a slice of the Supabase keys. Copy values
from **Supabase dashboard → Project Settings → API**.

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJh...           # used to call signInWithOtp / verifyOtp
SUPABASE_SERVICE_KEY=eyJh...        # used for admin DB queries (bypasses RLS)
UPSTASH_REDIS_URL=https://<host>.upstash.io
UPSTASH_REDIS_TOKEN=AX...            # for OTP rate-limiting
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...      # safe to ship to the browser
```

The frontend uses the anon key only to **persist the session** locally
(`supabase.auth.setSession`). All OTP send / verify calls go through our
backend so we can rate-limit before the SMS is paid for.

---

## 4. Rate limiting (Upstash Redis)

`POST /api/auth/request-otp` is rate-limited:

| Scope | Limit | Source |
|---|---|---|
| Per phone | **3 / 10 min** | Prevents pinning one number with a flood of SMS. |
| Per IP | **5 / 10 min** | Defense against scripted abuse across phones. |

Both limits are enforced via `@upstash/ratelimit` sliding-window counters. If
either limit is exceeded, the endpoint returns `429` with a `Retry-After`
header and `{ ok: false, error: "rate_limited", retryAfterSeconds, scope }`.

If `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` are unset (e.g. local dev),
rate-limiting is **skipped silently** so development isn't blocked.

---

## 5. Phone format

Accepted inputs:

- `+97699112233`  ← preferred (E.164)
- `99112233`      ← also accepted; auto-prefixed with `+976`

Mongolian mobile numbers are 8 digits, starting with `8` or `9`. Validation
lives in `backend/src/routes/auth.ts` (zod schema).

---

## 6. Endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/request-otp` | `{ phone }` | Rate-limited. Triggers SMS. |
| POST | `/api/auth/verify-otp`  | `{ phone, code }` | Returns `{ session, user }`; frontend hydrates supabase-js session. |
| POST | `/api/auth/logout`      | (uses Bearer) | Best-effort server signout. |
| GET  | `/api/auth/me`          | (uses Bearer) | Returns the current user + role from `public.users`. |

The frontend wraps these in `useAuth()` (`frontend/src/lib/auth.tsx`) — call
`requestOtp(phone)`, then `verifyOtp(phone, code)`, then read `user` from the
hook.

---

## 7. Protected routes

In `frontend/src/App.tsx`:

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/watch" element={<Watch />} />
  <Route path="/orders/:orderId" element={<OrderDetail />} />
  <Route path="/profile" element={<Profile />} />
</Route>

<Route element={<ProtectedRoute requireRole="admin" />}>
  <Route path="/admin" element={<Admin />} />
</Route>
```

`ProtectedRoute` redirects to `/login` and preserves the original path in
location state, so the user lands back where they were after verifying.

---

## 8. Promoting a user to admin

There is no UI for this yet. Run once against your database:

```sql
update public.users set role = 'admin' where phone = '+97699112233';
```

The `users_self_update` RLS policy explicitly **prevents** users from changing
their own role — only the service role can.

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `503 supabase_not_configured` on request-otp | `SUPABASE_URL` / `SUPABASE_ANON_KEY` not set on backend. |
| `429 rate_limited` immediately | Test phone already used 3+ times — wait or change number. |
| `401 unauthorized` on `/me` | Access token expired; frontend will auto-refresh on next request via `supabase-js`. |
| SMS never arrives | Provider not enabled in Supabase dashboard, or recipient number is on a blocked network. Check Twilio/MessageBird logs. |
| `otp_invalid` after correct code | OTP expired (default 60s) — re-request. |
