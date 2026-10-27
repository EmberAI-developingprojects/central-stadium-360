// Browser-side session for the backend's own auth: the access/refresh token
// pair lives in sessionStorage (per tab, like before), the access token is
// refreshed shortly before it expires, and listeners hear about sign-in/out.

export type StoredSession = {
  access_token: string;
  refresh_token: string;
  /** Unix seconds. */
  expires_at: number;
};

type Listener = (session: StoredSession | null) => void;

const STORAGE_KEY = "cs360.session";
// Written by the old Supabase client; its tokens no longer validate.
const LEGACY_KEY = "cs360.auth";
const REFRESH_MARGIN_SECONDS = 60;

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const listeners = new Set<Listener>();
let current: StoredSession | null = load();
let refreshing: Promise<StoredSession | null> | null = null;

function load(): StoredSession | null {
  try {
    sessionStorage.removeItem(LEGACY_KEY);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.access_token === "string" &&
      typeof parsed.refresh_token === "string" &&
      typeof parsed.expires_at === "number"
    ) {
      return parsed as StoredSession;
    }
  } catch {}
  return null;
}

function save(next: StoredSession | null) {
  current = next;
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  for (const fn of listeners) fn(next);
}

export function getStoredSession(): StoredSession | null {
  return current;
}

export function setSessionTokens(tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  expires_in: number | null;
}) {
  const expiresAt =
    tokens.expires_at ??
    Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600);
  save({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  });
}

export function clearSession() {
  save(null);
}

export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Exchange the refresh token for a new pair; clears the session if refused. */
export function refreshSession(): Promise<StoredSession | null> {
  if (refreshing) return refreshing;
  const session = current;
  if (!session) return Promise.resolve(null);
  refreshing = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: { session?: Parameters<typeof setSessionTokens>[0] };
      };
      if (res.ok && json.ok && json.data?.session) {
        setSessionTokens(json.data.session);
        return current;
      }
      // Only a definite rejection signs the user out; network blips keep the session.
      if (res.status === 401 || res.status === 400) clearSession();
      return null;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** A usable access token, refreshing it first when it is about to expire. */
export async function getAccessToken(): Promise<string | null> {
  const session = current;
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at - REFRESH_MARGIN_SECONDS > now) {
    return session.access_token;
  }
  const next = await refreshSession();
  return next?.access_token ?? null;
}
