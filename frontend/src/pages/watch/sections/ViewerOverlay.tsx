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
  VIEWER_CAM_PICKER_BTN_CLS,
  VIEWER_CAM_SHEET_BACKDROP_CLS,
  VIEWER_CAM_SHEET_CLS,
  VIEWER_CAM_SHEET_HEAD_CLS,
  VIEWER_CAM_SHEET_TITLE_CLS,
  VIEWER_CAM_SHEET_CLOSE_CLS,
  VIEWER_CAM_SHEET_LIST_CLS,
  VIEWER_CLOSE_CLS,
  VIEWER_CLS,
  VIEWER_CONTROLS_CLS,
  VIEWER_CONTROLS_LEFT_CLS,
  VIEWER_CONTROLS_RIGHT_CLS,
  VIEWER_HEADER_CLS,
  VIEWER_ICON_BTN_CLS,
  VIEWER_LIVE_PILL_CLS,
  VIEWER_LIVE_PULSE_CLS,
  VIEWER_MAIN_CAM_CLS,
  VIEWER_MOBILE_CAM_CLS,
  VIEWER_MOBILE_CAM_LABEL_CLS,
  VIEWER_MOBILE_CAM_THUMB_CLS,
  VIEWER_MOBILE_CAMS_CLS,
  VIEWER_MSG_CLS,
  VIEWER_MSG_MINE_CLS,
  VIEWER_MSG_NAME_CLS,
  VIEWER_REACT_CLS,
  VIEWER_REACT_FLOAT_CLS,
  VIEWER_REACTIONS_CLS,
  VIEWER_STAGE_CLS,
  VIEWER_STAGE_SHELL_CLS,
  VIEWER_STATS_CLS,
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

type QualityLevel = { index: number; height: number; label: string };

type ReactionId = "like" | "love" | "fire";

const REACTIONS: Array<{
  id: ReactionId;
  label: string;
  color: string;
  path: string;
}> = [
  {
    id: "like",
    label: "Like",
    color: "#3b82f6",
    path: "M7 22V11M2 13v7a2 2 0 0 0 2 2h3V11H4a2 2 0 0 0-2 2zM21.5 11h-7l1-5a2 2 0 0 0-2-2.5L7 11v11h11.7a2 2 0 0 0 2-1.6l1.5-7a2 2 0 0 0-2-2.4z",
  },
  {
    id: "love",
    label: "Love",
    color: "#ef4444",
    path: "M12 21s-7-4.5-9.5-9C1 9 2.5 5 6 5c2 0 3.5 1.5 4.5 3C11.5 6.5 13 5 15 5c3.5 0 5 4 3.5 7-2.5 4.5-9.5 9-9.5 9z",
  },
  {
    id: "fire",
    label: "Fire",
    color: "#f59e0b",
    path: "M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C10 9 8 11 8 13.5a5 5 0 0 0 10 0c0-3-2-5.5-2-8 0-1.5-1-3-4-3.5z",
  },
];

const REACTION_BY_ID: Record<ReactionId, (typeof REACTIONS)[number]> =
  REACTIONS.reduce(
    (acc, r) => {
      acc[r.id] = r;
      return acc;
    },
    {} as Record<ReactionId, (typeof REACTIONS)[number]>,
  );

const COOLDOWN_MS = 45_000;

export function ViewerOverlay({
  session,
  featuredEvent,
  onClose,
}: ViewerOverlayProps) {
  const { i18n } = useTranslation();
  const loc = pickEventLocale(featuredEvent, i18n.language);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  const [cams, setCams] = useState<WatchCam[]>([]);
  const [camIdx, setCamIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [elapsedSec, setElapsedSec] = useState(0);
  const { streamStartedAt } = useStreamLive(true);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [qualityIdx, setQualityIdx] = useState(-1);
  const [qualityOpen, setQualityOpen] = useState(false);
  const qualityRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const [idle, setIdle] = useState(false);
  const [isAtLive, setIsAtLive] = useState(true);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatConnected, setChatConnected] = useState(false);
  const chatSocketRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(
    Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10),
  );
  const [bubbles, setBubbles] = useState<
    Array<{ id: number; reaction: ReactionId; left: string; duration: string }>
  >([]);
  const bubbleIdRef = useRef(0);
  const [camPickerOpen, setCamPickerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);
  const [, setCooldownTick] = useState(0);

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
    api.getWatchToken().then((res) => {
      if (res.ok) setCams(res.data.cams);
    });
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
        hls = new Hls({
          startLevel: 0,
          capLevelToPlayerSize: true,
          maxBufferLength: 10,
          maxMaxBufferLength: 30,
          lowLatencyMode: true,
          backBufferLength: 0,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const levels: QualityLevel[] = data.levels.map((l, i) => ({
            index: i,
            height: l.height,
            label:
              l.height >= 1080
                ? "1080p"
                : l.height >= 720
                  ? "720p"
                  : l.height >= 480
                    ? "480p"
                    : `${l.height}p`,
          }));
          setQualityLevels(levels);
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
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.SphereGeometry(5, 64, 40);
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

    const applyRot = () => {
      cam3.rotation.order = "YXZ";
      cam3.rotation.y = THREE.MathUtils.degToRad(rotY);
      cam3.rotation.x = THREE.MathUtils.degToRad(rotX);
    };

    const onDown = (x: number, y: number) => {
      isDragging = true;
      prevX = x;
      prevY = y;
    };
    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      rotY += (x - prevX) * 0.25;
      rotX = Math.max(-85, Math.min(85, rotX + (y - prevY) * 0.25));
      prevX = x;
      prevY = y;
      applyRot();
    };
    const onUp = () => {
      isDragging = false;
    };

    const onMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onUp);

    const ro = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      cam3.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      cam3.updateProjectionMatrix();
    });
    ro.observe(canvas);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
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
      canvas.removeEventListener("touchend", onUp);
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
          return;
        } catch {}
      }
      if (stage.webkitRequestFullscreen) {
        try {
          await stage.webkitRequestFullscreen();
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
      const inFs = !!(
        doc.fullscreenElement || doc.webkitFullscreenElement
      );
      const video = videoRef.current as VideoFullscreenElement | null;
      const inVideoFs =
        !!doc.webkitFullscreenElement &&
        doc.webkitFullscreenElement === video;
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

  useEffect(() => {
    if (!isFs && !pseudoFs) {
      setIdle(false);
      return;
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const stage = stageRef.current;
    if (!stage) return;
    const onActivity = () => {
      setIdle(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => setIdle(true), 3500);
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
  }, [isFs, pseudoFs]);

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
    if (isFs || pseudoFs) setChatOpen(false);
  }, [isFs, pseudoFs]);

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

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
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
      setIsAtLive(livePos - v.currentTime < 5);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!qualityOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const root = qualityRef.current;
      if (root && !root.contains(e.target as Node)) setQualityOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [qualityOpen]);

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

  const emitReact = (reaction: ReactionId) => {
    if (inCooldown) return;
    setLastActionAt(Date.now());
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const id = ++bubbleIdRef.current;
        const left = 15 + Math.random() * 70 + "%";
        const duration = 1.6 + Math.random() * 0.8 + "s";
        setBubbles((prev) => [...prev, { id, reaction, left, duration }]);
        setTimeout(
          () => setBubbles((prev) => prev.filter((b) => b.id !== id)),
          2500,
        );
      }, i * 80);
    }
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
          <span className={VIEWER_LIVE_PILL_CLS}>
            <span className={VIEWER_LIVE_PULSE_CLS} aria-hidden="true"></span>
            LIVE · <span>{fmtElapsed(elapsedSec)}</span>
          </span>
        </div>
        <div className={VIEWER_STATS_CLS}>
          <button
            type="button"
            className={VIEWER_ICON_BTN_CLS}
            onClick={togglePip}
            aria-label="Жижиг цонх (PiP)"
            title="Жижиг цонх"
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
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <rect
                x="13"
                y="11"
                width="6"
                height="5"
                rx="1"
                fill="currentColor"
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
              ? {
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
            className={VIEWER_STAGE_SHELL_CLS}
            style={
              isFs || pseudoFs
                ? {
                    background: "#000",
                    flex: "1 1 0%",
                    width: "100%",
                    height: "100%",
                    maxHeight: "none",
                    borderRadius: 0,
                    boxShadow: "none",
                  }
                : { background: "#000" }
            }
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
            {!activeCam?.hlsUrl && (
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
            )}
          </div>

          {activeCam && (
            <span className={VIEWER_MAIN_CAM_CLS}>
              <strong>{activeCam.label}</strong> · <span>{subLabel}</span>
            </span>
          )}

          <div className={VIEWER_REACT_FLOAT_CLS} aria-hidden="true">
            {bubbles.map((b) => {
              const r = REACTION_BY_ID[b.reaction];
              return (
                <svg
                  key={b.id}
                  viewBox="0 0 24 24"
                  fill={r.color}
                  aria-hidden="true"
                  className="absolute bottom-20 w-8 h-8 opacity-0 [animation:reactRise_2s_ease-out_forwards] [will-change:transform,opacity] [filter:drop-shadow(0_4px_8px_rgba(0,0,0,0.5))]"
                  style={{ left: b.left, animationDuration: b.duration }}
                >
                  <path d={r.path} />
                </svg>
              );
            })}
          </div>

          <div
            className={VIEWER_MOBILE_CAMS_CLS}
            role="group"
            aria-label="Камерын өнцөг"
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

          <div className={VIEWER_CONTROLS_CLS}>
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
                className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[11px] font-extrabold tracking-[.12em] cursor-pointer border border-solid [transition:background_.15s_ease,color_.15s_ease,border-color_.15s_ease] ${
                  isAtLive
                    ? "bg-[rgba(229,57,53,0.14)] border-[rgba(229,57,53,0.45)] text-white cursor-default"
                    : "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.18)] text-[rgba(255,255,255,0.85)] hover:bg-[rgba(229,57,53,0.14)] hover:border-[rgba(229,57,53,0.45)] hover:text-white"
                }`}
              >
                <span
                  className={`w-[7px] h-[7px] rounded-full bg-[#ef4444] ${
                    isAtLive
                      ? "[animation:live-pulse_1.4s_ease-in-out_infinite]"
                      : ""
                  }`}
                  aria-hidden="true"
                />
                LIVE
              </button>
            </div>

            <div
              className={VIEWER_REACTIONS_CLS}
              role="group"
              aria-label="Реакц"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`${VIEWER_REACT_CLS} grid place-items-center ${inCooldown ? "opacity-40 cursor-not-allowed hover:bg-transparent hover:scale-100" : ""}`}
                  aria-label={r.label}
                  title={inCooldown ? `${cooldownSecs}с дараа` : r.label}
                  disabled={inCooldown}
                  onClick={() => emitReact(r.id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={r.color}
                    aria-hidden="true"
                    className="w-5 h-5"
                  >
                    <path d={r.path} />
                  </svg>
                </button>
              ))}
            </div>

            <div className={VIEWER_CONTROLS_RIGHT_CLS}>
              {(() => {
                const visibleLevels = qualityLevels.filter(
                  (l) =>
                    l.height === 480 || l.height === 720 || l.height === 1080,
                );
                const currentLabel =
                  qualityIdx === -1
                    ? "Auto"
                    : (qualityLevels.find((l) => l.index === qualityIdx)
                        ?.label ?? "Auto");
                return (
                  <div
                    ref={qualityRef}
                    className="relative inline-flex items-center gap-2 text-xs text-[rgba(255,255,255,0.7)] max-[720px]:gap-1.5"
                  >
                    <span>Чанар</span>
                    <button
                      type="button"
                      onClick={() => setQualityOpen((o) => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={qualityOpen}
                      className="inline-flex items-center justify-center gap-2 min-w-[78px] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.1)] text-white font-semibold text-[12.5px] py-[7px] px-3 rounded-[9px] cursor-pointer [transition:background_.15s_ease,border-color_.15s_ease] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] max-[720px]:text-[11.5px] max-[720px]:py-1.5 max-[720px]:px-2"
                    >
                      <span>{currentLabel}</span>
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
                                className={`w-full inline-flex items-center gap-2 text-left font-semibold text-[12.5px] py-2 px-3 rounded-[8px] cursor-pointer bg-transparent border-0 text-white [transition:background_.12s_ease] hover:bg-[rgba(255,255,255,0.08)] ${
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

        {chatOpen && (
          <div
            className="hidden max-[1100px]:block fixed inset-0 z-[140] bg-black/40 [animation:tmFade_.2s_ease]"
            onClick={() => setChatOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={
            chatOpen
              ? `${VIEWER_CHAT_CLS} max-[1100px]:!fixed max-[1100px]:!left-0 max-[1100px]:!right-0 max-[1100px]:!bottom-0 max-[1100px]:!top-[60vh] max-[1100px]:!z-[150] max-[1100px]:!rounded-t-[20px] max-[1100px]:!rounded-b-none max-[1100px]:!bg-[#0b1220] max-[1100px]:shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.6)] max-[1100px]:![animation:tmSlideUp_.25s_ease] max-[1100px]:[will-change:transform]`
              : `${VIEWER_CHAT_CLS} max-[1100px]:hidden`
          }
          aria-label="Шууд чат"
        >
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
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Чат хаах"
              className="hidden max-[1100px]:grid ml-2 w-8 h-8 rounded-full place-items-center bg-[rgba(255,255,255,0.08)] border-0 cursor-pointer text-white [transition:background_.15s_ease] hover:bg-[rgba(255,255,255,0.16)] [&_svg]:!w-3.5 [&_svg]:!h-3.5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
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

        {!chatOpen && !isFs && !pseudoFs && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-label="Шууд чат нээх"
            className="hidden max-[1100px]:inline-flex fixed bottom-5 right-4 z-[120] items-center gap-2 py-2.5 px-4 rounded-full bg-brand-blue text-white text-sm font-bold border-0 cursor-pointer shadow-[0_12px_28px_-8px_rgba(34,48,198,0.7)] [transition:transform_.15s_ease,background_.15s_ease] active:scale-95 hover:bg-brand-blue-soft [&_svg]:w-4 [&_svg]:h-4"
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Чат
            {chat.length > 0 && (
              <span className="text-[10.5px] font-extrabold py-0.5 px-1.5 rounded-full bg-white/20">
                {chat.length}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          className={VIEWER_CAM_PICKER_BTN_CLS}
          onClick={() => setCamPickerOpen(true)}
          aria-label="Камер сонгох"
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
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {activeCam ? `Камер: ${activeCam.label}` : "Камер сонгох"}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ marginLeft: "auto" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {camPickerOpen && (
        <>
          <div
            className={VIEWER_CAM_SHEET_BACKDROP_CLS}
            onClick={() => setCamPickerOpen(false)}
          />
          <div
            className={VIEWER_CAM_SHEET_CLS}
            role="dialog"
            aria-modal="true"
            aria-label="Камер сонгох"
          >
            <header className={VIEWER_CAM_SHEET_HEAD_CLS}>
              <h4 className={VIEWER_CAM_SHEET_TITLE_CLS}>Камерын өнцөг</h4>
              <button
                type="button"
                className={VIEWER_CAM_SHEET_CLOSE_CLS}
                onClick={() => setCamPickerOpen(false)}
                aria-label="Хаах"
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
            </header>
            <div className={VIEWER_CAM_SHEET_LIST_CLS}>
              {cams.map((cam, i) => (
                <button
                  key={cam.id}
                  type="button"
                  className={`${VIEWER_ANGLE_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
                  onClick={() => {
                    setCamIdx(i);
                    setCamPickerOpen(false);
                  }}
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
