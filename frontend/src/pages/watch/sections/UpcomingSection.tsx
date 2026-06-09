import { useTranslation } from "react-i18next";
import type { EventRecord, OrderRecord } from "../../../data/store";
import { useStreamLive } from "../hooks/useStreamLive";
import { MONTHS_ABBR_MN } from "../constants";
import { fmtEventTime } from "../utils";
import type { TicketModalEvent } from "../types";

type UpcomingSectionProps = {
  events: EventRecord[];
  myTickets: OrderRecord[];
  onBuy: (event: TicketModalEvent) => void;
  onWatch: () => void;
};

export function UpcomingSection({
  events,
  myTickets,
  onBuy,
  onWatch,
}: UpcomingSectionProps) {
  const { t } = useTranslation();
  const anyPastStart = events.some((ev) => {
    const d = new Date(ev.start_time);
    return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now();
  });
  const { streamLive } = useStreamLive(anyPastStart);
  if (events.length === 0) return null;
  return (
    <section className="w-full px-6 py-10 max-[920px]:px-5" id="upcoming">
      <div className="max-w-screen-page mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <svg
            className="w-[18px] h-[18px] text-[rgba(255,255,255,0.5)] shrink-0"
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
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            {t("watch_events_section")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-5 max-[920px]:grid-cols-2 max-[560px]:grid-cols-1">
          {events.map((ev) => {
            const d = new Date(ev.start_time);
            const valid = !Number.isNaN(d.getTime());
            const day = valid ? d.getDate() : "";
            const monthAbbr = valid ? MONTHS_ABBR_MN[d.getMonth()] : "";
            const time = valid ? fmtEventTime(ev.start_time) : "";
            const evLive = valid && d.getTime() <= Date.now() && streamLive;
            const owned = myTickets.some((t) => t.eventId === ev.id);
            return (
              <article
                key={ev.id}
                className="flex flex-col rounded-[14px] overflow-hidden bg-[#0d2044] group [transition:transform_.2s_ease,box-shadow_.2s_ease] hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_rgba(0,0,0,0.7)] cursor-pointer"
                onClick={() =>
                  owned
                    ? onWatch()
                    : onBuy({
                        id: ev.id,
                        title: ev.title,
                        date: ev.when,
                        image: ev.image,
                        base: ev.base,
                        start_time: ev.start_time,
                        desc: ev.desc,
                      })
                }
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
                  {evLive && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-2.5 py-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white animate-live-blink"
                        aria-hidden="true"
                      />
                      LIVE
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
                      <p className="text-[rgba(255,255,255,0.5)] text-[12px] mt-1.5 m-0 leading-[1.45]">
                        {ev.desc}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
