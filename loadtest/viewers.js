// HLS live-viewer load test — models the real data-plane cost of a viewer:
//   auth -> GET /api/watch/token -> repeatedly pull the .m3u8 manifest ->
//   download the newest media segment(s) for the session duration.
//
// The existing loadtest.js only exercises JSON control-plane endpoints and never
// touches the Wowza/CDN origin, so it under-reports real viewer load. This script
// targets the segment delivery path, which is what actually saturates at scale.
//
// USAGE (ramp 1k -> 15k held viewers):
//   BASE_URL=https://api.example.com \
//   TOKENS="jwt1,jwt2,jwt3,..." \
//   k6 run --env STAGE=full loadtest/viewers.js
//
// Origin-only mode (skip auth, hit an HLS master URL directly to test CDN/Wowza):
//   HLS_URL="https://cdn.example.com/live/cam1/playlist.m3u8" \
//   k6 run --env STAGE=full loadtest/viewers.js
//
// ENV:
//   BASE_URL   API base (default http://localhost:3000)
//   TOKENS     comma-separated Supabase JWTs; VUs round-robin over them.
//              At 15k VUs you do NOT need 15k tokens — a few hundred reused is fine.
//   AUTH_TOKEN single JWT (fallback if TOKENS unset)
//   HLS_URL    bypass auth+token and pull this master playlist directly
//   CAMS       how many of the 4 cameras each viewer pulls concurrently (default 1)
//   STAGE      smoke | mid | full  (default mid)
//   SESSION    seconds a viewer stays watching (default 120)

import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const HLS_URL = __ENV.HLS_URL || "";
const TOKENS = (__ENV.TOKENS || __ENV.AUTH_TOKEN || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const CAMS = Math.max(1, Math.min(4, parseInt(__ENV.CAMS || "1", 10)));
const SESSION = parseInt(__ENV.SESSION || "120", 10);

const manifestLatency = new Trend("hls_manifest_ms", true);
const segmentLatency = new Trend("hls_segment_ms", true);
const segmentBytes = new Counter("hls_segment_bytes");
const stall = new Rate("hls_stall"); // manifest/segment fetch failed mid-session

// Viewer-count stages. `full` ramps 1k -> 15k and holds, matching the brief's
// 1,000-15,000 concurrent target. Uses ramping-vus so each VU = one held viewer.
const STAGES = {
  smoke: [
    { duration: "20s", target: 20 },
    { duration: "40s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  mid: [
    { duration: "1m", target: 1000 },
    { duration: "2m", target: 3000 },
    { duration: "3m", target: 3000 },
    { duration: "30s", target: 0 },
  ],
  full: [
    { duration: "2m", target: 1000 },
    { duration: "3m", target: 5000 },
    { duration: "3m", target: 10000 },
    { duration: "4m", target: 15000 },
    { duration: "5m", target: 15000 }, // hold at peak
    { duration: "1m", target: 0 },
  ],
};
const stage = __ENV.STAGE || "mid";

export const options = {
  scenarios: {
    viewers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: STAGES[stage] || STAGES.mid,
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    hls_manifest_ms: ["p(95)<1500", "p(99)<3000"],
    hls_segment_ms: ["p(95)<2500", "p(99)<5000"],
    hls_stall: ["rate<0.02"],
    http_req_failed: ["rate<0.03"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(95)", "p(99)", "max"],
  discardResponseBodies: false,
};

// Resolve the manifest URL(s) this VU will pull. Either a direct HLS_URL, or via
// the authenticated /api/watch/token flow. Runs once per VU iteration start.
function resolveManifests() {
  if (HLS_URL) return [HLS_URL];
  if (TOKENS.length === 0) {
    fail(
      "No HLS_URL and no TOKENS/AUTH_TOKEN provided — cannot reach /api/watch/token (401).",
    );
  }
  const token = TOKENS[(__VU - 1) % TOKENS.length];
  const res = http.get(`${BASE}/api/watch/token`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { endpoint: "watch_token" },
    timeout: "30s",
  });
  if (
    !check(res, { "watch/token 2xx": (r) => r.status >= 200 && r.status < 300 })
  ) {
    return [];
  }
  let cams = [];
  try {
    cams = (res.json("data.cams") || []).filter((c) => c && c.hlsUrl);
  } catch (_e) {
    cams = [];
  }
  return cams.slice(0, CAMS).map((c) => c.hlsUrl);
}

// Parse an HLS playlist body into absolute URIs (both variant playlists in a
// master, and media segments in a media playlist).
function parseUris(body, baseUrl) {
  const out = [];
  if (!body) return out;
  const dir = baseUrl.slice(0, baseUrl.lastIndexOf("/") + 1);
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("http")) out.push(line);
    else out.push(dir + line);
  }
  return out;
}

function pullManifest(url) {
  const res = http.get(url, { tags: { endpoint: "manifest" }, timeout: "20s" });
  manifestLatency.add(res.timings.duration);
  const ok = res.status >= 200 && res.status < 300;
  if (!ok) return null;
  return res.body;
}

export default function () {
  const masters = resolveManifests();
  if (masters.length === 0) {
    stall.add(true);
    sleep(2);
    return;
  }

  // For each camera: resolve master -> a media playlist once, then poll it.
  const mediaPlaylists = masters.map((m) => {
    const body = pullManifest(m);
    if (!body) return null;
    const uris = parseUris(body, m);
    const variant = uris.find((u) => u.includes(".m3u8"));
    return variant || m; // if it was already a media playlist, poll it directly
  });

  const seen = {};
  const deadline = SESSION;
  let elapsed = 0;

  // Live playback loop: re-fetch the media playlist on ~segment cadence and
  // download any newly-appeared segments, like a real player filling its buffer.
  while (elapsed < deadline) {
    for (const pl of mediaPlaylists) {
      if (!pl) {
        stall.add(true);
        continue;
      }
      const body = pullManifest(pl);
      if (!body) {
        stall.add(true);
        continue;
      }
      stall.add(false);
      const segs = parseUris(body, pl).filter((u) => !u.includes(".m3u8"));
      // Download only the newest 1-2 segments we haven't fetched (live edge).
      const fresh = segs.filter((s) => !seen[s]).slice(-2);
      for (const s of fresh) {
        seen[s] = true;
        const r = http.get(s, { tags: { endpoint: "segment" }, timeout: "20s" });
        segmentLatency.add(r.timings.duration);
        check(r, { "segment 2xx": (x) => x.status >= 200 && x.status < 300 });
        if (r.body) segmentBytes.add(r.body.length);
      }
    }
    // Typical HLS target-duration cadence; jitter so VUs don't fetch in lockstep.
    const wait = 4 + Math.random() * 2;
    sleep(wait);
    elapsed += wait;
  }
}
