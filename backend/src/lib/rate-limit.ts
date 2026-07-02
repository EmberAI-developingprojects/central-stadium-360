import { getSupabaseAdmin } from "./supabase";

const WINDOW_MS = 10 * 60 * 1000;
const WINDOW_SECONDS = WINDOW_MS / 1000;
const ID_MAX = 3;
const IP_MAX = 5;
const OTP_ID_MAX = 5;
const OTP_IP_MAX = 20;

export type RateLimitResult = { success: boolean; reset: number };

// In-memory fallback, used when Supabase is not configured (local dev) or
// the counter RPC fails. Per-instance only — the shared source of truth is
// the auth_rate_counters table.
type Hits = { times: number[] };
const memHits = new Map<string, Hits>();

function checkInMemory(key: string, max: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const entry = memHits.get(key) ?? { times: [] };
  entry.times = entry.times.filter((t) => t > cutoff);
  if (entry.times.length >= max) {
    memHits.set(key, entry);
    return { success: false, reset: entry.times[0]! + WINDOW_MS };
  }
  entry.times.push(now);
  memHits.set(key, entry);
  return { success: true, reset: now + WINDOW_MS };
}

type RateLimitRow = { allowed: boolean; reset_at: string };

async function hit(
  prefix: string,
  key: string,
  max: number,
): Promise<RateLimitResult> {
  const fullKey = `${prefix}:${key}`;
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.rpc("auth_rate_limit_hit", {
      p_key: fullKey,
      p_max: max,
      p_window_seconds: WINDOW_SECONDS,
    });
    const row = (Array.isArray(data) ? data[0] : data) as
      | RateLimitRow
      | null
      | undefined;
    if (!error && row) {
      return {
        success: row.allowed === true,
        reset: new Date(row.reset_at).getTime(),
      };
    }
  }
  return checkInMemory(fullKey, max);
}

export function checkIdentifierLimit(key: string): Promise<RateLimitResult> {
  return hit("id", key, ID_MAX);
}

export function checkIpLimit(key: string): Promise<RateLimitResult> {
  return hit("ip", key, IP_MAX);
}

// Separate buckets for OTP verification attempts: stricter than send limits
// per identifier, looser per IP so one NAT'd venue doesn't lock everyone out.
export function checkOtpIdentifierLimit(
  key: string,
): Promise<RateLimitResult> {
  return hit("otp-id", key, OTP_ID_MAX);
}

export function checkOtpIpLimit(key: string): Promise<RateLimitResult> {
  return hit("otp-ip", key, OTP_IP_MAX);
}
