import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getEvent } from "../../data/store";
import type { EventRecord } from "../../data/store";
import { pickEventLocale } from "../../lib/eventLocale";

const MONTHS_EN = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function intlLocale(lang: string): string {
  return lang.toLowerCase().startsWith("mn") ? "mn-MN" : "en-US";
}

function fmtDate(iso: string, lang: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours(),
    m = d.getMinutes();
  const locale = intlLocale(lang);
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  }).format(d);
  return {
    day: d.getDate(),
    monthEn: MONTHS_EN[d.getMonth()],
    year: d.getFullYear(),
    weekday,
    time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

const money = (n: number) => n.toLocaleString("en-US") + "₮";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const loc = useMemo(
    () =>
      event
        ? pickEventLocale(event, i18n.language)
        : { title: "", desc: "" },
    [event, i18n.language],
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getEvent(id)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [id]);

  const dt = event ? fmtDate(event.start_time, i18n.language) : null;
  const isLive = event?.start_time
    ? new Date(event.start_time).getTime() <= Date.now()
    : false;

  const nowMs = Date.now();
  const startMs = event?.start_time
    ? new Date(event.start_time).getTime()
    : NaN;
  let liveEndMs: number | null = null;
  if (event?.live_end_at) {
    const t = new Date(event.live_end_at).getTime();
    if (!Number.isNaN(t)) liveEndMs = t;
  }
  if (liveEndMs === null && !Number.isNaN(startMs)) {
    liveEndMs = startMs + 3 * 60 * 60 * 1000;
  }
  const liveOver = liveEndMs !== null && nowMs > liveEndMs;
  const replayExpired = event?.replay_available_until
    ? nowMs > new Date(event.replay_available_until).getTime()
    : false;
  const replayAvailable =
    (event?.replay_price ?? 0) > 0 && !replayExpired;

  return (
    <div className="min-h-screen bg-surface-1">
      <SiteHeader />

      {loading && (
        <div className="max-w-screen-page mx-auto px-6 py-20 text-center text-ink-soft text-[14px]">
          {t("event_detail_loading")}
        </div>
      )}
      {!loading && !event && (
        <div className="max-w-screen-page mx-auto px-6 py-20 text-center text-ink-soft text-[14px]">
          {t("event_detail_not_found")}
        </div>
      )}

      {event && (
        <>
          <div
            className="relative w-full overflow-hidden bg-[#0a1628]"
            style={{ aspectRatio: "16/9", minHeight: 320, maxHeight: 620 }}
          >
            {event.image && (
              <>
                <img
                  src={event.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
                />
                <img
                  src={event.image}
                  alt={loc.title}
                  className="absolute inset-0 w-full h-full object-contain block z-[1]"
                  loading="eager"
                />
              </>
            )}
            <div
              className="absolute inset-0 z-[2] pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(10,22,40,0) 55%, rgba(10,22,40,0.55) 80%, rgba(10,22,40,0.95) 100%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-5 pb-7 md:px-14 md:pb-10 z-[3]"
              style={{ maxWidth: 860 }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(24px, 4.5vw, 52px)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.06,
                  color: "#fff",
                  textShadow: "0 2px 20px rgba(0,0,0,0.6)",
                }}
              >
                {loc.title}
              </h1>
            </div>
            {isLive && (
              <span className="absolute top-4 left-5 md:left-14 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[11px] font-bold uppercase tracking-[0.14em] rounded-full px-3 py-1.5 z-[3]">
                <span className="w-[7px] h-[7px] rounded-full bg-white animate-live-blink" />
                LIVE
              </span>
            )}
          </div>

          <div className="max-w-[1060px] mx-auto px-5 py-10 md:px-10 md:py-14 grid grid-cols-1 md:[grid-template-columns:1fr_260px] gap-8 md:gap-14 items-start">
            <div>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft no-underline hover:text-brand-blue mb-6"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                {t("event_detail_back_to_events")}
              </Link>

              {dt && (
                <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-ink-soft mb-3">
                  {dt.monthEn} {dt.day} / {dt.year}
                </div>
              )}
              <h2 className="text-[clamp(22px,3.5vw,38px)] font-extrabold tracking-tight leading-[1.1] text-ink m-0 mb-3 uppercase">
                {loc.title}
              </h2>
              {loc.desc && (
                <p className="text-[14px] leading-relaxed text-ink-soft m-0 mb-8">
                  {loc.desc}
                </p>
              )}

              <div className="h-px bg-[rgba(31,41,55,0.1)] my-8" />

              <div className="flex flex-col gap-3">
                {dt && (
                  <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-brand-blue"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {dt.weekday} · {dt.time}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-brand-blue"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {t("event_detail_location_value")}
                </div>
                <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-brand-blue"
                  >
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  {t("event_detail_inline_stream")}
                </div>
              </div>
            </div>

            <div className="order-first md:order-last md:sticky md:top-24 bg-white rounded-2xl overflow-hidden shadow-[0_8px_32px_-12px_rgba(31,41,55,0.18)] border border-solid border-[rgba(31,41,55,0.07)]">
              <div className="relative px-6 pt-6 pb-5 bg-[linear-gradient(180deg,rgba(34,48,198,0.04)_0%,rgba(255,255,255,0)_100%)]">
                <div className="mb-4">
                  {liveOver && replayAvailable && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-tint text-brand-blue px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                      {t("event_detail_replay_badge")}
                    </span>
                  )}
                  {liveOver && !replayAvailable && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-600 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      {t("watch_card_ended")}
                    </span>
                  )}
                  {!liveOver && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]">
                      <span className="relative inline-flex w-2 h-2">
                        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                        <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                      </span>
                      {isLive ? t("watch_card_live") : t("watch_card_upcoming")}
                    </span>
                  )}
                </div>

                {dt && (
                  <div className="flex items-center gap-3.5">
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-[rgba(31,41,55,0.08)] shadow-[0_4px_12px_-6px_rgba(31,41,55,0.18)] text-ink"
                    >
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-brand-blue">
                          {dt.monthEn}
                        </span>
                        <span className="text-[20px] font-extrabold tracking-tight mt-0.5">
                          {dt.day}
                        </span>
                      </div>
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                        {dt.weekday}
                      </div>
                      <div className="text-[17px] font-extrabold text-ink leading-tight tracking-[-0.01em] tabular-nums">
                        {dt.time}
                        <span className="ml-2 text-[12px] font-semibold text-ink-soft">
                          {dt.year}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-2">
                {!liveOver && (
                  <>
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[linear-gradient(135deg,#2230C6_0%,#3A48D8_100%)] text-white font-bold text-[13px] tracking-[0.08em] uppercase no-underline py-3.5 px-5 shadow-[0_10px_24px_-10px_rgba(34,48,198,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] [transition:transform_.18s_ease,box-shadow_.22s_ease,filter_.18s_ease] hover:-translate-y-px hover:shadow-[0_14px_28px_-10px_rgba(34,48,198,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] hover:[filter:brightness(1.04)]"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
                      </svg>
                      {t("event_detail_buy")}
                    </Link>
                    {event.base > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-1 px-4 py-2.5">
                        <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                          {t("event_detail_price_label")}
                        </span>
                        <span className="text-[16px] font-extrabold text-ink tabular-nums tracking-tight">
                          {money(event.base)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {liveOver && replayAvailable && (
                  <>
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[linear-gradient(135deg,#2230C6_0%,#3A48D8_100%)] text-white font-bold text-[13px] tracking-[0.08em] uppercase no-underline py-3.5 px-5 shadow-[0_10px_24px_-10px_rgba(34,48,198,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] [transition:transform_.18s_ease,box-shadow_.22s_ease,filter_.18s_ease] hover:-translate-y-px hover:shadow-[0_14px_28px_-10px_rgba(34,48,198,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] hover:[filter:brightness(1.04)]"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9" />
                        <path d="M3 4v5h5" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      {t("event_detail_buy_replay")}
                    </Link>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-1 px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft leading-none">
                          {t("event_detail_price_label")}
                        </span>
                        <span className="text-[10.5px] text-ink-soft mt-1 leading-none">
                          {t("event_detail_replay_short_perk")}
                        </span>
                      </div>
                      <span className="text-[16px] font-extrabold text-ink tabular-nums tracking-tight">
                        {money(event.replay_price)}
                      </span>
                    </div>
                  </>
                )}

                {liveOver && !replayAvailable && (
                  <div className="w-full rounded-xl bg-surface-1 border border-solid border-[rgba(31,41,55,0.08)] px-5 py-4 text-center">
                    <div className="text-[13px] font-bold text-ink leading-tight">
                      {t("event_detail_event_over")}
                    </div>
                    <div className="text-[11.5px] text-ink-soft mt-1">
                      {t("event_detail_replay_expired_note")}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-[rgba(31,41,55,0.08)] mx-6 my-5" />

              <div className="px-6 pb-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex w-8 h-8 rounded-lg bg-brand-blue-tint text-brand-blue items-center justify-center shrink-0 mt-0.5"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      {t("event_detail_location")}
                    </div>
                    <div className="text-[13px] text-ink mt-0.5 leading-snug">
                      {t("event_detail_location_value")}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex w-8 h-8 rounded-lg bg-brand-blue-tint text-brand-blue items-center justify-center shrink-0 mt-0.5"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      {t("event_detail_broadcast")}
                    </div>
                    <div className="text-[13px] text-ink mt-0.5 leading-snug">
                      {t("event_detail_broadcast_value")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
