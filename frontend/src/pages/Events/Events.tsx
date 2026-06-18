import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import useSmoothAnchors from "../../hooks/useSmoothAnchors";
import { REVEAL_UP_CLS } from "../../hooks/_revealCls";
import { listEvents } from "../../data/store";
import type { EventRecord } from "../../data/store";

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
  const monthNum = valid ? d.getMonth() + 1 : "";
  const day = valid ? d.getDate() : "";
  const dateLabel = valid ? `${monthNum}-р сарын ${day}` : "";

  const staggerAttr =
    stagger !== undefined
      ? { "data-stagger": String(Math.min(6, stagger)) }
      : {};

  return (
    <Link
      to={`/events/${ev.id}`}
      {...staggerAttr}
      className={`${REVEAL_UP_CLS} flex flex-col no-underline group [transition:opacity_700ms_cubic-bezier(.2,.8,.2,1),transform_700ms_cubic-bezier(.2,.8,.2,1)]`}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-[14px] bg-surface-1 flex-none">
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            className="w-full h-full object-cover block [transition:transform_.55s_cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.04]"
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

        {valid && (
          <span className="absolute top-3 right-3 inline-flex items-center py-1 px-3 rounded-full bg-white/95 text-[#1a1a1a] text-[12px] font-semibold backdrop-blur-sm shadow-sm">
            {dateLabel}
          </span>
        )}
      </div>

      <div className="pt-3">
        <h3
          className={`font-bold text-[15px] leading-[1.35] m-0 tracking-[-0.01em] ${
            isPast ? "text-[#4b5563]" : "text-[#1a1a1a]"
          }`}
        >
          {ev.title}
        </h3>
        <div className="mt-1.5 inline-flex items-center gap-1.5 text-brand-blue text-[13px] font-medium">
          {isPast ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          ) : null}
          {isPast ? "Нөхөж үзэх" : "Тасалбар авах"}
          {!isPast && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="[transition:transform_.25s_ease] group-hover:translate-x-0.5"
            >
              <path d="M5 12h14" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
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
  const { t } = useTranslation();
  return (
    <section className="mb-12 last:mb-0">
      <div className={`flex items-end gap-4 mb-6 ${REVEAL_UP_CLS}`}>
        <h2
          className={`text-[26px] font-extrabold tracking-[-0.01em] tabular-nums leading-none m-0 max-[600px]:text-[22px] ${
            isPast ? "text-[#7a7a7a]" : "text-[#1a1a1a]"
          }`}
        >
          {t("events_year_heading", { year: group.year })}
        </h2>
        <div
          className={`flex-1 h-px mb-2 ${
            isPast ? "bg-[#e2e2e6]" : "bg-[#e8e8e8]"
          }`}
        />
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
  const { t } = useTranslation();

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

      <ServiceIntro />

      <section
        className="relative w-full px-6 pt-12 pb-6 max-[920px]:px-5 max-[920px]:pt-9 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[260px] [background:radial-gradient(60%_120%_at_50%_0%,rgba(34,48,198,0.06)_0%,transparent_70%)]"
        />
        <div className="relative max-w-screen-page mx-auto">
          <header className={`mb-10 max-[920px]:mb-8 text-center ${REVEAL_UP_CLS}`}>
            <h1 className="text-[#1a1a1a] text-[38px] font-extrabold tracking-[-0.02em] m-0 mx-auto leading-[1.2] max-w-[920px] max-[920px]:text-[26px] max-[480px]:text-[22px]">
              {t("events_page_heading")}
            </h1>
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

function CheckBullet() {
  return (
    <span className="mt-[3px] inline-flex w-[18px] h-[18px] flex-none items-center justify-center rounded-full text-gold-pale ring-1 ring-gold-pale/40">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function ServiceIntro() {
  const { t } = useTranslation();

  const capacity = [
    {
      strong: t("events_intro_capacity_1_strong"),
      rest: t("events_intro_capacity_1_rest"),
    },
    {
      strong: t("events_intro_capacity_2_strong"),
      rest: t("events_intro_capacity_2_rest"),
    },
    {
      strong: t("events_intro_capacity_3_strong"),
      rest: t("events_intro_capacity_3_rest"),
    },
  ];
  const advantages = [
    t("events_intro_advantage_1"),
    t("events_intro_advantage_2"),
    t("events_intro_advantage_3"),
    t("events_intro_advantage_4"),
    t("events_intro_advantage_5"),
    t("events_intro_advantage_6"),
  ];
  const included = [
    t("events_intro_included_1"),
    t("events_intro_included_2"),
    t("events_intro_included_3"),
    t("events_intro_included_4"),
    t("events_intro_included_5"),
    t("events_intro_included_6"),
    t("events_intro_included_7"),
    t("events_intro_included_8"),
  ];

  return (
    <section
      aria-label={t("events_intro_label")}
      className="relative w-full text-white [background:radial-gradient(120%_140%_at_0%_0%,#1a1f4a_0%,#0e1238_55%,#080a26_100%)]"
    >
      <div className="relative max-w-screen-page mx-auto px-6 py-14 max-[920px]:px-5 max-[920px]:py-10">
        <h2 className="m-0 text-gold-pale text-[14px] font-bold uppercase tracking-[0.2em]">
          {t("events_intro_label")}
        </h2>
        <p className="mt-4 m-0 max-w-[1100px] text-white/85 text-[14.5px] leading-[1.75]">
          {t("events_intro_body")}
        </p>

        <div className="my-8 h-px bg-white/15" />

        <div className="grid grid-cols-3 gap-10 max-[920px]:grid-cols-1 max-[920px]:gap-8">
          <div>
            <h3 className="m-0 mb-5 text-gold-pale text-[13.5px] font-bold uppercase tracking-[0.18em]">
              {t("events_intro_capacity_title")}
            </h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-3.5">
              {capacity.map((item) => (
                <li
                  key={item.strong}
                  className="flex gap-3 items-start text-white/85 text-[13.5px] leading-[1.65]"
                >
                  <CheckBullet />
                  <span>
                    <strong className="text-white font-semibold">
                      {item.strong}
                    </strong>
                    {item.rest}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="m-0 mb-5 text-gold-pale text-[13.5px] font-bold uppercase tracking-[0.18em]">
              {t("events_intro_advantages_title")}
            </h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-3.5">
              {advantages.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 items-start text-white/85 text-[13.5px] leading-[1.65]"
                >
                  <CheckBullet />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="m-0 mb-5 text-gold-pale text-[13.5px] font-bold uppercase tracking-[0.18em]">
              {t("events_intro_included_title")}
            </h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-3.5">
              {included.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 items-start text-white/85 text-[13.5px] leading-[1.65]"
                >
                  <CheckBullet />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
