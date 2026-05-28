import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Anon Supabase client used from the backend to drive the GoTrue auth flows
 * (signInWithOtp, verifyOtp, getUser). Returns null if env is not configured.
 *
 * Each call to verifyOtp / getUser should use a *fresh* client when binding a
 * user JWT — see `withAccessToken` below.
 */
export function getSupabaseAnon(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  cached = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

/**
 * Create a per-request anon client whose Authorization header carries the
 * caller's access token. Used by /me to resolve the current user.
 */
export function getSupabaseForAccessToken(
  accessToken: string,
): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
