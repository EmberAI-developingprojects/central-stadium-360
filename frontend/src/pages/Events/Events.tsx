import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import useSmoothAnchors from "../../hooks/useSmoothAnchors";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { listEvents } from "../../data/store";
import type { EventRecord } from "../../data/store";

const MONTHS_ABBR = [
  "1-р",
  "2-р",
  "3-р",
  "4-р",
  "5-р",
  "6-р",
  "7-р",
  "8-р",
  "9-р",
  "10-р",
  "11-р",
  "12-р",
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

type YearGroup = {
  key: string;
  year: number;
  events: EventRecord[];
};

function groupByYear(events: EventRecord[]): YearGroup[] {
  const map = new Map<string, YearGroup>();
  for (const ev of events) {
    const d = new Date(ev.start_time);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const key = String(year);
    let group = map.get(key);
    if (!group) {
      group = { key, year, events: [] };
      map.set(key, group);
    }
    group.events.push(ev);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => a.year - b.year);
  for (const g of groups)
    g.events.sort((a, b) => a.start_time.localeCompare(b.start_time));
  return groups;
}

function EventCard({
  ev,
  isPast = false,
  stagger,
}: {
  ev: EventRecord;
  isPast?: boolean;
  stagger?: number;
}) {
  const d = new Date(ev.start_time);
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? d.getDate() : "";
  const monthAbbr = valid ? MONTHS_ABBR[d.getMonth()] : "";
  const time = valid ? formatTime(ev.start_time) : "";

  const staggerAttr =
    stagger !== undefined
      ? { "data-stagger": String(Math.min(6, stagger)) }
      : {};

  return (
    <Link
      to={`/events/${ev.id}`}
      {...staggerAttr}
      className={`${REVEAL_UP_CLS} flex flex-col rounded-[14px] overflow-hidden bg-white border border-solid border-[rgba(31,41,55,0.08)] no-underline group shadow-[0_4px_16px_rgba(0,0,0,0.04)] [transition:opacity_700ms_cubic-bezier(.2,.8,.2,1),transform_700ms_cubic-bezier(.2,.8,.2,1),box-shadow_.25s_ease] hover:-translate-y-1.5 hover:shadow-[0_24px_44px_-14px_rgba(34,48,198,0.22)]`}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-surface-1 flex-none">
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            className={`w-full h-full object-cover block [transition:transform_.55s_cubic-bezier(.2,.8,.2,1),filter_.4s_ease] group-hover:scale-[1.05] ${
              isPast
                ? "grayscale-[55%] opacity-90 group-hover:grayscale-0 group-hover:opacity-100"
                : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#d1d5db]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
        )}

        {isPast ? (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-zinc-900/75 text-white text-[10.5px] font-bold uppercase tracking-[0.08em] backdrop-blur-sm">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9" />
              <path d="M3 4v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
            Дууссан
          </span>
        ) : (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 py-0.5 pl-1.5 pr-2 rounded-full bg-white/90 text-[#1a1a1a] text-[10.5px] font-bold uppercase tracking-[0.08em] backdrop-blur-sm shadow-sm">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            Удахгүй
          </span>
        )}
      </div>

      <div className="flex items-start gap-4 p-4 flex-1">
        <div className="flex flex-col items-center min-w-[44px] shrink-0 pt-0.5">
          <span className="text-[11px] font-bold text-[#888] uppercase tracking-[0.07em] leading-none">
            {monthAbbr}
          </span>
          <span
            className={`text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] ${
              isPast ? "text-[#6b7280]" : "text-[#1a1a1a]"
            }`}
          >
            {day}
          </span>
          <span className="text-[11px] text-[#aaa] leading-none mt-0.5">
            {time}
          </span>
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h3
            className={`font-extrabold text-[16px] leading-[1.25] m-0 tracking-[-0.01em] uppercase ${
              isPast ? "text-[#4b5563]" : "text-[#1a1a1a]"
            }`}
          >
            {ev.title}
          </h3>
          {ev.desc && (
            <p className="text-[#666] text-[12px] mt-1.5 m-0 leading-[1.45]">
              {ev.desc}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function YearSection({
  group,
  isPast,
}: {
  group: YearGroup;
  isPast: boolean;
}) {
  return (
    <section className="mb-12 last:mb-0">
      <div className={`flex items-center gap-3 mb-5 ${REVEAL_UP_CLS}`}>
        <h2
          className={`text-[14px] font-bold uppercase tracking-[0.18em] m-0 ${
            isPast ? "text-[#7a7a7a]" : "text-[#1a1a1a]"
          }`}
        >
          {group.year} он
        </h2>
        <div
          className={`flex-1 h-px ${
            isPast ? "bg-[#e2e2e6]" : "bg-[#e8e8e8]"
          }`}
        />
        <span className="text-[11px] font-semibold tabular-nums text-[#aaa]">
          {group.events.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-5 max-[920px]:grid-cols-2 max-[560px]:grid-cols-1">
        {group.events.map((ev, i) => (
          <EventCard key={ev.id} ev={ev} isPast={isPast} stagger={i + 1} />
        ))}
      </div>
    </section>
  );
}

export default function Events() {
  useRevealOnScroll();
  useSmoothAnchors();

  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEvents()
      .then((rows) => setEvents(rows))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Алдаа гарлаа"),
      );
  }, []);

  const { upcoming, past } = useMemo(() => {
    if (!events) return { upcoming: [], past: [] };
    const now = Date.now();
    const up: EventRecord[] = [];
    const pa: EventRecord[] = [];
    for (const ev of events) {
      const t = new Date(ev.start_time).getTime();
      if (Number.isNaN(t)) {
        up.push(ev);
        continue;
      }
      if (t >= now) up.push(ev);
      else pa.push(ev);
    }
    return { upcoming: up, past: pa };
  }, [events]);

  const upcomingGroups = useMemo(() => groupByYear(upcoming), [upcoming]);
  const pastGroups = useMemo(() => {
    const groups = groupByYear(past);
    groups.reverse();
    for (const g of groups)
      g.events.sort((a, b) => b.start_time.localeCompare(a.start_time));
    return groups;
  }, [past]);

  const loading = events === null && !error;

  const empty = (msg: string) => (
    <div className="rounded-2xl border border-dashed border-[#e0e0e0] p-14 text-center text-[#999] text-[14px]">
      {msg}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section
        className="relative w-full px-6 pt-12 pb-6 max-[920px]:px-5 max-[920px]:pt-9 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[260px] [background:radial-gradient(60%_120%_at_50%_0%,rgba(34,48,198,0.06)_0%,transparent_70%)]"
        />
        <div className="relative max-w-screen-page mx-auto">
          <header className={`mb-10 max-[920px]:mb-8 ${REVEAL_UP_CLS}`}>
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-[18px] h-[18px] text-brand-blue shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#888]">
                Үйл ажиллагаа
              </span>
            </div>
            <h1 className="text-[#1a1a1a] text-[38px] font-extrabold tracking-[-0.02em] m-0 leading-[1.15] max-[920px]:text-[28px] max-[480px]:text-[24px]">
              Арга хэмжээнүүд
            </h1>
            <p className="mt-3 text-[#666] text-[15px] max-w-[560px] leading-[1.6] m-0">
              Төв Цэнгэлдэх Хүрээлэнд удахгүй болох тоглолт, спортын тэмцээн,
              соёл олон нийтийн арга хэмжээний бүрэн жагсаалт.
            </p>

            {events !== null && (
              <div
                className="mt-6 flex items-center gap-4 flex-wrap text-[12.5px]"
                data-stagger="1"
              >
                <span className="inline-flex items-center gap-2 py-1 pl-2 pr-3 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  <span className="relative inline-flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  Удахгүй болох
                  <span className="font-bold tabular-nums text-emerald-800">
                    {upcoming.length}
                  </span>
                </span>
                {past.length > 0 && (
                  <a
                    href="#past"
                    className="inline-flex items-center gap-1.5 py-1 pl-3 pr-2 rounded-full bg-zinc-100 text-zinc-700 font-semibold no-underline transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                  >
                    Дууссан
                    <span className="font-bold tabular-nums text-zinc-900">
                      {past.length}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </header>

          {error && empty(`Алдаа: ${error}`)}
          {loading && empty("Уншиж байна…")}

          {!loading && !error && upcoming.length === 0 && past.length === 0 && (
            empty("Одоогоор бүртгэгдсэн арга хэмжээ байхгүй байна.")
          )}

          {!loading && !error && upcoming.length > 0 && (
            <div
              className={`flex items-center gap-3 mb-6 ${REVEAL_UP_CLS}`}
              id="upcoming"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-blue-tint text-brand-blue">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </span>
              <h2 className="text-[#1a1a1a] text-[20px] font-extrabold tracking-[-0.01em] m-0">
                Удахгүй болох
              </h2>
              <span className="text-[12px] font-semibold tabular-nums text-[#9a9a9a]">
                {upcoming.length}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-brand-blue/20 via-zinc-200 to-transparent" />
            </div>
          )}

          {!loading && !error && upcomingGroups.map((g) => (
            <YearSection key={g.key} group={g} isPast={false} />
          ))}
        </div>
      </section>

      {!loading && !error && past.length > 0 && (
        <section
          id="past"
          className="relative w-full px-6 pt-14 pb-16 max-[920px]:px-5 max-[920px]:pt-10 max-[920px]:pb-12 [background:linear-gradient(180deg,#ffffff_0%,#fafafa_18%,#fafafa_100%)] border-t border-[#f0f0f0]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-px h-12 [background:linear-gradient(180deg,rgba(0,0,0,0.04)_0%,transparent_100%)]"
          />
          <div className="relative max-w-screen-page mx-auto">
            <div className={`flex items-center gap-3 mb-7 ${REVEAL_UP_CLS}`}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-200 text-zinc-600">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9" />
                  <path d="M3 4v5h5" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <h2 className="text-[#1a1a1a] text-[20px] font-extrabold tracking-[-0.01em] m-0">
                Дууссан
              </h2>
              <span className="text-[12px] font-semibold tabular-nums text-[#9a9a9a]">
                {past.length}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-zinc-300/60 via-zinc-200 to-transparent" />
            </div>

            {pastGroups.map((g) => (
              <YearSection key={g.key} group={g} isPast={true} />
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
