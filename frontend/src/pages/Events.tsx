import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { listEvents } from "../data/store";
import type { EventRecord } from "../data/store";

const MONTHS_MN = [
  "1 сар",
  "2 сар",
  "3 сар",
  "4 сар",
  "5 сар",
  "6 сар",
  "7 сар",
  "8 сар",
  "9 сар",
  "10 сар",
  "11 сар",
  "12 сар",
];
const MONTHS_MN_SHORT = [
  "1 САР",
  "2 САР",
  "3 САР",
  "4 САР",
  "5 САР",
  "6 САР",
  "7 САР",
  "8 САР",
  "9 САР",
  "10 САР",
  "11 САР",
  "12 САР",
];
const WEEKDAYS_MN = ["НЯМ", "ДАВ", "МЯГ", "ЛХА", "ПҮР", "БАА", "БЯМ"];

const PAGE_CLS = "min-h-screen bg-surface-1";
const SECTION_CLS = "w-full px-6 py-12 max-[920px]:px-5 max-[920px]:py-9";
const INNER_CLS = "max-w-screen-page mx-auto";

const PAGE_HEADER_CLS = "mb-10 max-[920px]:mb-7";
const PAGE_TITLE_CLS =
  "text-[42px] font-extrabold tracking-[-0.02em] m-0 text-ink leading-[1.15] max-[920px]:text-[32px]";
const PAGE_SUB_CLS =
  "mt-3 text-[15px] text-ink-soft max-w-[640px] leading-[1.6]";

const MONTH_HEADER_CLS =
  "text-[22px] font-extrabold tracking-[-0.01em] text-ink m-0 mb-4 mt-10 first:mt-0 max-[920px]:text-[18px] max-[920px]:mb-3";

const CARD_CLS =
  "flex items-stretch gap-4 bg-white rounded-2xl border border-solid border-[rgba(31,41,55,0.08)] p-4 mb-3 [transition:transform_.18s_ease,box-shadow_.2s_ease,border-color_.18s_ease] hover:-translate-y-[1px] hover:shadow-[0_14px_28px_-18px_rgba(31,41,55,.25)] hover:border-[rgba(34,48,198,0.20)] max-[640px]:flex-wrap max-[640px]:gap-3";

const DATE_PILL_CLS =
  "flex flex-col items-center justify-center w-[72px] min-w-[72px] py-2 rounded-xl bg-surface-1 border border-solid border-[rgba(31,41,55,0.06)] text-ink max-[640px]:w-[64px] max-[640px]:min-w-[64px]";
const DATE_WEEKDAY_CLS =
  "text-[10px] font-bold tracking-[0.08em] text-ink-soft uppercase";
const DATE_DAY_CLS =
  "text-[26px] font-extrabold leading-none my-1 max-[640px]:text-[22px]";
const DATE_MONTH_CLS =
  "text-[10px] font-bold tracking-[0.08em] text-brand-blue uppercase";

const THUMB_CLS =
  "block w-[88px] h-[88px] rounded-xl bg-surface-1 bg-cover bg-center flex-none border border-solid border-[rgba(31,41,55,0.06)] max-[640px]:w-[64px] max-[640px]:h-[64px]";

const MAIN_CLS = "flex flex-col justify-center flex-1 min-w-0";
const TITLE_CLS =
  "text-[16px] font-extrabold tracking-[-0.01em] text-ink m-0 leading-[1.3] max-[640px]:text-[14.5px]";
const SUBTITLE_CLS =
  "mt-1.5 text-[13px] font-medium text-ink-soft normal-case tracking-normal leading-[1.55] [overflow-wrap:break-word]";
const META_CLS = "mt-1 text-[12.5px] text-ink-soft";

const CTA_WRAP_CLS =
  "flex items-center max-[640px]:w-full max-[640px]:justify-end";
const CTA_CLS =
  "inline-flex items-center gap-2 rounded-full bg-brand-blue text-white text-[13px] font-semibold no-underline py-2.5 px-5 [transition:background_.15s_ease,transform_.15s_ease,box-shadow_.2s_ease] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-[14px] [&_svg]:h-[14px]";

const EMPTY_CLS =
  "bg-white rounded-2xl border border-dashed border-[rgba(31,41,55,0.14)] p-12 text-center text-ink-soft text-[14px]";

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
  for (const g of groups) {
    g.events.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return groups;
}

function EventCard({ ev }: { ev: EventRecord }) {
  const d = new Date(ev.start_time);
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? d.getDate() : "";
  const weekday = valid ? WEEKDAYS_MN[d.getDay()] : "";
  const monthAbbr = valid ? MONTHS_MN_SHORT[d.getMonth()] : "";

  return (
    <article className={CARD_CLS}>
      <div className={DATE_PILL_CLS} aria-hidden="true">
        <span className={DATE_WEEKDAY_CLS}>{weekday}</span>
        <span className={DATE_DAY_CLS}>{day}</span>
        <span className={DATE_MONTH_CLS}>{monthAbbr}</span>
      </div>

      <span
        className={THUMB_CLS}
        style={ev.image ? { backgroundImage: `url('${ev.image}')` } : undefined}
        role="img"
        aria-label={ev.title}
      />

      <div className={MAIN_CLS}>
        <h3 className={TITLE_CLS}>{ev.title}</h3>
        {ev.desc && <div className={SUBTITLE_CLS}>{ev.desc}</div>}
        {ev.pill && <div className={META_CLS}>{ev.pill}</div>}
      </div>

      <div className={CTA_WRAP_CLS}>
        <Link
          to={`/events/${ev.id}`}
          className={CTA_CLS}
          aria-label={`${ev.title} — дэлгэрэнгүй мэдээлэл`}
        >
          Дэлгэрэнгүй мэдээлэл
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </article>
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

  return (
    <div className={PAGE_CLS}>
      <SiteHeader />

      <section className={SECTION_CLS}>
        <div className={INNER_CLS}>
          <header className={PAGE_HEADER_CLS}>
            <h1 className={PAGE_TITLE_CLS}>Үйл ажиллагаа &amp; Арга хэмжээ</h1>
            <p className={PAGE_SUB_CLS}>
              Төв Цэнгэлдэх Хүрээлэнд удахгүй болох тоглолт, спортын тэмцээн,
              соёл олон нийтийн арга хэмжээний бүрэн жагсаалт. Сар тус бүрээр
              ангилав.
            </p>
          </header>

          {error && (
            <div className={EMPTY_CLS}>
              <strong>Алдаа: </strong>
              {error}
            </div>
          )}

          {!error && events === null && (
            <div className={EMPTY_CLS}>Уншиж байна…</div>
          )}

          {!error && events !== null && groups.length === 0 && (
            <div className={EMPTY_CLS}>
              Одоогоор бүртгэгдсэн арга хэмжээ байхгүй байна.
            </div>
          )}

          {groups.map((g) => (
            <section key={g.key}>
              <h2 className={MONTH_HEADER_CLS}>
                {g.year} оны {MONTHS_MN[g.month]}
              </h2>
              {g.events.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </section>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
