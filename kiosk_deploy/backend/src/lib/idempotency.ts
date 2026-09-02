interface Entry {
  status: 'pending' | 'done';
  result?: unknown;
}

const store = new Map<string, Entry>();

/**
 * Run `fn` at most once per `key`. Concurrent/duplicate calls with the same key
 * get the first call's result instead of re-executing the side effect.
 */
export async function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = store.get(key);
  if (existing?.status === 'done')
    return existing.result as T;
  if (existing?.status === 'pending') {
    // Simple wait-loop for an in-flight duplicate; good enough for kiosk volume.
    while (store.get(key)!.status === 'pending') {
      await new Promise((r) => setTimeout(r, 50));
    }
    return store.get(key)!.result as T;
  }
  store.set(key, { status: 'pending' });
  try {
    const result = await fn();
    store.set(key, { status: 'done', result });
    return result;
  }
  catch (e) {
    store.delete(key); // allow a genuine retry after a hard failure
    throw e;
  }
}
