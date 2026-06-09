import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { listEvents } from "../../data/store";
import type { EventRecord } from "../../data/store";

const MONTHS_MN = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];
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

type MonthGroup = {
  key: string;
  year: number;
  month: number;
  events: EventRecord[];
};

function groupByMonth(events: EventRecord[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const ev of events) {
    const d = new Date(ev.start_time);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    let group = map.get(key);
    if (!group) {
      group = { key, year, month, events: [] };
      map.set(key, group);
    }
    group.events.push(ev);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => a.year - b.year || a.month - b.month);
  for (const g of groups)
    g.events.sort((a, b) => a.start_time.localeCompare(b.start_time));
  return groups;
}

function EventCard({ ev }: { ev: EventRecord }) {
  const d = new Date(ev.start_time);
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? d.getDate() : "";
  const monthAbbr = valid ? MONTHS_ABBR[d.getMonth()] : "";
  const time = valid ? formatTime(ev.start_time) : "";

  return (
    <Link
      to={`/events/${ev.id}`}
      className="flex flex-col rounded-[14px] overflow-hidden bg-white border border-solid border-[rgba(31,41,55,0.08)] no-underline group shadow-[0_4px_16px_rgba(0,0,0,0.04)] [transition:transform_.2s_ease,box-shadow_.2s_ease] hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(34,48,198,0.18)]"
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-surface-1 flex-none">
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            className="w-full h-full object-cover block [transition:transform_.45s_ease] group-hover:scale-[1.04]"
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
      </div>

      <div className="flex items-start gap-4 p-4 flex-1">
        <div className="flex flex-col items-center min-w-[44px] shrink-0 pt-0.5">
          <span className="text-[11px] font-bold text-[#888] uppercase tracking-[0.07em] leading-none">
            {monthAbbr}
          </span>
          <span className="text-[34px] font-extrabold text-[#1a1a1a] leading-[1.05] tracking-[-0.02em]">
            {day}
          </span>
          <span className="text-[11px] text-[#aaa] leading-none mt-0.5">
            {time}
          </span>
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-[#1a1a1a] font-extrabold text-[16px] leading-[1.25] m-0 tracking-[-0.01em] uppercase">
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

export default function Events() {
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEvents()
      .then((rows) => setEvents(rows))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Алдаа гарлаа"),
      );
  }, []);

  const groups = useMemo(() => (events ? groupByMonth(events) : []), [events]);

  const empty = (msg: string) => (
    <div className="rounded-2xl border border-dashed border-[#e0e0e0] p-14 text-center text-[#999] text-[14px]">
      {msg}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="w-full px-6 py-12 max-[920px]:px-5 max-[920px]:py-9">
        <div className="max-w-screen-page mx-auto">
          <header className="mb-10 max-[920px]:mb-8">
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
          </header>

          {error && empty(`Алдаа: ${error}`)}
          {!error && events === null && empty("Уншиж байна…")}
          {!error &&
            events !== null &&
            groups.length === 0 &&
            empty("Одоогоор бүртгэгдсэн арга хэмжээ байхгүй байна.")}

          {groups.map((g) => (
            <section key={g.key} className="mb-12 last:mb-0">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-[#1a1a1a] text-[14px] font-bold uppercase tracking-[0.18em] m-0">
                  {g.year} оны {MONTHS_MN[g.month]}
                </h2>
                <div className="flex-1 h-px bg-[#e8e8e8]" />
              </div>
              <div className="grid grid-cols-3 gap-5 max-[920px]:grid-cols-2 max-[560px]:grid-cols-1">
                {g.events.map((ev) => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
