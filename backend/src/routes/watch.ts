import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../middleware/require-user";
import { requireUser } from "../middleware/require-user";
import { findBestLiveTicket, markUserViewed } from "../lib/tickets";
import { admitDevice, releaseDevice, touchSession } from "../lib/sessions";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  isStreamTokenConfigured,
  tokenizeStreamUrl,
} from "../lib/stream-token";

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

function resolveCamUrl(camId: string): string | null {
  const v = process.env[`WOWZA_${camId.toUpperCase()}_URL`]?.trim();
  return v ? v : null;
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
      "[watch] No live camera URLs configured. Set WOWZA_CAM1_URL..WOWZA_CAM4_URL " +
        "— /api/watch/token will return no playable streams.",
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
  if (!isStreamTokenConfigured()) {
    console.warn(
      "[watch] STREAM_TOKEN_SECRET is not set — playback URLs are handed out " +
        "UNSIGNED. Anyone who copies a stream URL can watch without a ticket. " +
        "Set the secret and deploy infra/cloudfront-live-token before production.",
    );
  }
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

const tokenQuerySchema = z.object({
  event_id: z.string().uuid(),
  device_id: z.string().min(8).max(128),
});

const LIVE_END_GRACE_MS = 10 * 60 * 1000;

async function isEventLiveNow(eventId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { data } = await admin
    .from("events")
    .select("start_time,live_start_at,live_end_at")
    .eq("id", eventId)
    .maybeSingle<{
      start_time: string | null;
      live_start_at: string | null;
      live_end_at: string | null;
    }>();
  if (!data) return false;
  const now = Date.now();
  const startIso = data.live_start_at ?? data.start_time;
  const start = startIso ? new Date(startIso).getTime() : NaN;
  if (Number.isNaN(start) || now < start) return false; // not started / upcoming
  const end = data.live_end_at ? new Date(data.live_end_at).getTime() : NaN;
  if (!Number.isNaN(end) && now > end + LIVE_END_GRACE_MS) return false; // ended
  return true;
}

watch.get("/token", requireUser, async (c) => {
  const user = c.get("user");

  let ticketId: string | null = null;
  let eventId: string | null = null;
  if (user.role !== "admin") {
    const parsed = tokenQuerySchema.safeParse({
      event_id: c.req.query("event_id"),
      device_id: c.req.query("device_id"),
    });
    if (!parsed.success) {
      return c.json({ ok: false, error: "invalid_input" } as const, 400);
    }
    const { event_id, device_id } = parsed.data;
    eventId = event_id;
    const ticket = await findBestLiveTicket(user.id, event_id);
    if (!ticket) {
      return c.json({ ok: false, error: "no_ticket" } as const, 403);
    }
    const admit = await admitDevice(
      ticket.id,
      device_id,
      ticket.max_devices ?? 1,
    );
    if (!admit.ok) {
      if (admit.error === "device_limit_reached") {
        return c.json(
          {
            ok: false,
            error: "device_limit_reached",
            active: admit.active,
            limit: admit.limit,
          } as const,
          409,
        );
      }
      return c.json({ ok: false, error: "internal_error" } as const, 500);
    }
    ticketId = ticket.id;
  }

  if (user.role !== "admin" && eventId && (await isEventLiveNow(eventId))) {
    markUserViewed(user.id).catch(() => {});
  }
  const urls = buildCamUrls();

  const cams: WatchCam[] = CAM_DEFS.map((cam, i) => ({
    ...cam,
    hlsUrl: urls[i]!.url ? tokenizeStreamUrl(urls[i]!.url!) : null,
  }));
  return c.json({ ok: true, data: { cams, ticket_id: ticketId } } as const);
});

const sessionBodySchema = z.object({
  ticket_id: z.string().uuid(),
  device_id: z.string().min(8).max(128),
});

async function parseOwnedSession(
  c: Context<AuthEnv>,
): Promise<{ ticketId: string; deviceId: string } | null> {
  const body = await c.req.json().catch(() => ({}));
  const parsed = sessionBodySchema.safeParse(body);
  if (!parsed.success) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const user = c.get("user");
  const { data } = await admin
    .from("tickets")
    .select("id")
    .eq("id", parsed.data.ticket_id)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!data) return null;
  return { ticketId: parsed.data.ticket_id, deviceId: parsed.data.device_id };
}

watch.post("/heartbeat", requireUser, async (c) => {
  const s = await parseOwnedSession(c);
  if (!s) return c.json({ ok: false, error: "invalid_input" } as const, 400);
  await touchSession(s.ticketId, s.deviceId);
  return c.json({ ok: true, data: { ok: true } } as const);
});

watch.post("/release", requireUser, async (c) => {
  const s = await parseOwnedSession(c);
  if (!s) return c.json({ ok: false, error: "invalid_input" } as const, 400);
  await releaseDevice(s.ticketId, s.deviceId);
  return c.json({ ok: true, data: { ok: true } } as const);
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

async function probeHls(id: string, rawUrl: string | null): Promise<CamProbe> {
  if (!rawUrl) return { id, hasUrl: false, status: null, ok: false };

  const url = tokenizeStreamUrl(rawUrl);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
    });

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
