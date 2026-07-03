# Findings — Load Test (1k–15k) & Live Rewind/Seek

## A. Load testing 1,000–15,000 concurrent viewers

### Current state
- Harness: **k6**, in `loadtest/` (`smoke.js`, `loadtest-local.js` ≤500 VUs, `loadtest.js` ≤5,000 VUs).
- **Gap:** all existing scripts hit only JSON control-plane endpoints (`/api/health`, `/api/content`, `/api/events`, `/api/events/archived`). **None fetch HLS manifests or media segments** — so they do *not* measure real viewer load. A live viewer's cost is dominated by continuously pulling `.m3u8` + `.ts` segments from the **Wowza** origin (`WOWZA_CAM1_URL…WOWZA_CAM4_URL`, served via `GET /api/watch/token`, likely CloudFront-fronted — `@aws-sdk/cloudfront-signer` is a backend dep).

### What was added
`loadtest/viewers.js` — a new k6 script that models the real data-plane:
`auth → GET /api/watch/token → poll the media playlist on segment cadence → download the newest segments` for a configurable session, ramping **1k → 5k → 10k → 15k held viewers** (`STAGE=full`). Reports manifest latency, segment latency, segment bytes, and a `hls_stall` rate. Supports an **origin-only mode** (`HLS_URL=…`) to hit the Wowza/CDN edge directly without auth.

### How to run a real 1k–15k test (report template)
```bash
# 1) Provision a pool of test users / JWTs (a few hundred is enough — VUs reuse them).
# 2) Origin-only smoke first (no auth) to size the CDN:
HLS_URL="https://<wowza-or-cdn>/live/cam1/playlist.m3u8" k6 run --env STAGE=mid loadtest/viewers.js
# 3) Full authenticated ramp to 15k:
BASE_URL="https://api.<prod>" TOKENS="<jwt1>,<jwt2>,..." k6 run --env STAGE=full --env CAMS=1 loadtest/viewers.js
```

### Blockers to a *valid* 15k result (must resolve before trusting numbers)
1. **Auth pool** — `/api/watch/token` is behind `requireUser` (Supabase). Need pre-minted JWTs or a load-test bypass; current scripts would 401 on watch routes.
2. **Single k6 host is network/CPU-bound at 15k** held connections + segment downloads. Use **k6 distributed/cloud** or multiple load generators.
3. **Target the real origin/CDN, not localhost** — segment delivery, not the Hono API, is the bottleneck. Confirm with the streaming provider that synthetic pulls at this scale are permitted (avoid tripping DDoS protection / egress bills).
4. **Bandwidth budgeting** — 15,000 × segment bitrate (× up to 4 cameras) is large egress; track throughput, not just API latency. Decide whether a viewer pulls 1 or all 4 cameras (`CAMS` env; 360° cams multiply cost).
5. **Realtime/WebSocket path** — chat (`chat-ws.ts`) and live-count connections also need simulating at 1k–15k; k6 HTTP scripts don't cover WS. Add a `k6/ws` scenario if chat is in-scope for the test.

### Verdict
The tooling to answer "do issues occur at 1k–15k?" now exists (`viewers.js`), but a **truthful answer requires running it against the real Wowza/CDN origin with an auth-token pool from a distributed generator** — it cannot be answered from localhost or the old API-only scripts. Recommend: origin-only ramp first to find the CDN ceiling, then authenticated ramp, then add the WS scenario.

---

## B. Rewind / seek-back during a live stream

### Current state (`frontend/src/pages/watch/sections/ViewerOverlay.tsx`)
- hls.js config (≈lines 247–260): `lowLatencyMode: true`, `backBufferLength: 10` (only ~10s of played media retained), `maxBufferLength: 30`.
- **No seekbar exists** in the live viewer — the `<video>` has no `controls`; the only time control is a "LIVE" jump-to-live button (`jumpToLive` snaps to `hls.liveSyncPosition`/`seekable.end`).
- (The **VOD** player `WatchVOD.tsx` is the one with a full scrubber — deliberately separate from live.)

### Is live seek-back possible?
**Yes, but not with the current config/origin settings.** Three things gate it, in order of importance:
1. **Wowza DVR window (the real limit).** `video.seekable` only spans what the origin's live playlist exposes. Standard low-latency HLS keeps a short sliding window (a few segments). To rewind minutes, **Wowza must be configured for nDVR / a longer playlist window** for the live application. This is a **streaming-server config change**, not a frontend change.
2. **`backBufferLength: 10`** evicts played media after ~10s — even a manual `currentTime` rewind fails past that. Raise it (e.g. 60–300s) to hold a client-side back-buffer; costs memory.
3. **No seek UI.** Need a new seekbar bound to `video.seekable.start()/end()` + `currentTime`, plus handling the live-edge indicator (reuse existing `isAtLive`/`jumpToLive` logic).

`lowLatencyMode: true` also fights DVR — with a large DVR window you'd typically lower target latency expectations or keep LL for the live edge while allowing seek into the DVR range.

### Recommendation
Feasible as a follow-up feature. Sequence: (1) enable/confirm Wowza DVR window (defines max rewind), (2) raise `backBufferLength` to match desired instant-rewind, (3) build a live seekbar bound to `video.seekable`. Effort is moderate and mostly gated by the **Wowza-side DVR configuration** — verify that first, since it caps everything downstream.
