import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import type { KioskEvent, KioskScanResult, ScanVerdict } from "@cs360/shared";
import { api } from "../../lib/api";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

/** Longest edge of the frame handed to jsQR — full-res frames stall phones. */
const MAX_SCAN_EDGE = 640;
/** Decoding every rAF tick burns battery for no gain; ~10 fps is plenty. */
const SCAN_INTERVAL_MS = 100;
/** A code POSTed once is ignored for this long (double-tap / flicker guard). */
const REPEAT_COOLDOWN_MS = 5000;
/** Session history cap — the aside is a working list, not an audit log. */
const HISTORY_LIMIT = 30;

type Tone = "ok" | "warn" | "bad";

const VERDICTS: Record<ScanVerdict, { title: string; tone: Tone }> = {
  admitted: { title: "ТАСАЛБАР АМЖИЛТТАЙ УНШЛАА", tone: "ok" },
  already_used: { title: "УНШУУЛСАН КОД?", tone: "warn" },
  voided: { title: "ХҮЧИНГҮЙ ТАСАЛБАР", tone: "bad" },
  not_found: { title: "ТАСАЛБАР ОЛДСОНГҮЙ", tone: "bad" },
  wrong_event: { title: "ӨӨР АРГА ХЭМЖЭЭ", tone: "bad" },
};

const TONE_CLS: Record<Tone, string> = {
  ok: "bg-emerald-500 text-white",
  warn: "bg-amber-400 text-amber-950",
  bad: "bg-red-500 text-white",
};

const TONE_DOT_CLS: Record<Tone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-400",
  bad: "bg-red-500",
};

type CameraState = "idle" | "starting" | "running";

type Panel =
  | { kind: "result"; result: KioskScanResult }
  | { kind: "error"; message: string }
  | null;

type HistoryEntry = { result: KioskScanResult; at: number };

function clockTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Printed kiosk tickets encode the bare ticket code, but a QR carrying a
 * verification URL still resolves to one. The backend upper-cases too — doing
 * it here keeps the client-side duplicate map keyed consistently.
 */
function normalizeCode(raw: string): string {
  let text = raw.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      text =
        url.searchParams.get("code") ??
        url.pathname.split("/").filter(Boolean).pop() ??
        "";
    } catch {
      // Not a parseable URL — fall through with the raw payload.
    }
  }
  return text.trim().toUpperCase().slice(0, 64);
}

function cameraErrorMessage(err: unknown): string {
  const name =
    err instanceof DOMException
      ? err.name
      : typeof err === "object" && err !== null && "name" in err
        ? String((err as { name?: unknown }).name ?? "")
        : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Камер ашиглах зөвшөөрөл олгогдоогүй байна. Хөтчийн хаягийн мөрөнд байрлах түгжээ дээр дарж камерыг зөвшөөрнө үү. Камер зөвхөн HTTPS холболт дээр ажилладаг.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "Камер олдсонгүй. Энэ төхөөрөмж дээр ашиглах боломжтой камер алга байна.";
    case "NotReadableError":
    case "TrackStartError":
      return "Камерыг нээж чадсангүй. Өөр програм камерыг ашиглаж байгаа эсэхийг шалгаад дахин оролдоно уу.";
    case "AbortError":
      return "Камер асаах үйлдэл тасалдлаа. Дахин оролдоно уу.";
    default:
      return "Камер асаахад алдаа гарлаа. Дахин оролдоно уу.";
  }
}

function requestErrorMessage(status: number, error: string): string {
  if (status === 0)
    return "Сүлжээнд холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин уншуулна уу.";
  if (status === 401 || status === 403)
    return "Эрх хүрэлцэхгүй байна. Дахин нэвтэрч орно уу.";
  if (status === 400) return "Тасалбарын код буруу байна.";
  return `Шалгах үед алдаа гарлаа (${error}).`;
}

export default function Scan() {
  const [events, setEvents] = useState<KioskEvent[] | null>(null);
  const [eventId, setEventId] = useState("");
  const [camera, setCamera] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  /** The code currently held in front of the lens — ignored until it changes. */
  const lastSeenRef = useRef<string | null>(null);
  const recentRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef(false);
  const cameraRef = useRef<CameraState>("idle");
  const eventIdRef = useRef("");
  const mountedRef = useRef(true);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    api.admin.kiosk.listEvents().then((res) => {
      if (!alive) return;
      setEvents(res.ok && Array.isArray(res.data) ? res.data : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const submitCode = useCallback(
    async (raw: string, source: "camera" | "manual"): Promise<void> => {
      const code = normalizeCode(raw);
      if (!code) return;
      // One request at a time: overlapping POSTs would race the server's
      // single-use update and double-report the same ticket.
      if (inFlightRef.current) return;

      const now = Date.now();
      const recent = recentRef.current;
      for (const [key, at] of recent) {
        if (now - at > REPEAT_COOLDOWN_MS) recent.delete(key);
      }
      // Manual entry is a deliberate act, so it bypasses the cooldown; the
      // camera fires many frames a second and must not re-POST the same code.
      const seen = recent.get(code);
      if (source === "camera" && seen !== undefined) return;
      recent.set(code, now);

      inFlightRef.current = true;
      setBusy(true);
      const res = await api.admin.kiosk.scan(code, eventIdRef.current || null);
      inFlightRef.current = false;
      if (!mountedRef.current) return;
      setBusy(false);

      if (!res.ok) {
        // A failed request proves nothing about the ticket — never fake a
        // verdict from it. The frame latch still holds this code, so retrying
        // means re-presenting the ticket or typing it in by hand.
        setPanel({
          kind: "error",
          message: requestErrorMessage(res.status, res.error),
        });
        if (typeof navigator.vibrate === "function")
          navigator.vibrate([70, 40, 70]);
        return;
      }

      const result = res.data;
      setPanel({ kind: "result", result });
      setHistory((h) =>
        [{ result, at: Date.now() }, ...h].slice(0, HISTORY_LIMIT),
      );
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(result.verdict === "admitted" ? 60 : [70, 40, 70]);
      }
    },
    [],
  );

  const tick = useCallback((): void => {
    rafRef.current = requestAnimationFrame(tick);

    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Metadata not in yet, or the tab was backgrounded — nothing to read.
    if (video.readyState < 2 || vw === 0 || vh === 0) return;

    const now = performance.now();
    if (now - lastFrameRef.current < SCAN_INTERVAL_MS) return;
    lastFrameRef.current = now;

    const scale = Math.min(1, MAX_SCAN_EDGE / Math.max(vw, vh));
    const w = Math.max(1, Math.round(vw * scale));
    const h = Math.max(1, Math.round(vh * scale));

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    let image: ImageData;
    try {
      image = ctx.getImageData(0, 0, w, h);
    } catch {
      return;
    }

    const found = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
    const text = found?.data?.trim();
    if (!text) return;

    // Same ticket still in the frame: skip until a different code appears.
    if (text === lastSeenRef.current) return;
    // A POST is still open. Leave the latch untouched so a later frame picks
    // this code up — an admin swapping to the next ticket before the previous
    // response lands must not have that second ticket silently swallowed.
    if (inFlightRef.current) return;
    lastSeenRef.current = text;
    void submitCode(text, "camera");
  }, [submitCode]);

  const stopCamera = useCallback((): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    lastSeenRef.current = null;
    cameraRef.current = "idle";
    setCamera("idle");
  }, []);

  const startCamera = useCallback(async (): Promise<void> => {
    if (cameraRef.current !== "idle") return;
    setCameraError("");

    const media = navigator.mediaDevices;
    if (!media || typeof media.getUserMedia !== "function") {
      setCameraError(
        window.isSecureContext === false
          ? "Камер зөвхөн HTTPS холболт дээр ажилладаг. Хаягаа https:// хаягаар нээгээд дахин оролдоно уу."
          : "Энэ хөтөч камерын уншилтыг дэмжихгүй байна. Кодыг гараар оруулна уу.",
      );
      return;
    }

    cameraRef.current = "starting";
    setCamera("starting");

    let stream: MediaStream;
    try {
      stream = await media.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
    } catch (err) {
      cameraRef.current = "idle";
      setCamera("idle");
      setCameraError(cameraErrorMessage(err));
      return;
    }

    const video = videoRef.current;
    // Unmounted (or torn down) while the permission prompt was open — the
    // stream must still be released or the camera light stays on.
    if (!mountedRef.current || !video) {
      for (const track of stream.getTracks()) track.stop();
      cameraRef.current = "idle";
      setCamera("idle");
      return;
    }

    streamRef.current = stream;
    video.srcObject = stream;
    video.muted = true;
    try {
      await video.play();
    } catch {
      // Some browsers reject play() on a hidden/backgrounded tab; the rAF
      // loop simply idles until frames arrive.
    }

    if (!mountedRef.current) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    lastSeenRef.current = null;
    lastFrameRef.current = 0;
    cameraRef.current = "running";
    setCamera("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Release the camera on unmount — a leaked track keeps the phone's camera
  // indicator lit long after the admin has navigated away.
  useEffect(() => stopCamera, [stopCamera]);

  const onManualSubmit = (): void => {
    const value = manual.trim();
    if (!value || busy) return;
    setManual("");
    void submitCode(value, "manual");
  };

  const admittedCount = useMemo(
    () => history.filter((h) => h.result.verdict === "admitted").length,
    [history],
  );

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Тасалбар шалгах</h2>
          <p>
            Утасны камераар зарагдсан тасалбарын QR кодыг уншуулж нэвтрэлтийг
            баталгаажуулна. Нэг тасалбар зөвхөн нэг удаа нэвтэрнэ.
          </p>
        </div>
      </div>

      <div className={ADMIN_FILTERS_CLS}>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          aria-label="Арга хэмжээ"
        >
          <option value="">Бүх арга хэмжээ</option>
          {(events ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>

        {camera === "running" ? (
          <button
            type="button"
            onClick={stopCamera}
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            Камер унтраах
          </button>
        ) : (
          <button
            type="button"
            disabled={camera === "starting"}
            onClick={() => void startCamera()}
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
          >
            {camera === "starting" ? "Камер асааж байна…" : "Камер асаах"}
          </button>
        )}

        {history.length > 0 && (
          <span className="text-[12px] text-zinc-500 ml-auto tabular-nums">
            Энэ сесст{" "}
            <strong className="font-semibold text-zinc-900">
              {history.length}
            </strong>{" "}
            уншуулалт ·{" "}
            <strong className="font-semibold text-zinc-900">
              {admittedCount}
            </strong>{" "}
            нэвтэрсэн
          </span>
        )}
      </div>

      <div className="grid gap-4 [grid-template-columns:minmax(0,1fr)_320px] max-[1100px]:[grid-template-columns:minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          <VerdictBanner panel={panel} busy={busy} />

          <div className="bg-white border border-[#ececef] rounded-xl overflow-hidden">
            {/* Portrait viewfinder on phones, but capped so the manual-entry
                card below it stays reachable without a long scroll. */}
            <div className="relative bg-zinc-950 aspect-[4/3] max-[640px]:aspect-[3/4] max-[640px]:max-h-[58vh]">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`h-full w-full object-cover ${
                  camera === "running" ? "" : "invisible"
                }`}
              />

              {camera === "running" ? (
                <div className="pointer-events-none absolute inset-0">
                  {/* Centred explicitly rather than by grid placement: the
                      frame is sized off the box height, so `max-w-[80%]` (with
                      aspect-square flipping the constraint to the width) keeps
                      it inside a narrow phone box too. */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square h-[62%] max-w-[80%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,.35)] max-[640px]:h-[52%]" />
                  {/* A shrink-to-fit box positioned with `left-1/2` may only
                      grow to half the container, so this long hint used to sit
                      off-centre. Full-width flex row centres it at any width. */}
                  <div className="absolute inset-x-0 bottom-3 flex justify-center px-4 max-[640px]:bottom-4 max-[640px]:px-3">
                    <span className="rounded-full bg-black/60 px-3 py-1 text-center text-[12px] text-white max-[640px]:px-3.5 max-[640px]:py-1.5 max-[640px]:text-[13px]">
                      {busy ? "Шалгаж байна…" : "QR кодыг хүрээнд байрлуулна уу"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 grid place-items-center px-6 text-center max-[640px]:px-5">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-500"
                      aria-hidden="true"
                    >
                      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                      <rect x="7" y="7" width="10" height="10" rx="2" />
                    </svg>
                    <p className="m-0 text-[13.5px] text-zinc-400 max-w-[320px] max-[640px]:text-[14px]">
                      {camera === "starting"
                        ? "Камер асааж байна. Хөтчийн асуултад «Зөвшөөрөх» гэж хариулна уу."
                        : "«Камер асаах» дарж тасалбарын QR кодыг уншуулна уу."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="border-t border-[#ececef] bg-red-50 px-5 py-3.5 text-[13px] leading-[1.5] text-red-800 max-[640px]:px-4 max-[640px]:break-words">
                {cameraError}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#ececef] rounded-xl p-5 max-[640px]:p-4">
            <div className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium mb-3">
              Кодыг гараар оруулах
            </div>
            <div className={`${ADMIN_FIELD_CLS} !flex-row !items-center gap-2`}>
              <input
                type="text"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onManualSubmit();
                  }
                }}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Тасалбарын код"
                className="!flex-1 !min-w-0 font-mono !tracking-wide"
              />
              <button
                type="button"
                onClick={onManualSubmit}
                disabled={busy || manual.trim().length === 0}
                className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS} !h-10 shrink-0`}
              >
                {busy ? "Шалгаж байна…" : "Шалгах"}
              </button>
            </div>
            <p className="m-0 mt-2.5 text-[12px] text-zinc-500">
              Камер ажиллахгүй, эсвэл QR код гэмтсэн үед тасалбар дээрх кодыг
              бичиж шалгана.
            </p>
          </div>
        </div>

        <ScanHistory entries={history} onClear={() => setHistory([])} />
      </div>
    </>
  );
}

function VerdictBanner({ panel, busy }: { panel: Panel; busy: boolean }) {
  if (panel?.kind === "error") {
    return (
      <div className="rounded-2xl bg-red-500 px-6 py-8 text-center text-white max-[640px]:px-4 max-[640px]:py-6">
        <div className="text-[24px] font-bold leading-tight tracking-tight max-[640px]:text-[22px]">
          АЛДАА ГАРЛАА
        </div>
        <div className="text-[14px] opacity-90 mt-2 max-[640px]:break-words">
          {panel.message}
        </div>
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e4e4e7] bg-white px-6 py-8 text-center max-[640px]:px-4 max-[640px]:py-6">
        <div className="text-[16px] font-medium text-zinc-900">
          Тасалбар уншуулна уу
        </div>
        <p className="m-0 mt-1.5 text-[13px] text-zinc-500">
          Уншуулсны дараа үр дүн энд том хэмжээгээр харагдана.
        </p>
      </div>
    );
  }

  const { result } = panel;
  const verdict = VERDICTS[result.verdict];

  return (
    <div
      className={`rounded-2xl px-6 py-8 text-center transition-colors max-[640px]:px-4 max-[640px]:py-7 ${TONE_CLS[verdict.tone]}`}
      role="status"
      aria-live="polite"
    >
      <div className="text-[26px] max-[640px]:text-[24px] font-bold leading-tight tracking-tight max-[640px]:[overflow-wrap:anywhere]">
        {verdict.title}
      </div>
      <div className="text-[14px] opacity-90 mt-2 max-[640px]:[overflow-wrap:anywhere]">
        {result.zone_name_mn ? `${result.zone_name_mn} · ` : ""}
        {result.event_title ?? "—"}
      </div>
      {result.used_at && (
        <div className="text-[13px] opacity-90 mt-1">
          {result.verdict === "already_used"
            ? "Өмнө нэвтэрсэн: "
            : "Нэвтэрсэн: "}
          {clockTime(result.used_at)}
        </div>
      )}
      <div className="font-mono text-[12.5px] opacity-80 mt-3 break-all">
        {result.code}
      </div>
      {result.sold > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/15 px-3.5 py-1.5 text-[13px] font-semibold tabular-nums max-[640px]:mt-3.5">
          Нэвтэрсэн {result.admitted}/{result.sold}
        </div>
      )}
      {busy && <div className="mt-3 text-[12px] opacity-80">Шалгаж байна…</div>}
    </div>
  );
}

function ScanHistory({
  entries,
  onClear,
}: {
  entries: HistoryEntry[];
  onClear: () => void;
}) {
  return (
    <aside className="bg-white border border-[#ececef] rounded-xl p-4 self-start">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium">
          Уншуулсан тасалбар
        </span>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS} ${ADMIN_BTN_SM_CLS}`}
          >
            Цэвэрлэх
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-[13px] text-zinc-500 m-0">
          Одоогоор уншуулаагүй байна.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry) => {
            const verdict = VERDICTS[entry.result.verdict];
            return (
              // Below 640px a long verdict label cannot share a line with a
              // ticket code, so it drops onto a second line of the same row.
              <div
                key={`${entry.result.code}-${entry.at}`}
                className="flex items-center gap-2 text-[12.5px] py-1.5 max-[640px]:flex-wrap max-[640px]:gap-y-0.5 max-[640px]:py-2 max-[640px]:text-[13px] max-[640px]:border-b max-[640px]:border-[#f4f4f5] max-[640px]:[&:last-child]:border-b-0"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full shrink-0 ${TONE_DOT_CLS[verdict.tone]}`}
                  aria-hidden="true"
                />
                <span className="font-mono text-zinc-700 truncate max-[640px]:font-medium">
                  {entry.result.code}
                </span>
                <span className="ml-auto text-zinc-500 shrink-0 text-[11.5px] max-[640px]:basis-full max-[640px]:!ml-0 max-[640px]:pl-4 max-[640px]:text-[12px]">
                  {verdict.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
