export const CHANNEL_COLS = "show_on_web,show_on_kiosk";

export function channelColumnsReady(): boolean {
  return channelColumnsAvailable !== false;
}

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
  const msg = typeof err.message === "string" ? err.message : "";
  return msg.includes("show_on_web") || msg.includes("show_on_kiosk");
}

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

export function publishedOn(flag: boolean | null | undefined): boolean {
  return flag !== false;
}
