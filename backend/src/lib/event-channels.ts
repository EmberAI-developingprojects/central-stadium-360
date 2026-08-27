/**
 * Per-surface publish flags — `events.show_on_web` / `events.show_on_kiosk`.
 *
 * An event row feeds two independent storefronts: the website (live/replay
 * stream tickets) and the stadium kiosk (printed zone admissions). These flags
 * decide which of the two an event appears on; migration 0029 adds them with
 * both defaulting to `true`.
 *
 * Because the backend can be deployed ahead of the migration, filtering on a
 * column that does not exist yet would 500 the storefront. Every read goes
 * through `withChannelFallback`, which retries once without the flags and then
 * stays degraded for the rest of the process lifetime.
 */

/** Extra columns to append to a `select()` list when the flags exist. */
export const CHANNEL_COLS = "show_on_web,show_on_kiosk";

/** False once a query has proved the flags are not in the schema yet. */
export function channelColumnsReady(): boolean {
  return channelColumnsAvailable !== false;
}

/** Drops the flags from a write payload so a degraded insert/update succeeds. */
export function stripChannelFields<T extends Record<string, unknown>>(
  payload: T,
): T {
  const {
    show_on_web: _w,
    show_on_kiosk: _k,
    ...rest
  } = payload as T & { show_on_web?: unknown; show_on_kiosk?: unknown };
  return rest as T;
}

type QueryLike<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

let channelColumnsAvailable: boolean | null = null;

function isMissingChannelColumn(
  err: { code?: string; message?: string } | null,
): boolean {
  if (!err) return false;
  // Matched on the column name, not on the bare 42703 code — callers also
  // degrade on other missing columns (title_en/description_en) and must not
  // have those mistaken for a missing flag.
  const msg = typeof err.message === "string" ? err.message : "";
  return msg.includes("show_on_web") || msg.includes("show_on_kiosk");
}

/**
 * Runs `build(true)`; if the flags turn out to be missing from the schema,
 * re-runs it as `build(false)` so callers can drop the filter/column instead of
 * failing. Later calls skip the doomed first attempt.
 */
export async function withChannelFallback<T>(
  build: (withChannels: boolean) => PromiseLike<QueryLike<T>>,
): Promise<QueryLike<T>> {
  const first = await build(channelColumnsAvailable !== false);
  if (channelColumnsAvailable === false) return first;
  if (!isMissingChannelColumn(first.error)) {
    if (!first.error) channelColumnsAvailable = true;
    return first;
  }
  channelColumnsAvailable = false;
  console.warn(
    "[event-channels] show_on_web/show_on_kiosk missing — run migration 0029; " +
      "until then every event stays published to both the web and the kiosk",
  );
  return build(false);
}

/**
 * `true` unless the row explicitly opts out — an undefined flag means the
 * migration has not landed yet, which is the pre-split "published everywhere"
 * behaviour.
 */
export function publishedOn(flag: boolean | null | undefined): boolean {
  return flag !== false;
}
