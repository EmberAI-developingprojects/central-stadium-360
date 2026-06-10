import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { EventRecord, OrderRecord } from "../../../data/store";
import { MONTHS_ABBR_MN } from "../constants";
import { fmtEventTime } from "../utils";

type UpcomingSectionProps = {
  events: EventRecord[];
  myTickets: OrderRecord[];
};

type Category = "active" | "ended";

function endMs(ev: EventRecord, startMs: number): number {
  if (ev.live_end_at) {
    const e = new Date(ev.live_end_at).getTime();
    if (!Number.isNaN(e)) return e;
  }
  if (Number.isNaN(startMs)) return NaN;
  return startMs + 3 * 60 * 60 * 1000;
}

function categorize(ev: EventRecord, nowMs: number): Category {
  const start = new Date(ev.start_time).getTime();
  if (Number.isNaN(start)) return "active";
  const end = endMs(ev, start);
  if (!Number.isNaN(end) && nowMs >= end) return "ended";
  return "active";
}

export function UpcomingSection({ events, myTickets }: UpcomingSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (events.length === 0) return null;

  const nowMs = Date.now();
  const withTs = events.map((ev) => {
    const ts = new Date(ev.start_time).getTime();
    return { ev, ts: Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts };
  });

  const active = withTs
    .filter((x) => categorize(x.ev, nowMs) === "active")
    .sort((a, b) => a.ts - b.ts)
    .map((x) => x.ev);

  const ended = withTs
    .filter((x) => categorize(x.ev, nowMs) === "ended")
    .sort((a, b) => b.ts - a.ts)
    .map((x) => x.ev);

  const ownedIds = new Set(myTickets.map((tk) => tk.eventId));

  return (
    <section className="w-full px-6 py-10 max-[920px]:px-5" id="upcoming">
      <div className="max-w-screen-page mx-auto flex flex-col gap-10">
        {active.length > 0 && (
          <EventRow
            icon="upcoming"
            title={t("watch_section_active_title")}
            subtitle={t("watch_section_active_subtitle", {
              count: active.length,
            })}
            events={active}
            ownedIds={ownedIds}
            onNavigate={(id) => navigate(`/watch/events/${id}`)}
          />
        )}

        {ended.length > 0 && (
          <EventRow
            icon="ended"
            title={t("watch_section_ended_title")}
            subtitle={t("watch_section_ended_subtitle", {
              count: ended.length,
            })}
            events={ended}
            ownedIds={ownedIds}
            onNavigate={(id) => navigate(`/watch/events/${id}`)}
            muted
          />
        )}
      </div>
    </section>
  );
}

function EventRow({
  icon,
  title,
  subtitle,
  events,
  ownedIds,
  onNavigate,
  muted = false,
}: {
  icon: "upcoming" | "ended";
  title: string;
  subtitle: string;
  events: EventRecord[];
  ownedIds: Set<string>;
  onNavigate: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
            icon === "upcoming"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/5 text-white/45"
          }`}
        >
          {icon === "upcoming" ? (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9" />
              <path d="M3 4v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          )}
        </span>
        <div className="flex flex-col">
          <span
            className={`text-[14px] font-extrabold uppercase tracking-[0.16em] leading-none ${
              muted ? "text-white/55" : "text-white"
            }`}
          >
            {title}
          </span>
          <span className="text-[11px] text-white/40 mt-1 uppercase tracking-[0.12em]">
            {subtitle}
          </span>
        </div>
      </div>

      <div
        className="flex gap-5 overflow-x-auto overflow-y-hidden pb-3 -mx-2 px-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.18)] [&::-webkit-scrollbar-track]:bg-transparent"
        role="list"
      >
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            owned={ownedIds.has(ev.id)}
            onClick={() => onNavigate(ev.id)}
            muted={muted}
          />
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event: ev,
  owned,
  onClick,
  muted,
}: {
  event: EventRecord;
  owned: boolean;
  onClick: () => void;
  muted: boolean;
}) {
  const { t } = useTranslation();
  const d = new Date(ev.start_time);
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? d.getDate() : "";
  const monthAbbr = valid ? MONTHS_ABBR_MN[d.getMonth()] : "";
  const time = valid ? fmtEventTime(ev.start_time) : "";
  const nowMs = Date.now();
  const startMs = valid ? d.getTime() : NaN;
  const end = endMs(ev, startMs);
  const evLive =
    valid && startMs <= nowMs && (Number.isNaN(end) || nowMs < end);
  const isPast = valid && !Number.isNaN(end) && nowMs >= end;

  return (
    <article
      role="listitem"
      className={`flex flex-col rounded-[14px] overflow-hidden bg-[#0d2044] group [transition:transform_.2s_ease,box-shadow_.2s_ease] hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_rgba(0,0,0,0.7)] cursor-pointer flex-none w-[320px] max-[560px]:w-[260px] [scroll-snap-align:start] ${
        muted ? "opacity-80 hover:opacity-100" : ""
      }`}
      onClick={onClick}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#071a35] flex-none">
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
              className="w-12 h-12 text-[rgba(255,255,255,0.12)]"
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
        {evLive ? (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-2.5 py-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-white animate-live-blink"
              aria-hidden="true"
            />
            {t("watch_card_live")}
          </span>
        ) : isPast ? (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-zinc-900/75 text-white text-[10.5px] font-bold uppercase tracking-[0.08em] [backdrop-filter:blur(4px)]">
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
            {t("watch_card_ended")}
          </span>
        ) : (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 py-0.5 pl-1.5 pr-2 rounded-full bg-white/90 text-[#1a1a1a] text-[10.5px] font-bold uppercase tracking-[0.08em] [backdrop-filter:blur(4px)] shadow-sm">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            {t("watch_card_upcoming")}
          </span>
        )}
        {owned && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-[rgba(16,185,129,0.85)] text-white text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2.5 py-1">
            <svg
              width="9"
              height="9"
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
            {t("watch_ticketed")}
          </span>
        )}
      </div>
      <div className="flex items-start gap-4 p-4 flex-1">
        <div className="flex flex-col items-center min-w-[44px] shrink-0 pt-0.5">
          <span className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-[0.07em] leading-none">
            {monthAbbr}
          </span>
          <span className="text-[34px] font-extrabold text-white leading-[1.05] tracking-[-0.02em]">
            {day}
          </span>
          <span className="text-[11px] text-[rgba(255,255,255,0.45)] leading-none mt-0.5">
            {time}
          </span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-white font-extrabold text-[16px] leading-[1.25] m-0 tracking-[-0.01em] uppercase">
            {ev.title}
          </h3>
          {ev.desc && (
            <p className="text-[rgba(255,255,255,0.5)] text-[12px] mt-1.5 m-0 leading-[1.45] line-clamp-2">
              {ev.desc}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
