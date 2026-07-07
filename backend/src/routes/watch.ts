import { Hono } from "hono";
import type { AuthEnv } from "../middleware/require-user";
import { requireUser } from "../middleware/require-user";
import { getValidLiveTicket, markUserViewed } from "../lib/tickets";
import { admitDevice, releaseDevice } from "../lib/sessions";
import { isLiveSigningConfigured, signLiveUrl } from "../lib/cloudfront";
import { getSupabaseAdmin } from "../lib/supabase";

// Sign a live camera URL with CloudFront when LIVE_SIGN_URLS is on; otherwise
// (and on any signing error) serve the raw URL so playback never breaks.
function signCamUrl(url: string | null): string | null {
  if (!url || !isLiveSigningConfigured()) return url;
  try {
    return signLiveUrl(url);
  } catch (err) {
    console.warn(
      "[watch] live URL signing failed, serving unsigned:",
      (err as Error).message,
    );
    return url;
  }
}

const watch = new Hono<AuthEnv>();

// Concurrent-device enforcement (tier caps) is dormant until WATCH_ENFORCE=1.
// While off, /token stays open to any authed user so the live preview keeps
// working; once tickets are seeded in prod, flip the flag to enforce tier caps.
function enforceWatch(): boolean {
  return process.env.WATCH_ENFORCE === "1";
}

// Read event_id/device_id from JSON body first, falling back to the query string
// (so a keepalive/beacon release with an empty body can still pass them as ?params).
async function readWatchParams(
  c: import("hono").Context,
): Promise<{ eventId: string | null; deviceId: string | null }> {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fromBody = (k: string) =>
    typeof body[k] === "string" ? (body[k] as string) : null;
  return {
    eventId: fromBody("event_id") ?? c.req.query("event_id") ?? null,
    deviceId: fromBody("device_id") ?? c.req.query("device_id") ?? null,
  };
}

type CamType = "normal" | "360";

export type WatchCam = {
  id: string;
  label: string;
  sub: string;
  type: CamType;
  hlsUrl: string | null;
};

const CAM_DEFS: Omit<WatchCam, "hlsUrl">[] = [
  { id: "cam1", label: "cam1", sub: "CAM 01 · 360°", type: "360" },
  { id: "cam2", label: "cam2", sub: "CAM 02 · 360°", type: "360" },
  { id: "cam3", label: "cam3", sub: "CAM 03 · 360°", type: "360" },
  { id: "cam4", label: "cam4", sub: "CAM 04 · 360°", type: "360" },
];

// Resolve a camera's HLS playback URL from env, in priority order:
//   1. WOWZA_CAM{n}_URL   — canonical per-camera override
//   2. AWS_IVS_CAM{n}_URL — legacy key, kept so older .env files keep working
//   3. WOWZA_HLS_URL      — a single feed fanned out to every camera (1-feed setup)
// Blank / whitespace-only values are treated as unset.
// A blank/whitespace-only env var must be treated as UNSET so the `??` chain can
// fall through to the next candidate (an empty string is not null/undefined and
// would otherwise short-circuit the fallback).
function envUrl(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

function resolveCamUrl(camId: string): string | null {
  const key = camId.toUpperCase();
  return (
    envUrl(`WOWZA_${key}_URL`) ??
    envUrl(`AWS_IVS_${key}_URL`) ??
    envUrl("WOWZA_HLS_URL") ??
    null
  );
}

function buildCamUrls(): { id: string; url: string | null }[] {
  return CAM_DEFS.map((cam) => ({ id: cam.id, url: resolveCamUrl(cam.id) }));
}

/**
 * One-line summary of live-stream config, logged at server boot so a
 * misconfiguration surfaces in logs instead of a silently-empty player.
 */
export function logStreamConfig(): void {
  const configured = CAM_DEFS.map((c) => resolveCamUrl(c.id)).filter(
    (u): u is string => u !== null,
  );
  if (configured.length === 0) {
    console.warn(
      "[watch] No live camera URLs configured. Set WOWZA_HLS_URL (single feed) " +
        "or WOWZA_CAM1_URL..WOWZA_CAM4_URL — /api/watch/token will return no playable streams.",
    );
    return;
  }
  const hasInsecure = configured.some((u) => u.startsWith("http://"));
  console.log(
    `[watch] Live stream: ${configured.length}/${CAM_DEFS.length} cameras configured.` +
      (hasInsecure
        ? " WARNING: an http:// URL is blocked as mixed content on an https:// site — front the origin with HTTPS/CDN for production."
        : ""),
  );
}

export async function getViewedUserCount(): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const { count } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .not("first_viewed_at", "is", null);
  return count ?? 0;
}

watch.get("/token", requireUser, async (c) => {
  const user = c.get("user");
  if (user?.id) markUserViewed(user.id).catch(() => {});

  if (enforceWatch()) {
    const eventId = c.req.query("event_id");
    const deviceId = c.req.query("device_id");
    if (!eventId || !deviceId) {
      return c.json(
        { ok: false, error: "event_and_device_required" } as const,
        400,
      );
    }
    const ticket = await getValidLiveTicket(user.id, eventId);
    if (!ticket) {
      return c.json({ ok: false, error: "no_ticket" } as const, 403);
    }
    const admit = await admitDevice(ticket.id, deviceId, ticket.max_devices);
    if (!admit.ok) {
      if (admit.error === "device_limit_reached") {
        return c.json(
          {
            ok: false,
            error: "device_limit_reached",
            active: admit.active,
            limit: admit.limit,
          } as const,
          403,
        );
      }
      return c.json({ ok: false, error: "internal_error" } as const, 500);
    }
  }

  const urls = buildCamUrls();
  const cams: WatchCam[] = CAM_DEFS.map((cam, i) => ({
    ...cam,
    hlsUrl: signCamUrl(urls[i]!.url),
  }));
  return c.json({ ok: true, data: { cams } } as const);
});

// Keep an admitted device's tier slot alive. The player calls this on an
// interval; a device that stops heartbeating goes stale (~90s) and frees its
// slot. Re-runs admitDevice so a device that lost its slot (e.g. flag flipped
// on mid-session, or evicted) learns it's now blocked. No-op while enforcement
// is off so the preview path stays cheap.
watch.post("/heartbeat", requireUser, async (c) => {
  if (!enforceWatch()) {
    return c.json({ ok: true, data: { active: 0 } } as const);
  }
  const user = c.get("user");
  const { eventId, deviceId } = await readWatchParams(c);
  if (!eventId || !deviceId) {
    return c.json(
      { ok: false, error: "event_and_device_required" } as const,
      400,
    );
  }
  const ticket = await getValidLiveTicket(user.id, eventId);
  if (!ticket) {
    return c.json({ ok: false, error: "no_ticket" } as const, 403);
  }
  const admit = await admitDevice(ticket.id, deviceId, ticket.max_devices);
  if (!admit.ok) {
    if (admit.error === "device_limit_reached") {
      return c.json(
        {
          ok: false,
          error: "device_limit_reached",
          active: admit.active,
          limit: admit.limit,
        } as const,
        403,
      );
    }
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  return c.json({ ok: true, data: { active: admit.active } } as const);
});

// Free a device's tier slot immediately on stream stop / unmount (best-effort;
// staleness would free it anyway). Safe to call regardless of the flag.
watch.post("/release", requireUser, async (c) => {
  const user = c.get("user");
  const { eventId, deviceId } = await readWatchParams(c);
  if (eventId && deviceId) {
    const ticket = await getValidLiveTicket(user.id, eventId);
    if (ticket) await releaseDevice(ticket.id, deviceId);
  }
  return c.json({ ok: true, data: {} } as const);
});

type CamProbe = {
  id: string;
  hasUrl: boolean;
  status: number | null;
  ok: boolean;
  error?: string;
};
type StatusCache = {
  live: boolean;
  checkedAt: number;
  startedAt: number | null;
  probes: CamProbe[];
};
let statusCache: StatusCache | null = null;
const STATUS_TTL_MS = 25_000;

async function probeHls(
  id: string,
  url: string | null,
): Promise<CamProbe> {
  if (!url) return { id, hasUrl: false, status: null, ok: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
    });
    // A 200 alone isn't proof of a live stream — an error page or a stopped
    // publisher can still return 200. Confirm the body is an actual HLS manifest.
    const body = res.ok ? await res.text().catch(() => "") : "";
    clearTimeout(timer);
    const ok = res.ok && body.includes("#EXTM3U");
    return { id, hasUrl: true, status: res.status, ok };
  } catch (err) {
    return {
      id,
      hasUrl: true,
      status: null,
      ok: false,
      error: (err as Error).message,
    };
  }
}

watch.get("/status", requireUser, async (c) => {
  const now = Date.now();
  if (statusCache && now - statusCache.checkedAt < STATUS_TTL_MS) {
    return c.json({
      ok: true,
      data: {
        live: statusCache.live,
        checkedAt: statusCache.checkedAt,
        startedAt: statusCache.startedAt,
        probes: statusCache.probes,
      },
    } as const);
  }

  const cams = buildCamUrls();
  // Sign before probing too — a signing-required origin 403s an unsigned probe.
  const probes = await Promise.all(
    cams.map((c) => probeHls(c.id, signCamUrl(c.url))),
  );
  const live = probes.some((p) => p.ok);
  const prevLive = statusCache?.live ?? false;
  const prevStart = statusCache?.startedAt ?? null;
  let startedAt: number | null = null;
  if (live) startedAt = prevLive && prevStart ? prevStart : now;
  statusCache = { live, checkedAt: now, startedAt, probes };
  return c.json({
    ok: true,
    data: { live, checkedAt: now, startedAt, probes },
  } as const);
});

export default watch;
