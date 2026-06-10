import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AdminTicketRow, DbRecording, EventStatus } from "@cs360/shared";
import { api } from "../../lib/api";
import type { EventRecord } from "../../data/store";
import RecordingFormDialog from "../components/RecordingFormDialog";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const CARD_CLS =
  "bg-white border border-[#ececef] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(24,24,27,0.04)]";
const CARD_HEAD_CLS =
  "flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#f4f4f5] bg-gradient-to-b from-[#fafafa] to-white";
const CARD_HEAD_TITLE_CLS =
  "text-[14.5px] font-semibold tracking-[-0.01em] text-zinc-900 m-0 leading-tight";
const CARD_HEAD_DESC_CLS =
  "text-[12.5px] text-zinc-500 m-0 mt-0.5 leading-[1.45]";
const CARD_BODY_CLS = "p-6";

const STAT_GRID_CLS =
  "grid gap-3 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[860px]:[grid-template-columns:repeat(2,minmax(0,1fr))]";
const STAT_CARD_CLS =
  "bg-white border border-[#ececef] rounded-xl p-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]";
const STAT_LABEL_CLS =
  "text-[11.5px] uppercase tracking-[0.08em] font-semibold text-zinc-500";
const STAT_VALUE_CLS =
  "mt-2 text-[20px] font-bold text-zinc-900 tabular-nums";

const REC_ROW_CLS =
  "flex items-start gap-4 py-4 px-5 border-b border-[#f4f4f5] last:border-b-0";

type Stats = {
  liveCount: number;
  replayCount: number;
  revenue: number;
};

const money = (n: number) =>
  new Intl.NumberFormat("mn-MN").format(Math.round(n)) + "₮";

const statusLabel: Record<EventStatus, string> = {
  upcoming: "Удахгүй",
  live: "Шууд эфирт",
  ended: "Дууссан",
  archived: "Архивлагдсан",
  expired: "Хугацаа дууссан",
};

const statusClass: Record<EventStatus, string> = {
  upcoming: "bg-blue-50 text-blue-700 ring-blue-100",
  live: "bg-red-50 text-red-700 ring-red-100",
  ended: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  archived: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  expired: "bg-amber-50 text-amber-700 ring-amber-100",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDuration(secs: number | null | undefined): string {
  if (!secs || !Number.isFinite(secs)) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}ц ${m}м`;
  return `${m}м`;
}

function dbToRecord(row: import("@cs360/shared").DbEvent): EventRecord {
  return {
    id: row.id,
    title: row.title,
    desc: row.description ?? "",
    date: "",
    when: "",
    image: row.image ?? "",
    base: row.price,
    featured: row.featured,
    start_time: row.start_time,
    status: row.status,
    live_price: Number(row.live_price ?? 0),
    replay_price: Number(row.replay_price ?? 0),
    live_start_at: row.live_start_at,
    live_end_at: row.live_end_at,
    replay_available_until: row.replay_available_until,
    thumbnail_url: row.thumbnail_url,
  };
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [recordings, setRecordings] = useState<DbRecording[]>([]);
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogCam, setDialogCam] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [evRes, recRes, ticRes] = await Promise.all([
      api.admin.getEvent(id),
      api.admin.listEventRecordings(id),
      api.admin.listTickets({ eventId: id }),
    ]);
    if (evRes.ok) setEvent(dbToRecord(evRes.data));
    else setError(evRes.error);
    if (recRes.ok) setRecordings(recRes.data);
    if (ticRes.ok) setTickets(ticRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats = useMemo<Stats>(() => {
    let liveCount = 0;
    let replayCount = 0;
    let revenue = 0;
    for (const t of tickets) {
      if (t.status !== "paid") continue;
      if (t.ticket_type === "replay") replayCount += 1;
      else liveCount += 1;
      revenue += t.price;
    }
    return { liveCount, replayCount, revenue };
  }, [tickets]);

  const byCamera = useMemo(() => {
    const map = new Map<number, DbRecording>();
    for (const r of recordings) map.set(r.camera_number, r);
    return map;
  }, [recordings]);

  if (loading && !event) {
    return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;
  }

  if (!event) {
    return (
      <div className={ADMIN_EMPTY_CLS}>
        <strong>Олдсонгүй</strong>
        {error || "Арга хэмжээ олдсонгүй."}
        <div className="mt-3">
          <Link
            to="/admin/events"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            ← Жагсаалт
          </Link>
        </div>
      </div>
    );
  }

  const status = event.status;
  const readyCount = recordings.filter((r) => r.status === "ready").length;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div className="flex items-start gap-4">
          {event.thumbnail_url || event.image ? (
            <img
              src={event.thumbnail_url ?? event.image}
              alt=""
              className="w-16 h-16 rounded-xl object-cover ring-1 ring-[#ececef]"
            />
          ) : (
            <span
              className="w-16 h-16 rounded-xl bg-brand-blue-tint ring-1 ring-[#dadffb]"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="!m-0">{event.title}</h2>
              <span
                className={`inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-medium ring-1 ring-inset ${statusClass[status]}`}
              >
                {statusLabel[status]}
              </span>
            </div>
            <p className="!m-0 !mt-1 text-[13px] text-zinc-500">
              {fmtDate(event.start_time)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {status === "live" && (
            <Link
              to={`/watch`}
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            >
              Шууд үзэх →
            </Link>
          )}
          <Link
            to={`/admin/events/${event.id}/edit`}
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            Засах
          </Link>
          <Link
            to="/admin/events"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            ← Буцах
          </Link>
        </div>
      </div>

      <div className={STAT_GRID_CLS}>
        <div className={STAT_CARD_CLS}>
          <div className={STAT_LABEL_CLS}>Шууд тасалбар</div>
          <div className={STAT_VALUE_CLS}>{stats.liveCount}</div>
          <div className="text-[12px] text-zinc-500 mt-1">
            {money(event.live_price)} / ширхэг
          </div>
        </div>
        <div className={STAT_CARD_CLS}>
          <div className={STAT_LABEL_CLS}>Архив тасалбар</div>
          <div className={STAT_VALUE_CLS}>{stats.replayCount}</div>
          <div className="text-[12px] text-zinc-500 mt-1">
            {money(event.replay_price)} / ширхэг
          </div>
        </div>
        <div className={STAT_CARD_CLS}>
          <div className={STAT_LABEL_CLS}>Нийт орлого</div>
          <div className={STAT_VALUE_CLS}>{money(stats.revenue)}</div>
        </div>
        <div className={STAT_CARD_CLS}>
          <div className={STAT_LABEL_CLS}>Бичлэг</div>
          <div className={STAT_VALUE_CLS}>{readyCount}/4</div>
          <div className="text-[12px] text-zinc-500 mt-1">бэлэн</div>
        </div>
      </div>

      <section className={`${CARD_CLS} mt-6`}>
        <header className={CARD_HEAD_CLS}>
          <div>
            <h3 className={CARD_HEAD_TITLE_CLS}>Дэлгэрэнгүй</h3>
            <p className={CARD_HEAD_DESC_CLS}>
              Хуваарь, үнэ, архивын хугацаа.
            </p>
          </div>
        </header>
        <div className={CARD_BODY_CLS}>
          <dl className="grid gap-4 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[640px]:[grid-template-columns:1fr]">
            <DetailRow label="Шууд эхлэх" value={fmtDate(event.live_start_at)} />
            <DetailRow label="Шууд дуусах" value={fmtDate(event.live_end_at)} />
            <DetailRow
              label="Архивын хугацаа"
              value={fmtDate(event.replay_available_until)}
            />
            <DetailRow label="Төлөв" value={statusLabel[status]} />
          </dl>
        </div>
      </section>

      <section className={`${CARD_CLS} mt-6`}>
        <header className={CARD_HEAD_CLS}>
          <div>
            <h3 className={CARD_HEAD_TITLE_CLS}>Бичлэгүүд</h3>
            <p className={CARD_HEAD_DESC_CLS}>
              4 камер бүрийн S3 зам, бичлэгийн мэдээлэл.
            </p>
          </div>
          <span className="text-[12.5px] text-zinc-500 tabular-nums">
            {readyCount}/4 нэмэгдсэн
          </span>
        </header>
        <div>
          {[1, 2, 3, 4].map((cam) => {
            const rec = byCamera.get(cam);
            return (
              <div key={cam} className={REC_ROW_CLS}>
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-brand-blue-tint text-brand-blue ring-1 ring-inset ring-[#dadffb] font-semibold text-[13px] shrink-0">
                  {cam}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-zinc-900">
                      Камер {cam}
                    </span>
                    {rec && (
                      <span className="inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                        {rec.status}
                      </span>
                    )}
                  </div>
                  {rec ? (
                    <div className="mt-1.5 grid gap-1 text-[12.5px] text-zinc-600">
                      <code className="font-mono text-[12px] text-zinc-700 break-all">
                        s3://{rec.s3_bucket ?? "?"}/
                        {rec.master_playlist_path ?? "?"}
                      </code>
                      <div className="flex flex-wrap gap-4 text-zinc-500">
                        <span>
                          Үргэлжлэл: {fmtDuration(rec.duration_seconds)}
                        </span>
                        <span>Эхэлсэн: {fmtDate(rec.recording_started_at)}</span>
                        <span>Дууссан: {fmtDate(rec.recording_ended_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-[12.5px] text-zinc-500 m-0">
                      Бичлэг нэмэгдээгүй.
                    </p>
                  )}
                </div>
                {!rec && (
                  <button
                    type="button"
                    onClick={() => setDialogCam(cam)}
                    className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS} shrink-0`}
                  >
                    + Нэмэх
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <RecordingFormDialog
        open={dialogCam !== null}
        eventId={event.id}
        cameraNumber={dialogCam ?? 1}
        onClose={() => setDialogCam(null)}
        onCreated={() => {
          void refresh();
        }}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11.5px] uppercase tracking-[0.08em] font-semibold text-zinc-500">
        {label}
      </dt>
      <dd className="text-[14px] text-zinc-900 m-0">{value}</dd>
    </div>
  );
}
