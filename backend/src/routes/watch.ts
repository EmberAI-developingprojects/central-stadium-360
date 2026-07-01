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

function buildCamUrls(): { id: string; url: string | null }[] {
  return CAM_DEFS.map((cam) => {
    const rawUrl = process.env[`WOWZA_${cam.id.toUpperCase()}_URL`] ?? null;
    return { id: cam.id, url: rawUrl };
  });
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
    clearTimeout(timer);
    return { id, hasUrl: true, status: res.status, ok: res.ok };
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
