import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteEvent,
  listAdminEvents,
  listOrders,
} from "../../data/store";
import type { AdminEventRecord } from "../../data/store";
import type { EventStatus } from "@cs360/shared";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

type StatusKind = EventStatus;
type StatusFilter = "all" | "live" | "upcoming" | "ended" | "archived";

const matchesFilter = (status: StatusKind, filter: StatusFilter): boolean => {
  if (filter === "all") return true;
  if (filter === "ended") return status === "ended" || status === "expired";
  return status === filter;
};

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

const DAY_MS = 24 * 60 * 60 * 1000;

function deriveStatus(event: AdminEventRecord): StatusKind {
  const now = Date.now();
  const startIso = event.start_time;
  const start = startIso ? new Date(startIso).getTime() : NaN;

  if (!Number.isNaN(start) && now < start) return "upcoming";

  let endMs: number | null = null;
  if (event.live_end_at) {
    const e = new Date(event.live_end_at).getTime();
    if (!Number.isNaN(e)) endMs = e;
  }
  if (endMs === null && !Number.isNaN(start)) {
    endMs = start + 3 * 60 * 60 * 1000;
  }

  if (endMs !== null && now < endMs) return "live";

  if (event.replay_available_until) {
    const until = new Date(event.replay_available_until).getTime();
    if (!Number.isNaN(until) && now > until) return "expired";
  }

  if (event.recording_count > 0) return "archived";

  return "ended";
}

function formatDate(startIso: string | undefined, fallback: string): {
  primary: string;
  secondary: string;
} {
  if (!startIso) return { primary: fallback || "—", secondary: "" };
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return { primary: fallback || "—", secondary: "" };
  const primary = d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const weekday = d.toLocaleDateString("mn-MN", { weekday: "short" });
  return { primary, secondary: `${weekday} · ${time}` };
}

function relativeFrom(startIso: string | undefined, status: StatusKind): string {
  if (!startIso || status === "ended" || status === "archived" || status === "expired") return "";
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return "";
  const diff = start - Date.now();
  if (status === "live") return "Шууд эфирт";
  const days = Math.floor(diff / DAY_MS);
  if (days <= 0) {
    const hours = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
    return `${hours} цагийн дараа`;
  }
  if (days <= 30) return `${days} өдрийн дараа`;
  const weeks = Math.round(days / 7);
  if (weeks <= 8) return `${weeks} долоо хоногийн дараа`;
  const months = Math.round(days / 30);
  return `${months} сарын дараа`;
}

export default function EventsList() {
  const confirm = useConfirm();
  const toast = useToast();
  const [events, setEvents] = useState<AdminEventRecord[] | null>(null);
  const [salesByEvent, setSalesByEvent] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const load = () => {
    Promise.all([listAdminEvents(), listOrders({ status: "paid" })]).then(
      ([evts, orders]) => {
        setEvents(evts);
        const map: Record<string, number> = {};
        orders.forEach((o) => {
          map[o.eventId] = (map[o.eventId] || 0) + (Number(o.qty) || 0);
        });
        setSalesByEvent(map);
      },
    );
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: "Арга хэмжээг устгах уу?",
      message: (
        <>
          <strong className="font-semibold text-zinc-900">«{title}»</strong>{" "}
          бүх захиалга, тасалбарын хамт устгагдана. Энэ үйлдлийг буцаах
          боломжгүй.
        </>
      ),
      confirmLabel: "Устгах",
      cancelLabel: "Болих",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteEvent(id);
      toast.success(`«${title}» устгалаа.`);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Устгах боломжгүй.");
    }
  };

  const enriched = useMemo(() => {
    return (events || []).map((e) => ({
      event: e,
      status: deriveStatus(e),
      sales: salesByEvent[e.id] || 0,
    }));
  }, [events, salesByEvent]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const live = enriched.filter((r) => r.status === "live").length;
    const upcoming = enriched.filter((r) => r.status === "upcoming").length;
    const totalSales = enriched.reduce((s, r) => s + r.sales, 0);
    const revenue = enriched.reduce(
      (s, r) => s + (r.event.base || 0) * r.sales,
      0,
    );
    return { total, live, upcoming, totalSales, revenue };
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (!matchesFilter(r.status, statusFilter)) return false;
      if (!q) return true;
      const needle = q.toLowerCase();
      return (r.event.title || "").toLowerCase().includes(needle);
    });
  }, [enriched, q, statusFilter]);

  if (!events) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Арга хэмжээ</h2>
          <p>Удахгүй болох тоглолтуудыг үүсгэх, засах.</p>
        </div>
        <Link
          to="/admin/events/new"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Шинэ арга хэмжээ
        </Link>
      </div>

      {events.length > 0 && (
        <div className="grid gap-3 mb-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <StatCard
            label="Нийт"
            value={stats.total.toString()}
            sub={
              stats.upcoming > 0
                ? `${stats.upcoming} удахгүй`
                : "удахгүй алга"
            }
          />
          <StatCard
            label="Шууд эфирт"
            value={stats.live.toString()}
            sub={stats.live > 0 ? "одоо явагдаж байна" : "идэвхтэй эфир алга"}
            accent={stats.live > 0 ? "live" : undefined}
          />
          <StatCard
            label="Орлого"
            value={money(stats.revenue)}
            sub={`${stats.totalSales} тасалбар зарагдсан`}
          />
        </div>
      )}

      {events.length > 0 && (
        <div className={ADMIN_FILTERS_CLS}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Гарчиг / ангилалаар хайх…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!pl-9"
            />
          </div>
          <div className="inline-flex bg-white border border-[#e4e4e7] rounded-md p-0.5 gap-0.5">
            {(
              [
                ["all", "Бүгд"],
                ["live", "Шууд"],
                ["upcoming", "Удахгүй"],
                ["ended", "Дууссан"],
                ["archived", "Нөхөж үзэх боломжтой"],
              ] as Array<[StatusFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 h-8 rounded text-[12.5px] font-medium transition-colors ${
                  statusFilter === key
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-zinc-500 ml-auto">
            Нийт{" "}
            <strong className="font-semibold text-zinc-900">
              {filtered.length}
            </strong>
            {(q || statusFilter !== "all") && ` / ${events.length}`}
          </span>
        </div>
      )}

      {events.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Арга хэмжээ алга</strong>
          Эхлэхийн тулд «Шинэ арга хэмжээ» товч дээр дарна уу.
        </div>
      ) : filtered.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Тохирох арга хэмжээ олдсонгүй</strong>
          Хайлт болон шүүлтүүрээ тохируулна уу.
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Арга хэмжээ</th>
                <th>Огноо</th>
                <th>Төлөв</th>
                <th style={{ textAlign: "right" }}>Шууд / Нөхөж үзэх</th>
                <th style={{ textAlign: "center" }}>Бичлэг</th>
                <th style={{ textAlign: "center" }}>Зарагдсан</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ event: e, status, sales }) => {
                const date = formatDate(e.start_time, e.date);
                const relative = relativeFrom(e.start_time, status);
                return (
                  <tr key={e.id} className="group">
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <Link
                          to={`/admin/events/${e.id}`}
                          className="shrink-0 block w-[44px] h-[44px] rounded-lg bg-zinc-100 bg-center bg-cover ring-1 ring-inset ring-[#ececef] hover:ring-zinc-300 transition-shadow"
                          style={{
                            backgroundImage: e.image
                              ? `url('${e.image}')`
                              : undefined,
                          }}
                          aria-label={`«${e.title}»-г засах`}
                        >
                          {!e.image && (
                            <span className="w-full h-full grid place-items-center text-zinc-400">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </span>
                          )}
                        </Link>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              to={`/admin/events/${e.id}`}
                              className="text-zinc-900 no-underline font-medium hover:underline underline-offset-[3px] decoration-zinc-300 truncate"
                            >
                              {e.title || "Untitled"}
                            </Link>
                          </div>
                          <div className="text-[11.5px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              {e.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-zinc-900 tabular-nums">
                        {date.primary}
                      </div>
                      {date.secondary && (
                        <div className="text-[11.5px] text-zinc-500 mt-0.5 tabular-nums">
                          {date.secondary}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={status} hint={relative} />
                    </td>
                    <td style={{ textAlign: "right" }} className="tabular-nums text-zinc-900 font-medium">
                      <div>{money(e.live_price || e.base)}</div>
                      <div className="text-[11.5px] text-zinc-500 mt-0.5">
                        {e.replay_price > 0 ? money(e.replay_price) : "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }} className="tabular-nums">
                      <span
                        className={
                          e.recording_count >= 4
                            ? "text-emerald-700 font-semibold"
                            : e.recording_count > 0
                              ? "text-amber-600 font-medium"
                              : "text-zinc-400"
                        }
                      >
                        {e.recording_count}/4
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }} className="tabular-nums">
                      {sales > 0 ? (
                        <span className="text-zinc-900 font-medium">{sales}</span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>
                    <td>
                      <div className="inline-flex gap-1">
                        <Link
                          to={`/admin/events/${e.id}`}
                          title="Засах"
                          aria-label={`«${e.title}»-г засах`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(e.id, e.title)}
                          title="Устгах"
                          aria-label={`«${e.title}»-г устгах`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "live";
}) {
  const valueColor = accent === "live" ? "text-red-600" : "text-zinc-900";
  return (
    <div className="bg-white border border-[#ececef] rounded-xl p-4">
      <div className="flex items-center gap-1.5">
        {accent === "live" && (
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
        <span className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium">
          {label}
        </span>
      </div>
      <div className={`text-[22px] font-semibold tracking-[-0.02em] leading-none mt-2 ${valueColor}`}>
        {value}
      </div>
      <div className="text-[11.5px] text-zinc-500 mt-2">{sub}</div>
    </div>
  );
}

function StatusBadge({ status, hint }: { status: StatusKind; hint: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-2 py-0.5 w-fit">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
        ШУУД
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <div className="inline-flex flex-col gap-0.5">
        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 w-fit">
          Удахгүй
        </span>
        {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
      </div>
    );
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2 py-0.5 w-fit">
        Нөхөж үзэх боломжтой
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[11px] font-medium px-2 py-0.5">
      Дууссан
    </span>
  );
}
