/**
 * Minimal idempotency guard so a retried request (flaky network, double tap)
 * never double-charges a card or double-issues a fiscal receipt. Keyed on the
 * caller's order reference / Idempotency-Key.
 *
 * In-memory for now — fine for a single kiosk process. TODO before production:
 * persist to disk/SQLite so a bridge restart mid-transaction still dedupes.
 */
type Entry<T> = { status: 'pending' | 'done'; result?: T };

const store = new Map<string, Entry<unknown>>();

/**
 * Run `fn` at most once per `key`. Concurrent/duplicate calls with the same key
 * get the first call's result instead of re-executing the side effect.
 */
export async function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = store.get(key) as Entry<T> | undefined;
  if (existing?.status === 'done') return existing.result as T;
  if (existing?.status === 'pending') {
    // Simple wait-loop for an in-flight duplicate; good enough for kiosk volume.
    while ((store.get(key) as Entry<T>).status === 'pending') {
      await new Promise((r) => setTimeout(r, 50));
    }
    return (store.get(key) as Entry<T>).result as T;
  }
  store.set(key, { status: 'pending' });
  try {
    const result = await fn();
    store.set(key, { status: 'done', result });
    return result;
  } catch (e) {
    store.delete(key); // allow a genuine retry after a hard failure
    throw e;
  }
}
