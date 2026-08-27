const store = new Map();
/**
 * Run `fn` at most once per `key`. Concurrent/duplicate calls with the same key
 * get the first call's result instead of re-executing the side effect.
 */
export async function once(key, fn) {
    const existing = store.get(key);
    if (existing?.status === 'done')
        return existing.result;
    if (existing?.status === 'pending') {
        // Simple wait-loop for an in-flight duplicate; good enough for kiosk volume.
        while (store.get(key).status === 'pending') {
            await new Promise((r) => setTimeout(r, 50));
        }
        return store.get(key).result;
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
//# sourceMappingURL=idempotency.js.map