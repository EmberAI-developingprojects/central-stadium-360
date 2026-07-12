import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Hls from "hls.js";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import type { Session } from "../../../auth";
import { api } from "../../../lib/api";
import type { WatchCam } from "../../../lib/api";
import { getDeviceId } from "../../../lib/deviceId";
import { useStreamLive } from "../hooks/useStreamLive";
import { CHAT_WS_URL } from "../constants";
import { fmtElapsed } from "../utils";
import type { ChatMessage, TicketModalEvent } from "../types";
import { pickEventLocale } from "../../../lib/eventLocale";
import {
  VIEWER_ANGLE_ACTIVE_CLS,
  VIEWER_ANGLE_CLS,
  VIEWER_ANGLE_LABEL_CLS,
  VIEWER_ANGLE_LIVE_CLS,
  VIEWER_ANGLE_THUMB_CLS,
  VIEWER_ANGLES_CLS,
  VIEWER_BODY_CLS,
  VIEWER_CHAT_CLS,
  VIEWER_CHAT_COUNT_CLS,
  VIEWER_CHAT_FORM_CLS,
  VIEWER_CHAT_HEAD_CLS,
  VIEWER_CHAT_LIST_CLS,
  VIEWER_CHAT_SEND_CLS,
  VIEWER_CLOSE_CLS,
  VIEWER_CLS,
  VIEWER_CONTROLS_CLS,
  VIEWER_CONTROLS_LEFT_CLS,
  VIEWER_CONTROLS_RIGHT_CLS,
  VIEWER_HEADER_CLS,
  VIEWER_ICON_BTN_CLS,
  VIEWER_MAIN_CAM_BASE_CLS,
  VIEWER_MAIN_CAM_CLS,
  VIEWER_MOBILE_CAM_CLS,
  VIEWER_MOBILE_CAM_LABEL_CLS,
  VIEWER_MOBILE_CAM_THUMB_CLS,
  VIEWER_MOBILE_CAMS_CLS,
  VIEWER_MSG_CLS,
  VIEWER_MSG_MINE_CLS,
  VIEWER_MSG_NAME_CLS,
  VIEWER_STAGE_CLS,
  VIEWER_STAGE_SHELL_CLS,
  VIEWER_TITLE_CLS,
  VIEWER_TITLE_WRAP_CLS,
  VIEWER_VOL_CLS,
} from "../../_watchStyles";

type ViewerOverlayProps = {
  session: Session;
  featuredEvent: TicketModalEvent;
  onClose: () => void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type VideoFullscreenElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
};

// Best-effort landscape lock for native fullscreen (Android/Chrome). No-op where
// unsupported (iOS, desktop) — wrapped so a rejection never surfaces.
function lockLandscape(): void {
  try {
    const o = (
      screen as unknown as {
        orientation?: { lock?: (t: string) => Promise<void> };
      }
    ).orientation;
    o?.lock?.("landscape")?.catch(() => {});
  } catch {}
}
function unlockOrientation(): void {
  try {
    (
      screen as unknown as { orientation?: { unlock?: () => void } }
    ).orientation?.unlock?.();
  } catch {}
}

type QualityLevel = { index: number; height: number; label: string };

// Chat spam throttle: one send per 10s per viewer.
const COOLDOWN_MS = 10_000;

// Persisted position for the draggable floating "open chat" button. Null = the
// default bottom-right anchor; once dragged we store {x,y} viewport coords.

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const BASE_FOV = 75;

export function ViewerOverlay({
  session,
  featuredEvent,
  onClose,
}: ViewerOverlayProps) {
  const { t, i18n } = useTranslation();
  const loc = pickEventLocale(featuredEvent, i18n.language);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  const [cams, setCams] = useState<WatchCam[]>([]);
  // Set when /watch/token refuses playback (no_ticket, device_limit_reached).
  const [watchError, setWatchError] = useState<{
    code: string;
    limit?: number;
  } | null>(null);
  const [camIdx, setCamIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [elapsedSec, setElapsedSec] = useState(0);
  const { streamStartedAt } = useStreamLive(true);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [qualityIdx, setQualityIdx] = useState(-1);
  const [qualityOpen, setQualityOpen] = useState(false);
  const qualityRef = useRef<HTMLDivElement>(null);
  const qualityRefM = useRef<HTMLDivElement>(null); // mobile on-video quality menu
  // Mobile tap-to-reveal controls (auto-hide while playing).
  const [mCtl, setMCtl] = useState(false);
  const onVideoTapRef = useRef<() => void>(() => {});
  const [isFs, setIsFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  // Track viewport size so CSS-fullscreen (iOS, where element fullscreen +
  // orientation lock are unavailable) can rotate the stage to landscape while the
  // phone is held upright, then un-rotate once the user physically turns it.
  // Exact px (not dvh/dvw, which mis-resolve inside a transformed fixed element).
  const [vp, setVp] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const portrait = vp.h >= vp.w;
  const [idle, setIdle] = useState(false);
  const overControlsRef = useRef(false); // pointer parked on the control bar
  const [isAtLive, setIsAtLive] = useState(true);
  // Playhead position within the DVR window, 0–100 (100 = live edge). Drives the
  // red timeline. dvrRef holds the current [start, live] bounds for seeking.
  const [dvrPct, setDvrPct] = useState(100);
  const dvrRef = useRef<{ start: number; live: number }>({ start: 0, live: 0 });
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatConnected, setChatConnected] = useState(false);
  const chatSocketRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(
    Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10),
  );
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);
  const [, setCooldownTick] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (lastActionAt === null) return;
    const remaining = COOLDOWN_MS - (Date.now() - lastActionAt);
    if (remaining <= 0) return;
    const id = setInterval(() => setCooldownTick((t) => t + 1), 500);
    const stop = setTimeout(() => clearInterval(id), remaining + 100);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [lastActionAt]);

  const cooldownLeft = lastActionAt
    ? Math.max(0, COOLDOWN_MS - (Date.now() - lastActionAt))
    : 0;
  const inCooldown = cooldownLeft > 0;
  const cooldownSecs = Math.ceil(cooldownLeft / 1000);

  const activeCam = cams[camIdx] ?? null;
  const is360 = activeCam?.type === "360";

  useEffect(() => {
    setZoom(1);
  }, [activeCam?.id]);

  // Ticket + device-cap gate: the token call admits this device against the
  // ticket's tier cap (Standard=1, 3-User=3, 5-User=5). A 30s heartbeat keeps
  // the slot; closing the player releases it so another device can start.
  useEffect(() => {
    const deviceId = getDeviceId();
    let alive = true;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let ticketId: string | null = null;

    api.getWatchToken(featuredEvent.id, deviceId).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setWatchError(null);
        setCams(res.data.cams);
        ticketId = res.data.ticket_id;
        if (ticketId) {
          const tid = ticketId;
          heartbeat = setInterval(() => {
            api.watchHeartbeat(tid, deviceId).catch(() => {});
          }, 30_000);
        }
      } else {
        const details = res.details as { limit?: number } | undefined;
        setWatchError({ code: res.error, limit: details?.limit });
      }
    });

    return () => {
      alive = false;
      if (heartbeat) clearInterval(heartbeat);
      if (ticketId) {
        api.watchRelease(ticketId, deviceId).catch(() => {});
      }
    };
  }, [featuredEvent.id]);

  // Stream URLs carry an expiring path token — when playback dies on a fatal
  // network error (token expired, CDN 403), fetch fresh tokenized URLs and let
  // the source-loading effect resume. Throttled so a hard outage can't spam
  // the backend.
  const lastTokenRefreshRef = useRef(0);
  const refreshStreamRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshStreamRef.current = () => {
      const now = Date.now();
      if (now - lastTokenRefreshRef.current < 15_000) return;
      lastTokenRefreshRef.current = now;
      api.getWatchToken(featuredEvent.id, getDeviceId()).then((res) => {
        if (res.ok) setCams(res.data.cams);
      });
    };
  }, [featuredEvent.id]);

  // Native HLS (iOS Safari): the <video> element itself surfaces token/network
  // failures — same recovery path.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onError = () => refreshStreamRef.current();
    v.addEventListener("error", onError);
    return () => v.removeEventListener("error", onError);
  }, []);

  // Warm browser cache with all camera manifests so HLS switch skips the
  // m3u8 round-trip on first camera change.
  useEffect(() => {
    if (cams.length === 0) return;
    const ctrl = new AbortController();
    for (const cam of cams) {
      if (!cam.hlsUrl) continue;
      fetch(cam.hlsUrl, { signal: ctrl.signal, cache: "force-cache" }).catch(
        () => {},
      );
    }
    return () => ctrl.abort();
  }, [cams]);

  useEffect(() => {
    const video = videoRef.current;
    const url = activeCam?.hlsUrl;
    if (!video) return;
    setQualityLevels([]);
    setQualityIdx(-1);
    if (!url) return;

    if (Hls.isSupported()) {
      let hls = hlsRef.current;
      if (!hls) {
        const isMobile =
          typeof navigator !== "undefined" &&
          /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: isMobile,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 120 * 1000 * 1000,
          lowLatencyMode: true,
          // Keep more played-back content so the DVR timeline can rewind further.
          // The true rewind depth is still capped by Wowza's server-side nDVR
          // window — beyond what the live playlist contains, there's nothing to
          // seek to no matter how large this is.
          backBufferLength: 300,
          abrEwmaDefaultEstimate: 20_000_000,
          abrBandWidthFactor: 0.95,
          abrBandWidthUpFactor: 0.8,
          capLevelOnFPSDrop: true,
          startFragPrefetch: true,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          const h = hlsRef.current;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            h?.recoverMediaError();
            return;
          }
          // Network-fatal (incl. 403 on an expired stream token): fetch fresh
          // tokenized URLs — the source effect reloads, then resume loading.
          refreshStreamRef.current();
          h?.startLoad();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const levels: QualityLevel[] = data.levels.map((l, i) => ({
            index: i,
            height: l.height,
            label:
              l.height >= 2160
                ? "2160p"
                : l.height >= 1440
                  ? "1440p"
                  : l.height >= 1080
                    ? "1080p"
                    : l.height >= 720
                      ? "720p"
                      : l.height >= 480
                        ? "480p"
                        : `${l.height}p`,
          }));
          setQualityLevels(levels);
          // Default to the highest-resolution rendition (not Auto).
          const highest = levels.reduce(
            (a, b) => (b.height > a.height ? b : a),
            levels[0],
          );
          const h = hlsRef.current;
          if (highest && h) {
            setQualityIdx(highest.index);
            h.currentLevel = highest.index;
          }
          video.play().catch(() => {});
        });
        hls.attachMedia(video);
      }
      hls.loadSource(url);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
    }
  }, [activeCam?.hlsUrl]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (hlsRef.current) hlsRef.current.currentLevel = qualityIdx;
  }, [qualityIdx]);

  const AUDIO_BOOST = 4;

  const ensureAudioBoost = useCallback(() => {
    const video = videoRef.current;
    if (!video || audioSourceRef.current) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const source = ctx.createMediaElementSource(video);
      const gain = ctx.createGain();
      gain.gain.value = AUDIO_BOOST;
      source.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      audioSourceRef.current = source;
      audioGainRef.current = gain;
    } catch (err) {
      console.warn("[audio] boost init failed:", err);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume / 100;
    if (!muted && volume > 0) {
      ensureAudioBoost();
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    }
    const syncPlay = () => setPaused(v.paused);
    v.addEventListener("play", syncPlay);
    v.addEventListener("pause", syncPlay);
    return () => {
      v.removeEventListener("play", syncPlay);
      v.removeEventListener("pause", syncPlay);
    };
  }, [muted, volume, ensureAudioBoost]);

  // Buffering indicator: show a spinner when the live stream stalls waiting for
  // data, hide it as soon as frames resume. `waiting`/`stalled` while paused is
  // expected (user paused), so the render guards on !paused.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onWaiting = () => setBuffering(true);
    const onResume = () => setBuffering(false);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onWaiting);
    v.addEventListener("playing", onResume);
    v.addEventListener("canplay", onResume);
    v.addEventListener("pause", onResume);
    return () => {
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onWaiting);
      v.removeEventListener("playing", onResume);
      v.removeEventListener("canplay", onResume);
      v.removeEventListener("pause", onResume);
    };
  }, []);

  useEffect(() => {
    return () => {
      const ctx = audioCtxRef.current;
      if (ctx) {
        ctx.close().catch(() => {});
        audioCtxRef.current = null;
        audioSourceRef.current = null;
        audioGainRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!is360 || !canvas || !video) return;

    const scene = new THREE.Scene();
    const cam3 = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.1,
      1000,
    );
    cam3.position.set(0, 0, 0.01);
    const isMobile3D =
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile3D ? 2 : 3),
    );
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const geometry = new THREE.SphereGeometry(5, 128, 80);
    geometry.scale(-1, 1, 1);
    const sphere = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    scene.add(sphere);

    let isDragging = false;
    let prevX = 0,
      prevY = 0;
    let rotX = 0,
      rotY = 0;
    let pinchInitialDist = 0;
    let pinchInitialZoom = 1;
    // Tap detection: a short, low-movement press (not a drag/pinch) on the video
    // toggles play/pause on mobile — YouTube-style tap-on-video.
    let tapDownX = 0;
    let tapDownY = 0;
    let tapDownT = 0;
    let tapMoved = false;

    const applyRot = () => {
      cam3.rotation.order = "YXZ";
      cam3.rotation.y = THREE.MathUtils.degToRad(rotY);
      cam3.rotation.x = THREE.MathUtils.degToRad(rotX);
    };

    const onDown = (x: number, y: number) => {
      isDragging = true;
      prevX = x;
      prevY = y;
      tapDownX = x;
      tapDownY = y;
      tapDownT = performance.now();
      tapMoved = false;
    };
    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      if (Math.abs(x - tapDownX) > 8 || Math.abs(y - tapDownY) > 8) {
        tapMoved = true;
      }
      const sens = 0.25 / Math.max(1, zoomRef.current);
      rotY += (x - prevX) * sens;
      rotX = Math.max(-85, Math.min(85, rotX + (y - prevY) * sens));
      prevX = x;
      prevY = y;
      applyRot();
    };
    const onUp = () => {
      isDragging = false;
      // Treat a quick, still press as a tap → toggle the controls overlay
      // (mobile only; desktop has its own control bar).
      if (
        !tapMoved &&
        performance.now() - tapDownT < 400 &&
        window.innerWidth <= 1100
      ) {
        onVideoTapRef.current();
      }
    };

    const onMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchInitialDist = Math.sqrt(dx * dx + dy * dy);
        pinchInitialZoom = zoomRef.current;
        isDragging = false;
        tapMoved = true; // a pinch is never a tap
      } else if (e.touches.length === 1) {
        onDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && pinchInitialDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / pinchInitialDist;
        const next = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, pinchInitialZoom * ratio),
        );
        setZoom(next);
      } else if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchInitialDist = 0;
      if (e.touches.length === 1) {
        onDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 0) {
        onUp();
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      cam3.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      cam3.updateProjectionMatrix();
    });
    ro.observe(canvas);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const targetFov = BASE_FOV / Math.max(1, zoomRef.current);
      if (Math.abs(cam3.fov - targetFov) > 0.01) {
        cam3.fov = targetFov;
        cam3.updateProjectionMatrix();
      }
      texture.needsUpdate = true;
      renderer.render(scene, cam3);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [is360]);

  useEffect(() => {
    const compute = () => {
      if (streamStartedAt) {
        setElapsedSec(
          Math.max(0, Math.floor((Date.now() - streamStartedAt) / 1000)),
        );
      }
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [streamStartedAt]);

  const toggleStageFs = useCallback(async () => {
    const stage = stageRef.current as FullscreenElement | null;
    const video = videoRef.current as VideoFullscreenElement | null;
    const doc = document as FullscreenDocument;
    const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;

    if (inFs || pseudoFs) {
      if (inFs) {
        try {
          await (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
        } catch {}
      }
      if (pseudoFs) setPseudoFs(false);
      unlockOrientation();
      try {
        video?.webkitExitFullscreen?.();
      } catch {}
      return;
    }

    // 1. Try element-level fullscreen on the stage. iOS Safari 16.4+ and all
    //    modern desktops support this. For 360° this is mandatory because we
    //    need the canvas (not the raw equirectangular video) to be visible.
    if (stage) {
      if (stage.requestFullscreen) {
        try {
          await stage.requestFullscreen();
          lockLandscape();
          return;
        } catch {}
      }
      if (stage.webkitRequestFullscreen) {
        try {
          await stage.webkitRequestFullscreen();
          lockLandscape();
          return;
        } catch {}
      }
    }

    // 2. Legacy iOS Safari (<16.4): only <video> can go fullscreen. Use it for
    //    flat 2D cameras. For 360°, prefer pseudoFs (don't degrade to flat).
    if (!is360 && video?.webkitEnterFullscreen) {
      try {
        video.webkitEnterFullscreen();
        return;
      } catch {}
    }

    setPseudoFs(true);
  }, [pseudoFs, is360]);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    let lastTrigger = 0;
    const onChange = (e: MediaQueryListEvent) => {
      const doc = document as FullscreenDocument;
      const inFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      const video = videoRef.current as VideoFullscreenElement | null;
      const inVideoFs =
        !!doc.webkitFullscreenElement && doc.webkitFullscreenElement === video;
      const now = Date.now();
      if (now - lastTrigger < 600) return;
      lastTrigger = now;
      if (e.matches) {
        if (!inFs && !pseudoFs && !inVideoFs) {
          toggleStageFs();
        }
      } else {
        if (pseudoFs) setPseudoFs(false);
        if (inFs) {
          (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
        }
        try {
          video?.webkitExitFullscreen?.();
        } catch {}
      }
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [pseudoFs, toggleStageFs]);

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);

  useEffect(() => {
    const onFs = () => {
      const doc = document as FullscreenDocument;
      const active =
        (doc.fullscreenElement || doc.webkitFullscreenElement) ===
        stageRef.current;
      setIsFs(active);

      if (!active) setPseudoFs(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  // Make the stage shell fill the fullscreen area. This MUST use inline
  // `!important`. The shell carries mobile utilities that pin/offset it —
  // `max-[720px]:!h-[calc(100vw*9/16)]` (56.25vw !important height) and
  // `max-[1100px]:!mx-[calc(50%-50vw)]` (a negative margin) — that are meant to
  // be neutralised in fullscreen by the `[.is-fs_&]:!h-auto` / `!mx-0` overrides.
  // But those overrides use a descendant-combinator arbitrary variant
  // (`.is-fs .shell`) which the production (minified) CSS drops/mis-escapes, so
  // they silently lose to the mobile !important utilities — the shell keeps its
  // small 16:9 height and a ~half-viewport left margin (works in the unminified
  // dev build, breaks in prod). Applying the fill imperatively with `important`
  // priority beats any class rule in every build.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const fillProps: Array<[string, string]> = [
      ["position", "absolute"],
      ["top", "0"],
      ["right", "0"],
      ["bottom", "0"],
      ["left", "0"],
      ["margin", "0"],
      ["width", "100%"],
      ["height", "100%"],
      ["max-height", "none"],
      ["border-radius", "0"],
      ["box-shadow", "none"],
    ];
    if (isFs || pseudoFs) {
      for (const [prop, val] of fillProps) {
        el.style.setProperty(prop, val, "important");
      }
    } else {
      for (const [prop] of fillProps) el.style.removeProperty(prop);
    }
    return () => {
      for (const [prop] of fillProps) el.style.removeProperty(prop);
    };
  }, [isFs, pseudoFs]);

  // Auto-hide controls when the pointer is idle over the video (YouTube-style),
  // on both desktop overlay and fullscreen.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const stage = stageRef.current;
    if (!stage) return;
    const onActivity = () => {
      setIdle(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (!overControlsRef.current) setIdle(true);
      }, 3500);
    };
    const onLeave = () => setIdle(false);
    stage.addEventListener("mousemove", onActivity);
    stage.addEventListener("mouseleave", onLeave);
    stage.addEventListener("touchstart", onActivity, { passive: true });
    stage.addEventListener("touchmove", onActivity, { passive: true });
    onActivity();
    return () => {
      if (t) clearTimeout(t);
      stage.removeEventListener("mousemove", onActivity);
      stage.removeEventListener("mouseleave", onLeave);
      stage.removeEventListener("touchstart", onActivity);
      stage.removeEventListener("touchmove", onActivity);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA"))
        return;
      if (e.key === "Escape") {
        if (pseudoFs) {
          setPseudoFs(false);
          return;
        }
        onClose();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleStageFs();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, toggleStageFs, pseudoFs]);

  useEffect(() => {
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat]);

  useEffect(() => {
    if (!CHAT_WS_URL) return;
    let cancelled = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(CHAT_WS_URL);
      } catch {
        scheduleRetry();
        return;
      }
      chatSocketRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        retry = 0;
        setChatConnected(true);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data));
          if (data?.type !== "msg") return;
          const msg: ChatMessage = {
            id: String(data.id ?? Math.random().toString(36).slice(2, 11)),
            name: String(data.name ?? "Зочин"),
            color: String(data.color ?? "#4451DC"),
            text: String(data.text ?? ""),
            clientId: String(data.clientId ?? ""),
          };
          if (!msg.text) return;
          setChat((prev) => {
            const next = [...prev, msg];
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
        } catch {}
      };
      ws.onclose = () => {
        setChatConnected(false);
        if (chatSocketRef.current === ws) chatSocketRef.current = null;
        scheduleRetry();
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      retry = Math.min(retry + 1, 6);
      const delay = Math.min(500 * 2 ** (retry - 1), 8000);
      retryTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      const ws = chatSocketRef.current;
      chatSocketRef.current = null;
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  // Auto-unmute once on the first user interaction (autoplay starts muted by
  // browser rule). Respects a later manual mute — we only ever unmute once.
  const autoUnmutedRef = useRef(false);
  const ensureUnmuted = () => {
    if (autoUnmutedRef.current) return;
    autoUnmutedRef.current = true;
    const v = videoRef.current;
    if (v) v.muted = false;
    setMuted(false);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      ensureUnmuted();
      v.play();
    } else v.pause();
  };

  const jumpToLive = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const hls = hlsRef.current as (Hls & { liveSyncPosition?: number }) | null;
    let target = NaN;
    if (hls && typeof hls.liveSyncPosition === "number") {
      target = hls.liveSyncPosition;
    } else if (v.seekable.length > 0) {
      target = v.seekable.end(v.seekable.length - 1);
    }
    if (Number.isFinite(target) && target > 0) {
      v.currentTime = target;
    }
    v.play().catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const hls = hlsRef.current as
        | (Hls & { liveSyncPosition?: number })
        | null;
      let livePos = NaN;
      if (hls && typeof hls.liveSyncPosition === "number") {
        livePos = hls.liveSyncPosition;
      } else if (v.seekable.length > 0) {
        livePos = v.seekable.end(v.seekable.length - 1);
      }
      if (!Number.isFinite(livePos)) return;
      const start = v.seekable.length > 0 ? v.seekable.start(0) : 0;
      dvrRef.current = { start, live: livePos };
      const span = livePos - start;
      setDvrPct(
        span > 0
          ? Math.max(0, Math.min(100, ((v.currentTime - start) / span) * 100))
          : 100,
      );
      setIsAtLive(livePos - v.currentTime < 5);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Seek within the DVR window by tapping or dragging the timeline (shared by the
  // desktop and mobile bars). Clamps to the available buffer; if the window is
  // tiny (low-latency), it just snaps near live.
  const seekFromPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const { start, live } = dvrRef.current;
      if (!(live > start)) return;
      const seekTo = (clientX: number) => {
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        v.currentTime = start + frac * (live - start);
        setDvrPct(frac * 100);
      };
      seekTo(e.clientX);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      const move = (ev: PointerEvent) => seekTo(ev.clientX);
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        v.play().catch(() => {});
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    },
    [],
  );

  useEffect(() => {
    if (!qualityOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const inDesktop = qualityRef.current?.contains(t);
      const inMobile = qualityRefM.current?.contains(t);
      if (!inDesktop && !inMobile) setQualityOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [qualityOpen]);

  // Tapping the video toggles the mobile controls overlay (called from the
  // 360° drag effect, which owns the canvas touch handlers).
  useEffect(() => {
    onVideoTapRef.current = () => {
      ensureUnmuted();
      setMCtl((v) => !v);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Auto-hide the overlay while playing (keep it up when paused or menu open).
  useEffect(() => {
    if (!mCtl || paused || qualityOpen) return;
    const id = window.setTimeout(() => setMCtl(false), 3500);
    return () => window.clearTimeout(id);
  }, [mCtl, paused, qualityOpen]);
  // Reveal controls whenever playback pauses.
  useEffect(() => {
    if (paused) setMCtl(true);
  }, [paused]);

  const toggleMute = () =>
    setMuted((m) => {
      const next = !m;
      if (!next && volume === 0) setVolume(60);
      return next;
    });
  const onVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    setMuted(v === 0);
  };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      else if (videoRef.current?.requestPictureInPicture)
        await videoRef.current.requestPictureInPicture();
    } catch {}
  };


  const onChatSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inCooldown) return;
    const text = chatInput.trim();
    if (!text) return;
    const name = session.fullname || session.identifier || "Та";
    const ws = chatSocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          name,
          color: "#4451DC",
          text,
          clientId: clientIdRef.current,
        }),
      );
      setChatInput("");
      setLastActionAt(Date.now());
    }
  };

  const qualityLabel =
    qualityIdx === -1
      ? "Auto"
      : (qualityLevels.find((l) => l.index === qualityIdx)?.label ?? "Auto");
  const subLabel = activeCam ? `${activeCam.sub} · ${qualityLabel}` : "";

  return (
    <div
      className={VIEWER_CLS}
      role="dialog"
      aria-modal="true"
      aria-label="Шууд дамжуулал"
    >
      <header className={VIEWER_HEADER_CLS}>
        <button
          type="button"
          className={VIEWER_CLOSE_CLS}
          aria-label="Хаах"
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className={VIEWER_TITLE_WRAP_CLS}>
          <h3 className={VIEWER_TITLE_CLS}>{loc.title}</h3>
        </div>
      </header>

      <div className={VIEWER_BODY_CLS}>
        <aside className={VIEWER_ANGLES_CLS} aria-label="Камерын өнцөг">
          {cams.map((cam, i) => (
            <button
              key={cam.id}
              type="button"
              className={`${VIEWER_ANGLE_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
              onClick={() => setCamIdx(i)}
            >
              <span
                className={VIEWER_ANGLE_THUMB_CLS}
                style={{ background: "#0b1929", position: "relative" }}
              >
                {featuredEvent.image && (
                  <img
                    src={featuredEvent.image}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: camIdx === i ? 0.5 : 0.35,
                    }}
                  />
                )}
                <span className={VIEWER_ANGLE_LIVE_CLS}></span>
                {cam.type === "360" && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      background: "rgba(0,0,0,0.7)",
                      color: "#60a5fa",
                      padding: "1px 4px",
                      borderRadius: 3,
                      letterSpacing: "0.06em",
                    }}
                  >
                    360°
                  </span>
                )}
              </span>
              <span className={VIEWER_ANGLE_LABEL_CLS}>
                <strong>{cam.label}</strong>
                <small>{cam.sub}</small>
              </span>
            </button>
          ))}
        </aside>

        <section
          className={`${VIEWER_STAGE_CLS}${isFs || pseudoFs ? " is-fs" : ""}${idle ? " is-idle" : ""}`}
          ref={stageRef}
          style={
            pseudoFs
              ? portrait
                ? {
                    // Held portrait: rotate the whole stage 90° so the video
                    // fills the screen in landscape. Swap w/h to the viewport's
                    // pixel dimensions; translateX brings the rotated box on-screen.
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: `${vp.h}px`,
                    height: `${vp.w}px`,
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: `translateX(${vp.w}px) rotate(90deg)`,
                    transformOrigin: "top left",
                    padding: 0,
                    gap: 0,
                    zIndex: 2000,
                    background: "#000",
                  }
                : {
                    // Phone turned to landscape: no rotation needed.
                    position: "fixed",
                    inset: 0,
                    width: "100dvw",
                    height: "100dvh",
                    padding: 0,
                    gap: 0,
                    zIndex: 2000,
                    background: "#000",
                  }
              : undefined
          }
        >
          <div
            ref={shellRef}
            className={VIEWER_STAGE_SHELL_CLS}
            style={{ background: "#000" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={muted}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: isFs || pseudoFs ? "cover" : "contain",
                display: "block",
                zIndex: is360 ? 0 : 1,
                pointerEvents: is360 ? "none" : "auto",
                opacity: is360 ? 0 : 1,
              }}
              poster={featuredEvent.image}
              onDoubleClick={toggleStageFs}
              onClick={() => {
                // Non-360 cams: the canvas tap-detection doesn't run, so wire
                // tap-to-reveal directly on the video for mobile.
                if (!is360 && window.innerWidth <= 1100) onVideoTapRef.current();
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: is360 ? "block" : "none",
                cursor: "grab",
                touchAction: "none",
                zIndex: 2,
              }}
              onDoubleClick={toggleStageFs}
            />
            {watchError ? (
              <div
                role="alert"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: 24,
                  textAlign: "center",
                  background: "rgba(5,9,18,0.92)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 700, maxWidth: 420 }}>
                  {watchError.code === "device_limit_reached"
                    ? t("watch_device_limit", {
                        limit: watchError.limit ?? 1,
                      })
                    : watchError.code === "no_ticket"
                      ? t("watch_no_ticket")
                      : watchError.code === "invalid_input"
                        ? t("watch_no_stream")
                        : t("watch_stream_error")}
                </span>
              </div>
            ) : !activeCam?.hlsUrl ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: "rgba(255,255,255,0.4)",
                  pointerEvents: "none",
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Урсгал тохируулагдаагүй байна
                </span>
              </div>
            ) : null}

            {buffering && !paused && activeCam?.hlsUrl && (
              <div
                role="status"
                aria-label="Ачааллаж байна"
                className="absolute inset-0 z-[3] grid place-items-center pointer-events-none"
              >
                <span
                  aria-hidden="true"
                  className="w-12 h-12 rounded-full border-[3px] border-white/25 border-t-white animate-spin [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.6))]"
                />
              </div>
            )}

            {/* YouTube-style tap-to-reveal controls (mobile). Tap the video to
                toggle; auto-hides while playing. Center = play/pause,
                bottom-left = LIVE + elapsed, bottom-right = fullscreen,
                top-right gear = quality (defaults to highest). */}
            <div
              className={`hidden max-[1100px]:block absolute inset-0 z-[4] [transition:opacity_.2s_ease] ${
                mCtl ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* scrim — tap an empty area to hide the controls */}
              <button
                type="button"
                aria-label="Хяналт нуух"
                onClick={() => setMCtl(false)}
                className="absolute inset-0 w-full h-full bg-black/25 border-0 cursor-default"
              />

              {/* top-left: active camera + quality label (mirrors the desktop
                  VIEWER_MAIN_CAM_CLS badge; revealed/hidden with the controls).
                  pointer-events-none so a tap on it still hits the scrim and
                  dismisses the overlay. */}
              {activeCam && (
                <span
                  className={`absolute top-2 left-2 z-[1] inline-block max-w-[70%] truncate pointer-events-none ${VIEWER_MAIN_CAM_BASE_CLS}`}
                >
                  <strong>{activeCam.label}</strong> · <span>{subLabel}</span>
                </span>
              )}

              {/* top-right: quality gear + menu */}
              {(() => {
                const visibleLevels = qualityLevels.filter(
                  (l) =>
                    l.height === 480 ||
                    l.height === 720 ||
                    l.height === 1080 ||
                    l.height === 1440 ||
                    l.height === 2160,
                );
                const currentHeight =
                  qualityIdx === -1
                    ? (visibleLevels[visibleLevels.length - 1]?.height ?? 0)
                    : (qualityLevels.find((l) => l.index === qualityIdx)
                        ?.height ?? 0);
                return (
                  <div ref={qualityRefM} className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={() => setQualityOpen((o) => !o)}
                      aria-label="Чанар"
                      aria-haspopup="listbox"
                      aria-expanded={qualityOpen}
                      className="relative w-11 h-11 grid place-items-center rounded-full bg-black/45 text-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&_svg]:w-[22px] [&_svg]:h-[22px]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      {currentHeight >= 720 && (
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] font-extrabold leading-none px-1 py-[1px] rounded-[3px] bg-[#ff0000] text-white">
                          HD
                        </span>
                      )}
                    </button>
                    {qualityOpen && (
                      <ul
                        role="listbox"
                        aria-label="Чанар"
                        className="absolute top-full right-0 mt-2 z-[20] min-w-[130px] p-1 list-none rounded-[12px] bg-[rgba(17,22,35,0.97)] border border-solid border-[rgba(255,255,255,0.1)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
                      >
                        {[
                          { idx: -1, label: "Auto" },
                          ...visibleLevels.map((l) => ({
                            idx: l.index,
                            label: l.label,
                          })),
                        ].map((opt) => {
                          const selected = opt.idx === qualityIdx;
                          return (
                            <li key={opt.idx}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setQualityIdx(opt.idx);
                                  setQualityOpen(false);
                                }}
                                className={`w-full inline-flex items-center gap-2 text-left font-semibold text-[13px] py-2.5 px-3 rounded-[8px] bg-transparent border-0 text-white active:bg-[rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 ${
                                  selected ? "bg-[rgba(34,48,198,0.28)]" : ""
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex w-3.5 justify-center ${
                                    selected ? "opacity-100" : "opacity-0"
                                  }`}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="12"
                                    height="12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </span>
                                {opt.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })()}

              {/* center: play / pause */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={paused ? "Тоглуулах" : "Түр зогсоох"}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-black/50 [backdrop-filter:blur(4px)] [-webkit-backdrop-filter:blur(4px)] grid place-items-center text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&_svg]:w-9 [&_svg]:h-9"
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                )}
              </button>

              {/* red live-DVR progress timeline — tap/drag seeks within the
                  buffer; sits above the bottom control row (mirrors desktop). */}
              <div className="absolute left-3 right-3 bottom-[calc(max(12px,env(safe-area-inset-bottom))+60px)] z-[2]">
                <div
                  role="slider"
                  aria-label="Дамжуулалтын шугам"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(dvrPct)}
                  onPointerDown={seekFromPointer}
                  className="relative py-2.5 -my-2.5 cursor-pointer touch-none"
                >
                  <div className="relative h-[3px] rounded-full bg-white/25">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#ff0000]"
                      style={{ width: `${dvrPct}%` }}
                    />
                    <span
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full bg-[#ff0000] shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
                      style={{ left: `${dvrPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* bottom-left: LIVE + elapsed running time */}
              <div className="absolute bottom-[max(12px,env(safe-area-inset-bottom))] left-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={jumpToLive}
                  aria-label="Шууд"
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-extrabold tracking-[.1em] border border-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isAtLive
                      ? "bg-[rgba(229,57,53,0.22)] border-[rgba(229,57,53,0.5)] text-white"
                      : "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.18)] text-[rgba(255,255,255,0.75)]"
                  }`}
                >
                  <span
                    className={`w-[7px] h-[7px] rounded-full ${
                      isAtLive
                        ? "bg-[#ef4444] [animation:live-pulse_1.4s_ease-in-out_infinite] motion-reduce:[animation:none]"
                        : "bg-[rgba(255,255,255,0.5)]"
                    }`}
                  />
                  LIVE
                </button>
                <span className="text-white text-[12px] font-semibold [font-variant-numeric:tabular-nums] [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                  {fmtElapsed(elapsedSec)}
                </span>
              </div>

              {/* bottom-right: fullscreen */}
              <button
                type="button"
                onClick={toggleStageFs}
                aria-label="Бүтэн дэлгэц"
                className="absolute bottom-[max(12px,env(safe-area-inset-bottom))] right-3 w-11 h-11 grid place-items-center rounded-full bg-black/45 text-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&_svg]:w-[22px] [&_svg]:h-[22px]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>

          {activeCam && (
            <span className={VIEWER_MAIN_CAM_CLS}>
              <strong>{activeCam.label}</strong> · <span>{subLabel}</span>
            </span>
          )}

          <div
            className={VIEWER_MOBILE_CAMS_CLS}
            role="group"
            aria-label="Камерын өнцөг"
            // Hidden in fullscreen. The `[.is-fs_&]:!hidden` class is dropped by
            // the prod CSS minifier (see the shell-fill note above), so hide it
            // inline — a normal inline style still beats the non-important
            // `max-[1100px]:flex` utility in every build.
            style={{ display: isFs || pseudoFs ? "none" : undefined }}
          >
            {cams.map((cam, i) => (
              <button
                key={cam.id}
                type="button"
                className={`${VIEWER_MOBILE_CAM_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
                onClick={() => setCamIdx(i)}
                aria-label={cam.label}
                aria-pressed={camIdx === i}
              >
                <span
                  className={VIEWER_MOBILE_CAM_THUMB_CLS}
                  style={{ background: "#0b1929" }}
                >
                  {featuredEvent.image && (
                    <img
                      src={featuredEvent.image}
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: camIdx === i ? 0.55 : 0.32,
                      }}
                    />
                  )}
                  <span className={VIEWER_ANGLE_LIVE_CLS}></span>
                  {cam.type === "360" && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        fontSize: 9,
                        fontWeight: 700,
                        background: "rgba(0,0,0,0.7)",
                        color: "#60a5fa",
                        padding: "1px 4px",
                        borderRadius: 3,
                        letterSpacing: "0.06em",
                      }}
                    >
                      360°
                    </span>
                  )}
                </span>
                <span className={VIEWER_MOBILE_CAM_LABEL_CLS}>{cam.label}</span>
              </button>
            ))}
          </div>

          <div
            className={VIEWER_CONTROLS_CLS}
            onMouseEnter={() => {
              overControlsRef.current = true;
              setIdle(false);
            }}
            onMouseLeave={() => {
              overControlsRef.current = false;
            }}
          >
            {/* Red live-DVR progress timeline — tap/drag to seek within the
                buffer (YouTube-live style). */}
            <div
              role="slider"
              aria-label="Дамжуулалтын шугам"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(dvrPct)}
              onPointerDown={seekFromPointer}
              className="group absolute top-0 left-0 right-0 py-2 cursor-pointer touch-none"
            >
              <div className="relative h-[3px] group-hover:h-[5px] [transition:height_.1s_ease] bg-[rgba(255,255,255,0.26)]">
                <div
                  className="absolute inset-y-0 left-0 bg-[#ff0000]"
                  style={{ width: `${dvrPct}%` }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0 h-0 group-hover:w-[13px] group-hover:h-[13px] rounded-full bg-[#ff0000] shadow-[0_0_0_1px_rgba(0,0,0,0.15)] [transition:width_.1s_ease,height_.1s_ease]"
                  style={{ left: `${dvrPct}%` }}
                />
              </div>
            </div>
            <div className={VIEWER_CONTROLS_LEFT_CLS}>
              <button
                type="button"
                className={`${VIEWER_ICON_BTN_CLS}${paused ? " is-paused" : ""}`}
                onClick={togglePlay}
                aria-label="Тоглуулах/Зогсоох"
              >
                <svg
                  className="block [.is-paused_&]:hidden"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                <svg
                  className="hidden [.is-paused_&]:block"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button
                type="button"
                className={`${VIEWER_ICON_BTN_CLS}${muted || volume === 0 ? " is-muted" : ""}`}
                onClick={toggleMute}
                aria-label="Дуу/Дуугүй"
              >
                <svg
                  className="block [.is-muted_&]:hidden"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                <svg
                  className="hidden [.is-muted_&]:block"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              </button>
              <input
                className={VIEWER_VOL_CLS}
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={onVolume}
                aria-label="Дуу"
              />
              <button
                type="button"
                onClick={jumpToLive}
                aria-label="Шууд дамжуулалт руу шилжих"
                title={
                  isAtLive ? "Шууд дамжуулалт" : "Шууд дамжуулалт руу шилжих"
                }
                className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[11px] font-extrabold tracking-[.12em] cursor-pointer border border-solid [transition:background_.15s_ease,color_.15s_ease,border-color_.15s_ease] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] max-[720px]:!h-[32px] max-[720px]:!px-2 max-[720px]:!gap-1 max-[720px]:!text-[10.5px] max-[720px]:!tracking-[.06em] ${
                  isAtLive
                    ? "bg-[rgba(229,57,53,0.14)] border-[rgba(229,57,53,0.45)] text-white cursor-default"
                    : "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.18)] text-[rgba(255,255,255,0.85)] hover:bg-[rgba(229,57,53,0.14)] hover:border-[rgba(229,57,53,0.45)] hover:text-white"
                }`}
              >
                <span
                  className={`w-[7px] h-[7px] rounded-full bg-[#ef4444] motion-reduce:[animation:none] ${
                    isAtLive
                      ? "[animation:live-pulse_1.4s_ease-in-out_infinite]"
                      : ""
                  }`}
                  aria-hidden="true"
                />
                LIVE
                <span className="ml-1 font-semibold text-[rgba(255,255,255,0.72)] [font-variant-numeric:tabular-nums]">
                  {fmtElapsed(elapsedSec)}
                </span>
              </button>
            </div>

            <div className={VIEWER_CONTROLS_RIGHT_CLS}>
              {is360 && (
                <div
                  className="inline-flex items-center gap-1 mr-1 max-[720px]:gap-0.5"
                  role="group"
                  aria-label="Зураг томруулах"
                >
                  <button
                    type="button"
                    className={VIEWER_ICON_BTN_CLS}
                    onClick={() =>
                      setZoom((z) =>
                        Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)),
                      )
                    }
                    aria-label="Бага"
                    title="Бага"
                    disabled={zoom <= MIN_ZOOM}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16" y2="16" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={VIEWER_ICON_BTN_CLS}
                    onClick={() =>
                      setZoom((z) =>
                        Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)),
                      )
                    }
                    aria-label="Том"
                    title="Том"
                    disabled={zoom >= MAX_ZOOM}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16" y2="16" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                    </svg>
                  </button>
                  {zoom > MIN_ZOOM && (
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      aria-label="Анхны хэмжээ"
                      title="Reset"
                      className="inline-flex items-center justify-center h-[34px] min-w-[44px] px-2 rounded-full text-[11px] font-extrabold tracking-[.08em] text-[rgba(255,255,255,0.9)] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.18)] cursor-pointer [transition:background_.15s_ease,border-color_.15s_ease] hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] max-[720px]:!hidden"
                    >
                      {zoom.toFixed(1)}×
                    </button>
                  )}
                </div>
              )}
              {(() => {
                const visibleLevels = qualityLevels.filter(
                  (l) =>
                    l.height === 480 ||
                    l.height === 720 ||
                    l.height === 1080 ||
                    l.height === 1440 ||
                    l.height === 2160,
                );
                const currentHeight =
                  qualityIdx === -1
                    ? (visibleLevels[visibleLevels.length - 1]?.height ?? 0)
                    : (qualityLevels.find((l) => l.index === qualityIdx)
                        ?.height ?? 0);
                return (
                  <div
                    ref={qualityRef}
                    className="relative inline-flex items-center gap-2 text-xs text-[rgba(255,255,255,0.7)]"
                  >
                    <button
                      type="button"
                      onClick={() => setQualityOpen((o) => !o)}
                      aria-label="Тохиргоо"
                      aria-haspopup="listbox"
                      aria-expanded={qualityOpen}
                      className={`relative ${VIEWER_ICON_BTN_CLS}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={qualityOpen ? "[transform:rotate(30deg)] [transition:transform_.2s]" : "[transition:transform_.2s]"}
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      {currentHeight >= 720 && (
                        <span className="absolute -top-1 -right-1 text-[8px] font-extrabold leading-none px-1 py-[1px] rounded-[3px] bg-[#ff0000] text-white">
                          HD
                        </span>
                      )}
                    </button>
                    {qualityOpen && (
                      <ul
                        role="listbox"
                        aria-label="Чанар"
                        className="absolute bottom-full right-0 mb-2 z-[20] min-w-[110px] p-1 list-none rounded-[12px] bg-[rgba(17,22,35,0.96)] border border-solid border-[rgba(255,255,255,0.1)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] [backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]"
                      >
                        {[
                          { idx: -1, label: "Auto" },
                          ...visibleLevels.map((l) => ({
                            idx: l.index,
                            label: l.label,
                          })),
                        ].map((opt) => {
                          const selected = opt.idx === qualityIdx;
                          return (
                            <li key={opt.idx}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setQualityIdx(opt.idx);
                                  setQualityOpen(false);
                                }}
                                className={`w-full inline-flex items-center gap-2 text-left font-semibold text-[12.5px] py-2 px-3 rounded-[8px] cursor-pointer bg-transparent border-0 text-white [transition:background_.12s_ease] hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 ${
                                  selected ? "bg-[rgba(34,48,198,0.25)]" : ""
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex w-3.5 justify-center ${selected ? "opacity-100" : "opacity-0"}`}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="12"
                                    height="12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </span>
                                {opt.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })()}
              <button
                type="button"
                className={VIEWER_ICON_BTN_CLS}
                onClick={togglePip}
                aria-label="Мини тоглуулагч"
                title="Мини тоглуулагч"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="15" rx="2" />
                  <rect
                    x="12"
                    y="11"
                    width="7"
                    height="5"
                    rx="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={VIEWER_ICON_BTN_CLS}
                onClick={toggleStageFs}
                aria-label="Бүтэн дэлгэц"
                title="Бүтэн дэлгэц"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* YouTube-style: chat is docked inline below the player on mobile
            (no floating button, no covering sheet). */}
        <aside className={VIEWER_CHAT_CLS} aria-label="Шууд чат">
          <header className={VIEWER_CHAT_HEAD_CLS}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Шууд чат
            <span
              aria-hidden="true"
              title={chatConnected ? "Холбогдсон" : "Холбогдож байна…"}
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                marginLeft: 6,
                borderRadius: "50%",
                background: chatConnected ? "#22c55e" : "#f59e0b",
                boxShadow: chatConnected
                  ? "0 0 0 2px rgba(34,197,94,0.18)"
                  : "none",
                transition: "background 200ms",
              }}
            />
            <span className={VIEWER_CHAT_COUNT_CLS}>{chat.length}</span>
          </header>
          <div
            className={VIEWER_CHAT_LIST_CLS}
            ref={chatListRef}
            aria-live="polite"
          >
            {chat.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 13,
                }}
              >
                Одоогоор мессеж алга.
                <br />
                Та мессеж бичиж эхлэх боломжтой.
              </div>
            )}
            {chat.map((m) => {
              const mine = m.clientId === clientIdRef.current;
              return (
                <div
                  key={m.id}
                  className={`${VIEWER_MSG_CLS}${mine ? " " + VIEWER_MSG_MINE_CLS : ""}`}
                >
                  <span
                    className={VIEWER_MSG_NAME_CLS}
                    style={{ color: m.color }}
                  >
                    {m.name}
                  </span>
                  <span>{m.text}</span>
                </div>
              );
            })}
          </div>
          <form
            className={VIEWER_CHAT_FORM_CLS}
            onSubmit={onChatSubmit}
            autoComplete="off"
          >
            <input
              type="text"
              placeholder={
                !chatConnected
                  ? "Холбогдож байна…"
                  : inCooldown
                    ? `Дахин ${cooldownSecs}с-ийн дараа илгээнэ`
                    : "Мессеж"
              }
              maxLength={140}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!chatConnected || inCooldown}
            />
            <button
              type="submit"
              className={VIEWER_CHAT_SEND_CLS}
              aria-label="Илгээх"
              title={inCooldown ? `${cooldownSecs}с дараа` : "Илгээх"}
              disabled={!chatConnected || !chatInput.trim() || inCooldown}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </aside>

      </div>
    </div>
  );
}
