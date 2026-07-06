import { Hono } from "hono";
import type { AuthEnv } from "../middleware/require-user";
import { requireUser } from "../middleware/require-user";
import { markUserViewed } from "../lib/tickets";
import { getSupabaseAdmin } from "../lib/supabase";

const watch = new Hono<AuthEnv>();

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

watch.get("/token", requireUser, (c) => {
  const user = c.get("user");
  if (user?.id) markUserViewed(user.id).catch(() => {});
  const urls = buildCamUrls();
  const cams: WatchCam[] = CAM_DEFS.map((cam, i) => ({
    ...cam,
    hlsUrl: urls[i]!.url,
  }));
  return c.json({ ok: true, data: { cams } } as const);
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
  const probes = await Promise.all(cams.map((c) => probeHls(c.id, c.url)));
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
