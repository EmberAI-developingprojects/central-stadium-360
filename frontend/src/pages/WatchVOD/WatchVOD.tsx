import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Hls from "hls.js";
import * as THREE from "three";
import type { DbRecording } from "@cs360/shared";
import { api, type VODEventDetail } from "../../lib/api";
import ReplayPaywall from "../../components/ReplayPaywall";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import UserMenu from "../../components/UserMenu";
import {
  VIEWER_ANGLE_ACTIVE_CLS,
  VIEWER_ANGLE_CLS,
  VIEWER_ANGLE_LABEL_CLS,
  VIEWER_ANGLE_THUMB_CLS,
  VIEWER_ANGLES_CLS,
  VIEWER_BODY_CLS,
  VIEWER_CLS,
  VIEWER_CONTROLS_CLS,
  VIEWER_CONTROLS_LEFT_CLS,
  VIEWER_CONTROLS_RIGHT_CLS,
  VIEWER_HEADER_CLS,
  VIEWER_ICON_BTN_CLS,
  VIEWER_MOBILE_CAM_CLS,
  VIEWER_MOBILE_CAM_LABEL_CLS,
  VIEWER_MOBILE_CAM_THUMB_CLS,
  VIEWER_MOBILE_CAMS_CLS,
  VIEWER_STAGE_CLS,
  VIEWER_STAGE_SHELL_CLS,
  VIEWER_TITLE_CLS,
  VIEWER_TITLE_WRAP_CLS,
  VIEWER_VOL_CLS,
} from "../_watchStyles";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type QualityLevel = { index: number; height: number; label: string };

const fmtTime = (secs: number) => {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const dateFmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const camLabel = (rec: DbRecording) => `Камер ${rec.camera_number}`;
// With multi-session events a camera can have several recordings; the session
// start time is what tells them apart ("7/11 11:04" vs "7/12 09:40").
const camSub = (rec: DbRecording) => {
  if (!rec.recording_started_at) return "360°";
  const d = new Date(rec.recording_started_at);
  if (Number.isNaN(d.getTime())) return "360°";
  const ub = new Date(d.getTime() + 8 * 60 * 60 * 1000); // Asia/Ulaanbaatar
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ub.getUTCMonth() + 1}/${ub.getUTCDate()} ${pad(ub.getUTCHours())}:${pad(ub.getUTCMinutes())}`;
};

export default function WatchVOD() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [event, setEvent] = useState<VODEventDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousTicketExpired, setPreviousTicketExpired] = useState(false);

  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#05080F";
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  const fetchEvent = useCallback(
    async (silent = false) => {
      if (!eventId) return;
      if (!silent) setLoading(true);
      const res = await api.getEventForVOD(eventId);
      if (res.ok) {
        setEvent(res.data);
        setLoadError(null);
      } else {
        setEvent(null);
        setLoadError(res.error);
      }
      if (!silent) setLoading(false);
    },
    [eventId],
  );

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (!event?.recordings_pending) return;
    const id = setInterval(() => {
      void fetchEvent(true);
    }, 30000);
    return () => clearInterval(id);
  }, [event?.recordings_pending, fetchEvent]);

  useEffect(() => {
    if (!eventId || !event || event.has_access) {
      setPreviousTicketExpired(false);
      return;
    }
    let alive = true;
    api.listMyTickets().then((res) => {
      if (!alive || !res.ok) return;
      const now = Date.now();
      const hadExpired = res.data.some((t) => {
        if (t.event_id !== eventId) return false;
        if (t.status !== "paid") return false;
        if (!t.access_expires_at) return false;
        return new Date(t.access_expires_at).getTime() <= now;
      });
      setPreviousTicketExpired(hadExpired);
    });
    return () => {
      alive = false;
    };
  }, [eventId, event]);

  if (loading) {
    return (
      <ShellChrome title="">
        <div className="text-center text-[rgba(255,255,255,0.55)] text-[14px] py-20">
          {t("vod_loading")}
        </div>
      </ShellChrome>
    );
  }

  if (loadError === "not_found" || !event) {
    return (
      <ShellChrome title="">
        <div className="text-center text-[rgba(255,255,255,0.6)] text-[14px] py-20 max-w-[480px] mx-auto px-4">
          {t("vod_not_found")}
          <div className="mt-5">
            <Link
              to="/watch"
              className="inline-flex items-center gap-2 py-[10px] px-4 rounded-[10px] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.12)] text-white text-[13px] font-bold no-underline hover:bg-[rgba(255,255,255,0.12)]"
            >
              {t("vod_back")}
            </Link>
          </div>
        </div>
      </ShellChrome>
    );
  }

  if (!event.has_access) {
    return (
      <ShellChrome title={event.name} onBack={() => navigate("/watch")}>
        <ReplayPaywall
          event={event}
          onPaid={() => void fetchEvent()}
          previousTicketExpired={previousTicketExpired}
        />
      </ShellChrome>
    );
  }

  if (event.recordings_pending) {
    return (
      <ShellChrome title={event.name} onBack={() => navigate("/watch")}>
        <RecordingsPending />
      </ShellChrome>
    );
  }

  return (
    <ShellChrome title={event.name} onBack={() => navigate("/watch")}>
      <VODViewer event={event} />
    </ShellChrome>
  );
}

function RecordingsPending() {
  const { t } = useTranslation();
  return (
    <div className="max-w-[520px] mx-auto px-5 py-20 text-center">
      <div
        className="mx-auto mb-6 w-14 h-14 rounded-full border-[3px] border-solid border-white/20 border-t-white/85"
        style={{ animation: "vodSpin 0.9s linear infinite" }}
        aria-hidden="true"
      />
      <h2 className="text-white text-[20px] font-bold m-0 mb-3 leading-[1.25]">
        {t("vod_processing_title")}
      </h2>
      <p className="text-[rgba(255,255,255,0.6)] text-[14px] leading-[1.6] m-0">
        {t("vod_processing_desc")}
      </p>
      <style>{`@keyframes vodSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ShellChrome({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={VIEWER_CLS}
      style={{ position: "static", minHeight: "100vh" }}
    >
      <header className={VIEWER_HEADER_CLS}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Буцах"
            className="w-[38px] h-[38px] rounded-full text-white cursor-pointer grid place-items-center bg-[rgba(255,255,255,0.08)] border border-solid border-[rgba(255,255,255,0.1)] [transition:background_.15s_ease] hover:bg-[rgba(255,255,255,0.16)] [&_svg]:w-[18px] [&_svg]:h-[18px]"
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <Link
            to="/watch"
            aria-label="Нөхөж үзэх"
            className="w-[38px] h-[38px] rounded-full text-white grid place-items-center bg-[rgba(255,255,255,0.08)] border border-solid border-[rgba(255,255,255,0.1)] no-underline [&_svg]:w-[18px] [&_svg]:h-[18px]"
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
        )}
        <div className={VIEWER_TITLE_WRAP_CLS}>
          <h3 className={VIEWER_TITLE_CLS}>{title}</h3>
        </div>
        <div className="inline-flex items-center gap-2">
          <LanguageSwitcher dark />
          <UserMenu dark />
        </div>
      </header>
      {children}
    </div>
  );
}

type SignedEntry = { url: string; expiresAt: number };

function VODViewer({ event }: { event: VODEventDetail }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stageRef = useRef<HTMLElement>(null);

  const signQueryRef = useRef<string>("");

  const signedCacheRef = useRef<Map<string, SignedEntry>>(new Map());

  const recordings = useMemo(
    () =>
      [...event.recordings].sort(
        (a, b) =>
          a.camera_number - b.camera_number ||
          (a.recording_started_at ?? "").localeCompare(
            b.recording_started_at ?? "",
          ),
      ),
    [event.recordings],
  );

  const [camIdx, setCamIdx] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seeking, setSeeking] = useState(false);

  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [qualityIdx, setQualityIdx] = useState(-1);
  const [qualityOpen, setQualityOpen] = useState(false);
  const qualityRef = useRef<HTMLDivElement>(null);

  const [isFs, setIsFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const [idle, setIdle] = useState(false);

  const activeRecording = recordings[camIdx] ?? null;
  const is360 = activeRecording != null;

  const pendingSeekRef = useRef<number | null>(null);

  const loadSignedUrl = useCallback(
    async (recordingId: string, seekTo: number | null) => {
      setSwitching(true);
      setSignError(null);
      const cached = signedCacheRef.current.get(recordingId);
      const isFresh = cached && cached.expiresAt - Date.now() > 5 * 60 * 1000;
      let url = cached?.url;
      if (!isFresh) {
        const res = await api.signRecordingUrl(recordingId);
        if (!res.ok) {
          setSignError(res.error);
          setSwitching(false);
          return;
        }
        url = res.data.url;
        signedCacheRef.current.set(recordingId, {
          url,
          expiresAt: new Date(res.data.expires_at).getTime(),
        });
      }
      pendingSeekRef.current = seekTo;
      setCurrentSrc(url!);
    },
    [],
  );

  useEffect(() => {
    if (recordings.length === 0) return;
    let alive = true;
    const ctrl = new AbortController();
    void Promise.all(
      recordings.map(async (rec) => {
        let entry = signedCacheRef.current.get(rec.id);
        if (!entry) {
          const res = await api.signRecordingUrl(rec.id);
          if (!alive || !res.ok) return;
          entry = {
            url: res.data.url,
            expiresAt: new Date(res.data.expires_at).getTime(),
          };
          signedCacheRef.current.set(rec.id, entry);
        }
        try {
          await fetch(entry.url, {
            signal: ctrl.signal,
            cache: "force-cache",
          });
        } catch {}
      }),
    );
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [recordings]);

  useEffect(() => {
    if (recordings.length === 0) return;
    void loadSignedUrl(recordings[0].id, null);
  }, [recordings, loadSignedUrl]);

  const switchCamera = useCallback(
    (nextIdx: number) => {
      if (nextIdx === camIdx) return;
      const rec = recordings[nextIdx];
      if (!rec) return;
      const t = videoRef.current?.currentTime ?? 0;
      setCamIdx(nextIdx);
      void loadSignedUrl(rec.id, t);
    },
    [camIdx, recordings, loadSignedUrl],
  );

  useEffect(() => {
    const video = videoRef.current;
    const url = currentSrc;
    if (!video || !url) return;

    try {
      signQueryRef.current = new URL(url).search.replace(/^\?/, "");
    } catch {
      signQueryRef.current = "";
    }
    setQualityLevels([]);
    setQualityIdx(-1);

    const applyPendingSeek = () => {
      const seek = pendingSeekRef.current;
      if (seek !== null && Number.isFinite(seek)) {
        try {
          video.currentTime = seek;
        } catch {}
      }
      pendingSeekRef.current = null;
      setSwitching(false);
      video.play().catch(() => {});
    };

    const urlPath = (() => {
      try {
        return new URL(url).pathname.toLowerCase();
      } catch {
        return url.toLowerCase();
      }
    })();
    const isMp4 = urlPath.endsWith(".mp4");

    if (isMp4) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = url;
      const onLoaded = () => applyPendingSeek();
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }

    if (Hls.isSupported()) {
      let hls = hlsRef.current;
      if (!hls) {
        const BaseLoader = Hls.DefaultConfig.loader;
        const signRef = signQueryRef;
        class SignedLoader extends BaseLoader {
          load(
            context: Parameters<InstanceType<typeof BaseLoader>["load"]>[0],
            config: Parameters<InstanceType<typeof BaseLoader>["load"]>[1],
            callbacks: Parameters<InstanceType<typeof BaseLoader>["load"]>[2],
          ) {
            const sign = signRef.current;
            if (sign && context.url && !context.url.includes("Signature=")) {
              const sep = context.url.includes("?") ? "&" : "?";
              context.url = `${context.url}${sep}${sign}`;
            }
            return super.load(context, config, callbacks);
          }
        }
        const isMobileVod =
          typeof navigator !== "undefined" &&
          /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: isMobileVod,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 120 * 1000 * 1000,
          backBufferLength: 30,
          abrEwmaDefaultEstimate: 20_000_000,
          abrBandWidthFactor: 0.95,
          abrBandWidthUpFactor: 0.8,
          capLevelOnFPSDrop: true,
          startFragPrefetch: true,
          loader: SignedLoader,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error("[hls] fatal", data.type, data.details, data);
          }
        });
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
        });
        hls.attachMedia(video);
      }
      hls.loadSource(url);
      const onLoaded = () => applyPendingSeek();
      video.addEventListener("loadedmetadata", onLoaded, { once: true });

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      const onLoaded = () => applyPendingSeek();
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }
  }, [currentSrc]);

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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
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
      console.warn("[vod-audio] boost init failed:", err);
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
    const v = videoRef.current;
    if (!v) return;
    const syncPlay = () => setPaused(v.paused);
    const onDur = () => setDuration(v.duration || 0);
    const onTime = () => {
      if (!seeking) setCurrentTime(v.currentTime || 0);
    };
    v.addEventListener("play", syncPlay);
    v.addEventListener("pause", syncPlay);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("play", syncPlay);
      v.removeEventListener("pause", syncPlay);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [seeking]);

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
    const isMobile3DVod =
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile3DVod ? 2 : 3),
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
    let prevX = 0;
    let prevY = 0;
    let rotX = 0;
    let rotY = 0;

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
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stage = stageRef.current;
    if (!stage) return;
    const onActivity = () => {
      setIdle(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3500);
    };
    const onLeave = () => setIdle(false);
    stage.addEventListener("mousemove", onActivity);
    stage.addEventListener("mouseleave", onLeave);
    stage.addEventListener("touchstart", onActivity, { passive: true });
    stage.addEventListener("touchmove", onActivity, { passive: true });
    onActivity();
    return () => {
      if (timer) clearTimeout(timer);
      stage.removeEventListener("mousemove", onActivity);
      stage.removeEventListener("mouseleave", onLeave);
      stage.removeEventListener("touchstart", onActivity);
      stage.removeEventListener("touchmove", onActivity);
    };
  }, [isFs, pseudoFs]);

  const toggleStageFs = useCallback(async () => {
    const stage = stageRef.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (inFs || pseudoFs) {
      if (inFs) {
        try {
          await (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
        } catch {}
      }
      if (pseudoFs) setPseudoFs(false);
      return;
    }
    if (stage) {
      const requestFs =
        stage.requestFullscreen?.bind(stage) ||
        stage.webkitRequestFullscreen?.bind(stage);
      if (requestFs) {
        try {
          await requestFs();
          if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
        } catch {}
      }
    }
    setPseudoFs(true);
  }, [pseudoFs]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const skipBack = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 15);
  };

  const skipForward = () => {
    const v = videoRef.current;
    if (!v) return;
    const max = Number.isFinite(duration) && duration > 0 ? duration : v.duration;
    v.currentTime = Math.min(max || v.currentTime, v.currentTime + 15);
  };

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewHlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const v = previewVideoRef.current;
    const url = currentSrc;
    if (!v || !url) return;
    v.muted = true;
    if (Hls.isSupported()) {
      let hls = previewHlsRef.current;
      if (!hls) {
        hls = new Hls({ startLevel: 0, autoStartLoad: false });
        previewHlsRef.current = hls;
        hls.attachMedia(v);
      }
      hls.loadSource(url);
      hls.startLoad();
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
    }
  }, [currentSrc]);

  useEffect(() => {
    return () => {
      if (previewHlsRef.current) {
        previewHlsRef.current.destroy();
        previewHlsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seeking) return;
    const pv = previewVideoRef.current;
    if (pv && Number.isFinite(currentTime)) {
      try {
        pv.currentTime = currentTime;
      } catch {}
    }
  }, [currentTime, seeking]);

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

  const onSeekInput = (e: ChangeEvent<HTMLInputElement>) => {
    setSeeking(true);
    setCurrentTime(parseFloat(e.target.value));
  };

  const onSeekCommit = () => {
    const v = videoRef.current;
    if (v && Number.isFinite(currentTime)) {
      v.currentTime = currentTime;
    }
    setSeeking(false);
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center text-[rgba(255,255,255,0.6)] text-[14px] py-20">
        {t("vod_no_recordings")}
      </div>
    );
  }

  return (
    <div className={VIEWER_BODY_CLS}>
      <aside className={VIEWER_ANGLES_CLS} aria-label="Камерын өнцөг">
        {recordings.map((rec, i) => (
          <button
            key={rec.id}
            type="button"
            className={`${VIEWER_ANGLE_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
            onClick={() => switchCamera(i)}
          >
            <span
              className={VIEWER_ANGLE_THUMB_CLS}
              style={{ background: "#0b1929", position: "relative" }}
            >
              {event.thumbnail_url && (
                <img
                  src={event.thumbnail_url}
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
            </span>
            <span className={VIEWER_ANGLE_LABEL_CLS}>
              <strong>{camLabel(rec)}</strong>
              <small>{camSub(rec)}</small>
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
              width: "100%",
              height: "100%",
              objectFit: isFs || pseudoFs ? "cover" : "contain",
              display: is360 ? "none" : "block",
            }}
            poster={event.thumbnail_url ?? undefined}
            onDoubleClick={toggleStageFs}
          />
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              display: is360 ? "block" : "none",
              cursor: "grab",
              touchAction: "none",
            }}
            onDoubleClick={toggleStageFs}
          />

          {switching && (
            <div
              className="absolute inset-0 grid place-items-center bg-[rgba(11,15,26,0.5)] [backdrop-filter:blur(2px)] z-[3]"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3 text-white">
                <span
                  className="w-9 h-9 rounded-full border-[3px] border-solid border-white/20 border-t-white/85"
                  style={{ animation: "vodSpin 0.8s linear infinite" }}
                  aria-hidden="true"
                />
                <span className="text-[13px] font-semibold">
                  {t("vod_camera_switching")}
                </span>
              </div>
            </div>
          )}

          {signError && !switching && (
            <div
              className="absolute inset-0 grid place-items-center bg-[rgba(11,15,26,0.7)] z-[3]"
              aria-live="polite"
            >
              <div className="text-center text-white">
                <p className="text-[14px] font-semibold m-0">{signError}</p>
                <button
                  type="button"
                  onClick={() => activeRecording && switchCamera(camIdx)}
                  className="mt-3 inline-flex items-center gap-2 py-2 px-3 rounded-[10px] bg-[rgba(255,255,255,0.1)] border border-solid border-[rgba(255,255,255,0.18)] text-white text-[12.5px] font-semibold"
                >
                  {t("vod_loading")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className={VIEWER_MOBILE_CAMS_CLS}
          role="group"
          aria-label="Камерын өнцөг"
        >
          {recordings.map((rec, i) => (
            <button
              key={rec.id}
              type="button"
              className={`${VIEWER_MOBILE_CAM_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
              onClick={() => switchCamera(i)}
              aria-label={camLabel(rec)}
              aria-pressed={camIdx === i}
            >
              <span
                className={VIEWER_MOBILE_CAM_THUMB_CLS}
                style={{ background: "#0b1929" }}
              >
                {event.thumbnail_url && (
                  <img
                    src={event.thumbnail_url}
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
              </span>
              <span className={VIEWER_MOBILE_CAM_LABEL_CLS}>
                {camLabel(rec)}
              </span>
            </button>
          ))}
        </div>

        <div className={VIEWER_CONTROLS_CLS}>
          <div className={VIEWER_CONTROLS_LEFT_CLS}>
            <button
              type="button"
              className={VIEWER_ICON_BTN_CLS}
              onClick={skipBack}
              aria-label="15 секунд хойшоо"
              title="15 сек хойшоо"
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
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 4 3 10 9 10" />
                <text x="12" y="16" fontSize="8" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">15</text>
              </svg>
            </button>
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
              className={VIEWER_ICON_BTN_CLS}
              onClick={skipForward}
              aria-label="15 секунд урагшаа"
              title="15 сек урагшаа"
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
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <polyline points="21 4 21 10 15 10" />
                <text x="12" y="16" fontSize="8" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">15</text>
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
            <span className="text-[12px] font-semibold text-[rgba(255,255,255,0.65)] tabular-nums whitespace-nowrap max-[540px]:hidden">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          <div className="relative flex-1 min-w-0 px-2 flex items-center gap-2.5 max-[720px]:[flex-basis:100%] max-[720px]:order-3 max-[720px]:px-1 max-[720px]:gap-3">
            {seeking && duration > 0 && (
              <div
                className="absolute bottom-full mb-3 z-[5] pointer-events-none"
                style={{
                  left: `calc(${Math.min(100, Math.max(0, (currentTime / duration) * 100))}% )`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="rounded-[10px] overflow-hidden bg-black border border-solid border-[rgba(255,255,255,0.18)] shadow-[0_12px_28px_-8px_rgba(0,0,0,0.7)]">
                  <video
                    ref={previewVideoRef}
                    muted
                    playsInline
                    preload="auto"
                    className="block w-[148px] aspect-video object-cover bg-black"
                  />
                </div>
                <div className="text-center mt-1 text-[11px] font-bold tracking-[.04em] text-white bg-[rgba(11,15,26,0.8)] py-0.5 px-2 rounded-full inline-block left-1/2 -translate-x-1/2 relative tabular-nums">
                  {fmtTime(currentTime)}
                </div>
              </div>
            )}
            <input
              type="range"
              min={0}
              max={Number.isFinite(duration) && duration > 0 ? duration : 1}
              step={0.1}
              value={Math.min(currentTime, duration || currentTime)}
              onMouseDown={() => setSeeking(true)}
              onTouchStart={() => setSeeking(true)}
              onChange={onSeekInput}
              onMouseUp={onSeekCommit}
              onTouchEnd={onSeekCommit}
              onKeyUp={onSeekCommit}
              aria-label="Тоглуулах байрлал"
              style={{
                background: `linear-gradient(to right, rgb(34 48 198) 0%, rgb(34 48 198) ${
                  duration > 0
                    ? Math.min(100, (currentTime / duration) * 100)
                    : 0
                }%, rgba(255,255,255,0.18) ${
                  duration > 0
                    ? Math.min(100, (currentTime / duration) * 100)
                    : 0
                }%, rgba(255,255,255,0.18) 100%)`,
              }}
              className="w-full h-1.5 rounded-full cursor-pointer [appearance:none] [-webkit-appearance:none] max-[720px]:h-[5px] [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-brand-blue [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)] max-[720px]:[&::-webkit-slider-thumb]:w-[18px] max-[720px]:[&::-webkit-slider-thumb]:h-[18px] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-brand-blue"
            />
            <span className="text-[12px] font-semibold text-white/85 tabular-nums whitespace-nowrap hidden max-[540px]:inline">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          <div className={VIEWER_CONTROLS_RIGHT_CLS}>
            {(() => {
              const visible = qualityLevels.filter(
                (l) =>
                  l.height === 480 || l.height === 720 || l.height === 1080,
              );
              const currentLabel =
                qualityIdx === -1
                  ? "Auto"
                  : (qualityLevels.find((l) => l.index === qualityIdx)?.label ??
                    "Auto");
              return (
                <div
                  ref={qualityRef}
                  className="relative inline-flex items-center gap-2 text-xs text-[rgba(255,255,255,0.7)] max-[720px]:gap-1.5"
                >
                  <span className="max-[540px]:hidden">Чанар</span>
                  <button
                    type="button"
                    onClick={() => setQualityOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={qualityOpen}
                    className="inline-flex items-center justify-between gap-2 min-w-[78px] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.1)] text-white font-semibold text-[12.5px] pt-[7px] pr-2.5 pb-[7px] pl-3 rounded-[9px] cursor-pointer hover:bg-[rgba(255,255,255,0.1)] max-[720px]:h-11 max-[720px]:px-3 max-[720px]:text-[13px] max-[720px]:rounded-xl"
                  >
                    <span>{currentLabel}</span>
                    <svg
                      viewBox="0 0 10 6"
                      width="9"
                      height="5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`shrink-0 [transition:transform_.15s_ease] ${qualityOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M1 1l4 4 4-4" />
                    </svg>
                  </button>
                  {qualityOpen && (
                    <ul
                      role="listbox"
                      aria-label="Чанар"
                      className="absolute bottom-full right-0 mb-2 z-[20] min-w-[110px] p-1 list-none rounded-[12px] bg-[rgba(17,22,35,0.96)] border border-solid border-[rgba(255,255,255,0.1)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
                    >
                      {[
                        { idx: -1, label: "Auto" },
                        ...visible.map((l) => ({
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
                              className={`w-full inline-flex items-center gap-2 text-left font-semibold text-[12.5px] py-2 px-3 rounded-[8px] cursor-pointer bg-transparent border-0 text-white hover:bg-[rgba(255,255,255,0.08)] ${selected ? "bg-[rgba(34,48,198,0.25)]" : ""}`}
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

      <style>{`@keyframes vodSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
