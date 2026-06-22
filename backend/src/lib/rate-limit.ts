const WINDOW_MS = 10 * 60 * 1000;
const ID_MAX = 3;
const IP_MAX = 5;

type Hits = { times: number[] };

const idHits = new Map<string, Hits>();
const ipHits = new Map<string, Hits>();

export type RateLimitResult = { success: boolean; reset: number };

function check(
  store: Map<string, Hits>,
  key: string,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const entry = store.get(key) ?? { times: [] };
  entry.times = entry.times.filter((t) => t > cutoff);
  if (entry.times.length >= max) {
    store.set(key, entry);
    return { success: false, reset: entry.times[0]! + WINDOW_MS };
  }
  entry.times.push(now);
  store.set(key, entry);
  return { success: true, reset: now + WINDOW_MS };
}

export function checkIdentifierLimit(key: string): RateLimitResult {
  return check(idHits, key, ID_MAX);
}

export function checkIpLimit(key: string): RateLimitResult {
  return check(ipHits, key, IP_MAX);
}
