import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCountdown } from "../hooks/useCountdown";
import { useStreamLive } from "../hooks/useStreamLive";
import { MONTHS_ABBR_EN } from "../constants";
import { pad2 } from "../utils";
import type { TicketModalEvent } from "../types";

type LiveSectionProps = {
  featuredEvent: TicketModalEvent;
  ownsFeatured: boolean;
  onWatch: () => void;
};

export function LiveSection({
  featuredEvent,
  ownsFeatured,
  onWatch,
}: LiveSectionProps) {
  const { t } = useTranslation();
  const { isLive, hasTime, days, hours, minutes, seconds } = useCountdown(
    featuredEvent.start_time,
  );
  const saleKind = resolveSaleKind(featuredEvent);
  const inLiveWindow = isLive && saleKind === "live";
  const { streamLive, streamChecked } = useStreamLive(
    ownsFeatured && inLiveWindow,
  );
  const d = featuredEvent.start_time
    ? new Date(featuredEvent.start_time)
    : null;
  const valid = d && !Number.isNaN(d.getTime());
  const dateStr = valid
    ? `${MONTHS_ABBR_EN[d!.getMonth()]} ${d!.getDate()} / ${d!.getFullYear()}`
    : featuredEvent.date;

  return (
    <section className="w-full max-w-full overflow-hidden" id="live">
      <div className="grid [grid-template-columns:55%_45%] max-[720px]:grid-cols-1 min-h-[460px] max-[720px]:min-h-0 w-full max-w-full">
        <div className="relative overflow-hidden bg-[#0a1628] min-w-0 max-[720px]:[aspect-ratio:16/9]">
          {featuredEvent.image ? (
            <img
              src={featuredEvent.image}
              alt={featuredEvent.title}
              className="w-full h-full object-cover block"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full min-h-[300px] bg-[#0a1628]" />
          )}
          {isLive && streamLive && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-2 bg-[#e53935] text-white text-[11px] font-bold uppercase tracking-[0.14em] rounded-full px-3 py-1.5">
              <span
                className="w-2 h-2 rounded-full bg-white animate-live-blink"
                aria-hidden="true"
              />
              LIVE
            </span>
          )}
        </div>

        <div className="bg-[#071526] flex flex-col justify-center min-w-0 px-10 py-14 max-[920px]:px-7 max-[920px]:py-10 max-[720px]:px-5 max-[720px]:py-7 max-[420px]:px-4 max-[420px]:py-6">
          <p className="text-[rgba(255,255,255,0.5)] text-[13px] font-bold uppercase tracking-[0.2em] m-0 mb-5 max-[420px]:text-[12px] max-[420px]:mb-3">
            {dateStr}
          </p>
          <h1 className="text-white text-[40px] font-extrabold uppercase tracking-[-0.01em] leading-[1.1] m-0 break-words max-[920px]:text-[30px] max-[720px]:text-[22px] max-[420px]:text-[20px]">
            {featuredEvent.title}
          </h1>
          {featuredEvent.desc && (
            <p className="text-[rgba(255,255,255,0.5)] text-[14px] mt-3 m-0 uppercase tracking-[0.06em] font-medium break-words max-[420px]:text-[12px]">
              {featuredEvent.desc}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-3 max-[720px]:mt-6 max-[420px]:flex-col max-[420px]:items-stretch max-[420px]:gap-2.5">
            {!ownsFeatured && saleKind !== "expired" && (
              <button
                type="button"
                onClick={onWatch}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-sm bg-white text-[#071526] text-[12px] font-bold uppercase tracking-[0.1em] cursor-pointer font-[inherit] [transition:background_.15s_ease,transform_.15s_ease,box-shadow_.2s_ease] shadow-[0_8px_24px_-12px_rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.88)] hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(255,255,255,0.5)] whitespace-nowrap max-[420px]:px-3 max-[420px]:text-[11px] max-[420px]:tracking-[0.08em]"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4z" />
                  <line x1="9" y1="6" x2="9" y2="18" strokeDasharray="2 3" />
                </svg>
                {saleKind === "replay"
                  ? t("watch_buy_replay_ticket")
                  : t("watch_buy_ticket")}
              </button>
            )}

            <Link
              to={`/watch/events/${featuredEvent.id}`}
              className="inline-flex items-center justify-center h-11 px-5 rounded-sm bg-transparent border border-solid border-[rgba(255,255,255,0.30)] text-white text-[12px] font-bold uppercase tracking-[0.1em] no-underline [transition:background_.15s_ease,border-color_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.5)] hover:-translate-y-px whitespace-nowrap max-[420px]:px-3 max-[420px]:text-[11px] max-[420px]:tracking-[0.08em]"
            >
              {t("watch_details")}
            </Link>
            {!ownsFeatured && saleKind === "expired" && (
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0"
                  aria-hidden="true"
                />
                {t("watch_replay_expired")}
              </span>
            )}

            {ownsFeatured && !isLive && hasTime && (
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {t("watch_starts_in")}
                </span>
                <span className="text-[28px] font-black text-white [font-variant-numeric:tabular-nums] tracking-[-0.02em] leading-none max-[420px]:text-[22px]">
                  {days > 0 ? `${days} ${t("watch_day_short")} ` : ""}
                  {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
                </span>
              </div>
            )}

            {ownsFeatured && inLiveWindow && streamChecked && !streamLive && (
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-live-blink shrink-0"
                  aria-hidden="true"
                />
                {t("watch_waiting_stream")}
              </span>
            )}

            {ownsFeatured && saleKind === "replay" && (
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"
                  aria-hidden="true"
                />
                {t("watch_replay_available")}
              </span>
            )}

            {ownsFeatured && saleKind === "expired" && (
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0"
                  aria-hidden="true"
                />
                {t("watch_replay_expired")}
              </span>
            )}

            {ownsFeatured && inLiveWindow && streamLive && (
              <button
                type="button"
                onClick={onWatch}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-sm bg-transparent border-2 border-solid border-white text-white text-[12px] font-bold uppercase tracking-[0.1em] cursor-pointer font-[inherit] [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.1)] hover:-translate-y-px whitespace-nowrap max-[420px]:flex-1 max-[420px]:px-3 max-[420px]:text-[11px] max-[420px]:tracking-[0.06em] max-[420px]:gap-1.5"
              >
                <span
                  className="w-2 h-2 rounded-full bg-[#e53935] animate-live-blink shrink-0"
                  aria-hidden="true"
                />
                {t("watch_watch_live")}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type SaleKind = "live" | "replay" | "expired";
const REPLAY_FALLBACK_DAYS = 30;
const LIVE_FALLBACK_MS = 3 * 60 * 60 * 1000;

function resolveSaleKind(event: TicketModalEvent): SaleKind {
  const now = Date.now();
  const startMs = event.start_time ? new Date(event.start_time).getTime() : NaN;

  let endMs = NaN;
  if (event.live_end_at) {
    const v = new Date(event.live_end_at).getTime();
    if (!Number.isNaN(v)) endMs = v;
  }
  if (Number.isNaN(endMs) && !Number.isNaN(startMs)) {
    endMs = startMs + LIVE_FALLBACK_MS;
  }

  if (Number.isNaN(endMs) || now < endMs) return "live";

  let replayUntilMs = NaN;
  if (event.replay_available_until) {
    const v = new Date(event.replay_available_until).getTime();
    if (!Number.isNaN(v)) replayUntilMs = v;
  }
  if (Number.isNaN(replayUntilMs)) {
    replayUntilMs = endMs + REPLAY_FALLBACK_DAYS * 24 * 60 * 60 * 1000;
  }

  if (now <= replayUntilMs) return "replay";
  return "expired";
}
