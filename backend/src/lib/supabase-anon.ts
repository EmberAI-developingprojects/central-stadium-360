import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const realtime = { transport: WebSocket as never };

let cached: SupabaseClient | null = null;

export function getSupabaseAnon(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  cached = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime,
  });
  return cached;
}

export function getSupabaseForAccessToken(
  accessToken: string,
): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
