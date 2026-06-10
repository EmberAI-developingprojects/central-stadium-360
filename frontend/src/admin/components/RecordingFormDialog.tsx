import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import {
  ADMIN_ALERT_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_FIELD_CLS,
} from "../_adminStyles";

type ChannelArn = { camera_number: number; arn: string | null };

type Props = {
  open: boolean;
  eventId: string;
  cameraNumber: number;
  onClose: () => void;
  onCreated: () => void;
};

function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function joinKey(prefix: string): string {
  const trimmed = prefix.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return `${trimmed}/media/hls/master.m3u8`;
}

export default function RecordingFormDialog({
  open,
  eventId,
  cameraNumber,
  onClose,
  onCreated,
}: Props) {
  const [channelArn, setChannelArn] = useState("");
  const [bucket, setBucket] = useState("360stadium");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [durationSecs, setDurationSecs] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [channels, setChannels] = useState<ChannelArn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reset whenever the dialog opens for a new camera.
  useEffect(() => {
    if (!open) return;
    setChannelArn("");
    setKeyPrefix("");
    setDurationSecs("");
    setStartedAt("");
    setEndedAt("");
    setError("");
    setBusy(false);
  }, [open, cameraNumber]);

  // Load env-backed ARNs once per open so the dropdown is populated.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api.admin.listChannelArns().then((res) => {
      if (!alive) return;
      if (res.ok) {
        setChannels(res.data);
        const match = res.data.find((c) => c.camera_number === cameraNumber);
        if (match?.arn) setChannelArn(match.arn);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, cameraNumber]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const masterPath = useMemo(() => joinKey(keyPrefix), [keyPrefix]);

  if (!open) return null;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const prefix = keyPrefix.trim().replace(/\/+$/, "");
    if (!prefix) {
      setError("S3 key prefix шаардлагатай.");
      return;
    }
    const computedPath = `${prefix}/media/hls/master.m3u8`;

    setBusy(true);
    const res = await api.admin.createRecording({
      event_id: eventId,
      camera_number: cameraNumber,
      channel_arn: channelArn || null,
      s3_bucket: bucket.trim() || null,
      s3_key_prefix: prefix,
      master_playlist_path: computedPath,
      duration_seconds: durationSecs ? Number(durationSecs) || null : null,
      recording_started_at: localToIso(startedAt),
      recording_ended_at: localToIso(endedAt),
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-4 animate-admin-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rec-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[560px] rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-6 animate-admin-scale-in max-h-[90vh] overflow-y-auto">
        <header className="mb-5">
          <h3
            id="rec-dialog-title"
            className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-zinc-900"
          >
            Камер {cameraNumber}-ийн бичлэг нэмэх
          </h3>
          <p className="mt-1 text-[13px] text-zinc-500 m-0 leading-[1.5]">
            S3 дээрх IVS бичлэгийн зам, метадатаг оруулна уу.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && <div className={ADMIN_ALERT_CLS}>{error}</div>}

          <div className={ADMIN_FIELD_CLS}>
            <label htmlFor="rec-arn">IVS Channel ARN</label>
            <select
              id="rec-arn"
              value={channelArn}
              onChange={(e) => setChannelArn(e.target.value)}
            >
              <option value="">— Сонгох —</option>
              {channels.map((c) => (
                <option key={c.camera_number} value={c.arn ?? ""} disabled={!c.arn}>
                  Камер {c.camera_number}
                  {c.arn ? ` · ${c.arn.slice(-32)}` : " · тохируулагдаагүй"}
                </option>
              ))}
            </select>
          </div>

          <div
            className="grid gap-4 [grid-template-columns:1fr_2fr] max-[560px]:[grid-template-columns:1fr]"
          >
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="rec-bucket">S3 bucket</label>
              <input
                id="rec-bucket"
                type="text"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                placeholder="360stadium"
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="rec-prefix">S3 key prefix *</label>
              <input
                id="rec-prefix"
                type="text"
                value={keyPrefix}
                onChange={(e) => setKeyPrefix(e.target.value)}
                placeholder="ivs/v1/376715673271/abc123/2026/06/15/14/stream-xyz/"
                required
              />
            </div>
          </div>

          <div className={ADMIN_FIELD_CLS}>
            <label>master.m3u8 (автомат)</label>
            <code className="block font-mono text-[12px] text-zinc-700 bg-zinc-50 border border-[#e4e4e7] rounded-md py-2 px-3 break-all">
              {masterPath || <span className="text-zinc-400">—</span>}
            </code>
          </div>

          <div
            className="grid gap-4 [grid-template-columns:1fr_1fr_1fr] max-[640px]:[grid-template-columns:1fr]"
          >
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="rec-dur">Үргэлжлэх хугацаа (сек)</label>
              <input
                id="rec-dur"
                type="number"
                min={0}
                value={durationSecs}
                onChange={(e) => setDurationSecs(e.target.value)}
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="rec-start">Эхэлсэн</label>
              <input
                id="rec-start"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="rec-end">Дууссан</label>
              <input
                id="rec-end"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-1 border-t border-[#ececef]">
            <button
              type="button"
              onClick={onClose}
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            >
              {busy ? "Нэмэж байна…" : "Нэмэх"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
