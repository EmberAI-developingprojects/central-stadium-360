import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { getEvent } from "../../data/store";
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
const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtDate(iso: string, lang: "mn" | "en") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()))
    return { month: "", day: 0, year: 0, time: "" };
  const h = d.getHours(),
    m = d.getMinutes();
  return {
    month: lang === "en" ? MONTHS_EN[d.getMonth()] : MONTHS_MN[d.getMonth()],
    day: d.getDate(),
    year: d.getFullYear(),
    time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

const money = (n: number) => n.toLocaleString("en-US") + "₮";

export default function WatchEventDetail() {
  const { t, i18n } = useTranslation();
  const lang: "mn" | "en" = i18n.language === "en" ? "en" : "mn";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getEvent(id)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [id]);

  const dt = event ? fmtDate(event.start_time, lang) : null;
  const isLive = event?.start_time
    ? new Date(event.start_time).getTime() <= Date.now()
    : false;

  return (
    <div className="min-h-screen bg-[#071526] text-white">
      <header className="sticky top-0 z-50 flex items-center gap-2 sm:gap-4 h-14 sm:h-[60px] px-4 sm:px-6 md:px-7 bg-[rgba(7,21,38,0.92)] backdrop-blur-xl border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 sm:gap-2 bg-transparent border-0 cursor-pointer text-white/60 hover:text-white text-[12px] sm:text-[13px] font-semibold font-[inherit] py-1.5 px-0 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 shrink-0"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="truncate">{t("event_detail_back")}</span>
        </button>
        <div className="ml-auto flex items-center gap-2 sm:gap-3.5 shrink-0">
          <LanguageSwitcher dark />
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/assets/images/brand/logo-white.png"
              alt="Төв Цэнгэлдэх Хүрээлэн"
              className="h-7 sm:h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {loading && (
        <div className="text-center py-20 px-6 text-white/40 text-sm">
          {t("event_detail_loading")}
        </div>
      )}

      {!loading && !event && (
        <div className="text-center py-20 px-6 text-white/40 text-sm">
          {t("event_detail_not_found")}
        </div>
      )}

      {event && (
        <>
          <div className="relative w-full overflow-hidden bg-[#0a1628] flex items-center justify-center min-h-[320px] max-h-[78vh]">
            {event.image && (
              <>
                <img
                  src={event.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover block scale-110 blur-2xl opacity-60"
                  loading="eager"
                />
                <img
                  src={event.image}
                  alt={event.title}
                  className="relative max-w-full block"
                  style={{ maxHeight: "78vh", height: "auto", width: "auto" }}
                  loading="eager"
                />
              </>
            )}
            {isLive && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-6 md:top-5 md:left-12 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase rounded-full py-1 px-2.5 sm:py-1.5 sm:px-3 z-10">
                <span className="w-[7px] h-[7px] rounded-full bg-white [animation:pulse_1.4s_ease-in-out_infinite]" />
                LIVE
              </div>
            )}
          </div>

          <div className="max-w-[1200px] mx-auto px-4 py-8 sm:px-5 sm:py-10 md:px-8 md:py-14 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:gap-8 items-start">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl sm:rounded-[20px] p-5 sm:p-7 md:p-10">
              {dt?.month && (
                <div className="text-[11px] sm:text-xs font-bold tracking-[0.1em] uppercase text-white/40 mb-3 sm:mb-4">
                  {lang === "en"
                    ? `${dt.month} ${dt.day}, ${dt.year}`
                    : `${dt.year} оны ${dt.month} ${dt.day}`}
                </div>
              )}
              <h2 className="m-0 mb-3 sm:mb-4 text-[20px] sm:text-[26px] md:text-[32px] lg:text-[36px] font-black uppercase tracking-[-0.01em] leading-[1.1] text-white">
                {event.title}
              </h2>
              {event.desc && (
                <p className="m-0 text-[13px] sm:text-sm leading-[1.72] text-white/50 tracking-[0.02em]">
                  {event.desc}
                </p>
              )}
              <div className="h-px bg-white/10 my-6 sm:my-7" />
              <div className="flex items-center gap-2.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[13px] sm:text-sm text-white/55">
                  {t("event_detail_location_value")}
                </span>
              </div>
            </div>

            <div className="bg-white/[0.05] border border-white/10 rounded-2xl sm:rounded-[20px] p-5 sm:p-7 md:p-10">
              {dt?.month && (
                <div className="mb-6 sm:mb-7">
                  <div className="text-[30px] sm:text-[34px] md:text-[38px] font-black tracking-[-0.02em] text-white leading-none">
                    {dt.month} {dt.day}
                  </div>
                  <div className="text-[15px] sm:text-base md:text-[17px] font-semibold text-white/45 mt-1.5">
                    {dt.year}
                    {t("event_detail_year_suffix")} · {dt.time}
                  </div>
                </div>
              )}

              <Link
                to="/watch"
                className="flex items-center justify-center gap-2 w-full rounded-xl text-white font-bold text-[13px] sm:text-[14px] tracking-[0.1em] uppercase no-underline py-3.5 sm:py-4 px-5 sm:px-6 transition-colors bg-blue-600 hover:bg-blue-700"
              >
                {t("event_detail_buy")}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
                </svg>
              </Link>

              {event.base > 0 && (
                <div className="text-[12px] sm:text-[13px] text-white/40 mt-2.5 text-center">
                  {money(event.base)}
                  {t("event_detail_starting_from")}
                </div>
              )}

              <div className="h-px bg-white/10 my-6 sm:my-7" />

              <div className="flex flex-col gap-4 sm:gap-5">
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase text-white/40 mb-1 sm:mb-1.5">
                    {t("event_detail_location")}
                  </div>
                  <div className="text-[13px] sm:text-sm text-white/75">
                    {t("event_detail_location_value")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase text-white/40 mb-1 sm:mb-1.5">
                    {t("event_detail_broadcast")}
                  </div>
                  <div className="text-[13px] sm:text-sm text-white/75">
                    {t("event_detail_broadcast_value")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
