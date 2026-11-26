import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import jsQR from "jsqr";

// Rear-camera QR reader: decodes frames off a <video> with jsQR and hands each
// new code to `onCode` once (the same code is ignored until another one shows).

const MAX_SCAN_EDGE = 640;
const SCAN_INTERVAL_MS = 100;

export type CameraState = "idle" | "starting" | "running";

export function cameraErrorMessage(err: unknown): string {
  const name =
    err instanceof DOMException
      ? err.name
      : typeof err === "object" && err !== null && "name" in err
        ? String((err as { name?: unknown }).name ?? "")
        : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Камер ашиглах зөвшөөрөл олгогдоогүй байна. Хаягийн мөрөн дэх түгжээ дээр дарж камерыг зөвшөөрнө үү.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "Камер олдсонгүй.";
    case "NotReadableError":
    case "TrackStartError":
      return "Камерыг нээж чадсангүй. Өөр програм камерыг ашиглаж байгаа эсэхийг шалгана уу.";
    default:
      return "Камер асаахад алдаа гарлаа. Дахин оролдоно уу.";
  }
}

/** Ticket code from a scanned QR, which may be a bare code or a URL ending in it. */
export function normalizeScannedCode(raw: string): string {
  let text = raw.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      text = url.searchParams.get("code") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
      /* keep the raw text */
    }
  }
  return text.trim().toUpperCase().slice(0, 64);
}

export function useQrCamera(onCode: (code: string) => void): {
  videoRef: RefObject<HTMLVideoElement>;
  camera: CameraState;
  error: string;
  start: () => Promise<void>;
  stop: () => void;
  /** Let the last code be read again (e.g. after the result was dismissed). */
  rearm: () => void;
} {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const lastSeenRef = useRef<string | null>(null);
  const stateRef = useRef<CameraState>("idle");
  const onCodeRef = useRef(onCode);
  const mountedRef = useRef(true);
  const [camera, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState("");

  onCodeRef.current = onCode;
  const setCamera = (s: CameraState) => {
    stateRef.current = s;
    setCameraState(s);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const tick = useCallback((): void => {
    rafRef.current = requestAnimationFrame(tick);
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const now = performance.now();
    if (now - lastFrameRef.current < SCAN_INTERVAL_MS) return;
    lastFrameRef.current = now;

    const scale = Math.min(1, MAX_SCAN_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(1, Math.round(video.videoWidth * scale));
    const h = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = (canvasRef.current ??= document.createElement("canvas"));
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
    const text = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" })?.data?.trim();
    if (!text || text === lastSeenRef.current) return;
    lastSeenRef.current = text;
    const code = normalizeScannedCode(text);
    if (code) onCodeRef.current(code);
  }, []);

  const stop = useCallback((): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    lastSeenRef.current = null;
    setCamera("idle");
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (stateRef.current !== "idle") return;
    setError("");
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setError(
        window.isSecureContext === false
          ? "Камер зөвхөн HTTPS холболт дээр ажилладаг."
          : "Энэ хөтөч камер дэмжихгүй байна. Кодыг гараар оруулна уу.",
      );
      return;
    }
    setCamera("starting");
    let stream: MediaStream;
    try {
      stream = await media.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
    } catch (err) {
      setCamera("idle");
      setError(cameraErrorMessage(err));
      return;
    }
    const video = videoRef.current;
    if (!mountedRef.current || !video) {
      for (const track of stream.getTracks()) track.stop();
      setCamera("idle");
      return;
    }
    streamRef.current = stream;
    video.srcObject = stream;
    video.muted = true;
    await video.play().catch(() => undefined);
    lastSeenRef.current = null;
    lastFrameRef.current = 0;
    setCamera("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => stop, [stop]);

  const rearm = useCallback(() => {
    lastSeenRef.current = null;
  }, []);

  return { videoRef, camera, error, start, stop, rearm };
}
