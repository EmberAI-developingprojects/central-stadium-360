import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { getEvent } from '../data/store';
import type { EventRecord } from '../data/store';

const MONTHS_MN = [
  '1 сар', '2 сар', '3 сар', '4 сар', '5 сар', '6 сар',
  '7 сар', '8 сар', '9 сар', '10 сар', '11 сар', '12 сар',
];
const WEEKDAYS_LONG_MN = [
  'Ням гариг', 'Даваа гариг', 'Мягмар гариг', 'Лхагва гариг',
  'Пүрэв гариг', 'Баасан гариг', 'Бямба гариг',
];

const PAGE_CLS = "min-h-screen bg-surface-1";

const HERO_CLS =
  "relative w-full min-h-[380px] bg-cover bg-center bg-no-repeat overflow-hidden max-[640px]:min-h-[240px]";
const HERO_OVERLAY_CLS =
  "absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.20)_0%,rgba(15,23,42,0.55)_70%,rgba(15,23,42,0.92)_100%)]";
const HERO_PLACEHOLDER_CLS =
  "absolute inset-0 bg-[linear-gradient(135deg,#2230C6_0%,#1A26A0_60%,#131C7A_100%)]";
const HERO_INNER_CLS =
  "relative max-w-screen-page mx-auto min-h-[380px] px-6 py-10 flex flex-col justify-end max-[640px]:px-5 max-[640px]:min-h-[240px] max-[640px]:py-6";
const HERO_PILL_CLS =
  "inline-flex self-start items-center gap-2 bg-brand-blue text-white rounded-full text-[11px] font-bold uppercase tracking-[0.14em] py-1.5 px-3 mb-4 shadow-[0_4px_14px_-4px_rgba(34,48,198,0.55)]";
const HERO_TITLE_CLS =
  "text-[48px] font-extrabold tracking-[-0.02em] m-0 leading-[1.1] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] max-[920px]:text-[36px] max-[640px]:text-[26px]";

const SECTION_CLS = "w-full px-6 py-14 max-[920px]:px-5 max-[920px]:py-9";
const INNER_CLS = "max-w-screen-page mx-auto";

const BACK_LINK_CLS =
  "inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft no-underline hover:text-brand-blue mb-5 [&_svg]:w-[14px] [&_svg]:h-[14px]";

const PANEL_CLS =
  "bg-white border border-solid border-[rgba(31,41,55,0.08)] rounded-[20px] p-8 shadow-[0_10px_30px_-22px_rgba(31,41,55,0.18)] max-[640px]:p-5 max-[640px]:rounded-2xl";

const PANEL_HEADING_CLS =
  "text-[22px] font-extrabold tracking-[-0.01em] text-ink m-0 mb-6 max-[640px]:text-[18px] max-[640px]:mb-4";

const EVENT_HEAD_CLS =
  "flex items-center gap-6 max-[640px]:gap-4 max-[640px]:flex-col max-[640px]:items-start";

const DATE_COL_CLS =
  "flex flex-col items-center justify-center text-center w-[112px] min-w-[112px] py-4 px-3 rounded-2xl bg-surface-1 border border-solid border-[rgba(31,41,55,0.06)] max-[640px]:w-auto max-[640px]:min-w-0 max-[640px]:flex-row max-[640px]:items-baseline max-[640px]:gap-2.5 max-[640px]:py-2 max-[640px]:px-3";
const DATE_YEAR_CLS =
  "text-[10.5px] font-bold text-ink-soft tracking-[0.12em] uppercase";
const DATE_MONTH_CLS =
  "text-[12px] font-semibold text-ink-soft tracking-[0.06em] mt-1 max-[640px]:mt-0 uppercase";
const DATE_DAY_CLS =
  "text-[42px] font-extrabold leading-none text-brand-blue mt-1.5 max-[640px]:text-[26px] max-[640px]:mt-0 max-[640px]:order-first";

const EVENT_MAIN_CLS = "flex-1 min-w-0 max-[640px]:pt-0";
const VENUE_CLS =
  "text-[18px] font-bold text-ink m-0 leading-[1.35] max-[640px]:text-[16px]";
const WEEKDAY_CLS = "mt-2 inline-flex items-center gap-2 text-[13.5px] text-ink-soft";

const TICKET_LIST_CLS = "mt-7 flex flex-col gap-2.5";
const TICKET_ITEM_CLS =
  "flex items-center justify-between gap-4 py-4 px-5 rounded-2xl bg-surface-1 border border-solid border-[rgba(31,41,55,0.06)] max-[540px]:flex-col max-[540px]:items-start max-[540px]:gap-3";
const TICKET_NAME_CLS = "text-[15px] font-semibold text-ink leading-[1.35]";
const TICKET_KIND_CLS = "text-[12.5px] text-ink-soft mt-1";
const TICKET_PRICE_CLS = "text-[16px] font-extrabold text-ink tracking-tight";
const TICKET_RIGHT_CLS = "flex items-center gap-5 max-[540px]:w-full max-[540px]:justify-between max-[540px]:gap-3";
const TICKET_CTA_CLS =
  "inline-flex items-center gap-2 rounded-full bg-brand-blue text-white text-[13px] font-semibold no-underline py-2.5 px-5 [transition:background_.15s_ease,transform_.15s_ease,box-shadow_.2s_ease] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-[14px] [&_svg]:h-[14px]";

const DESC_WRAP_CLS = "mt-8";
const DESC_HEADING_CLS =
  "text-[14px] font-bold text-ink-soft uppercase tracking-[0.1em] m-0 mb-3";
const DESC_CLS =
  "text-[15px] leading-[1.75] text-ink m-0 whitespace-pre-line";

const EMPTY_CLS =
  "max-w-screen-page mx-auto px-6 py-16 text-center text-ink-soft";

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getEvent(id)
      .then((row) => {
        if (!row) setError('Арга хэмжээ олдсонгүй.');
        setEvent(row);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Алдаа гарлаа'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const d = event ? new Date(event.start_time) : null;
  const valid = d ? !Number.isNaN(d.getTime()) : false;
  const year = valid && d ? d.getFullYear() : '';
  const monthLabel = valid && d ? MONTHS_MN[d.getMonth()] : '';
  const day = valid && d ? d.getDate() : '';
  const weekday = valid && d ? WEEKDAYS_LONG_MN[d.getDay()] : '';
  const time = valid && d
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : '';

  return (
    <div className={PAGE_CLS}>
      <SiteHeader />

      {loading && <div className={EMPTY_CLS}>Уншиж байна…</div>}
      {!loading && error && <div className={EMPTY_CLS}>{error}</div>}

      {event && (
        <>
          <header
            className={HERO_CLS}
            style={event.image ? { backgroundImage: `url('${event.image}')` } : undefined}
          >
            {!event.image && <div className={HERO_PLACEHOLDER_CLS} aria-hidden="true" />}
            <div className={HERO_OVERLAY_CLS} aria-hidden="true" />
            <div className={HERO_INNER_CLS}>
              {event.pill && <span className={HERO_PILL_CLS}>{event.pill}</span>}
              <h1 className={HERO_TITLE_CLS}>{event.title}</h1>
            </div>
          </header>

          <section className={SECTION_CLS}>
            <div className={INNER_CLS}>
              <Link to="/events" className={BACK_LINK_CLS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 19"/>
                </svg>
                Бүх арга хэмжээ рүү буцах
              </Link>

              <div className={PANEL_CLS}>
                <h2 className={PANEL_HEADING_CLS}>Арга хэмжээ</h2>

                <div className={EVENT_HEAD_CLS}>
                  <div className={DATE_COL_CLS} aria-hidden="true">
                    <span className={DATE_YEAR_CLS}>{year} он</span>
                    <span className={DATE_MONTH_CLS}>{monthLabel}</span>
                    <span className={DATE_DAY_CLS}>{day}</span>
                  </div>

                  <div className={EVENT_MAIN_CLS}>
                    <h3 className={VENUE_CLS}>
                      Төв Цэнгэлдэх Хүрээлэн · Улаанбаатар
                    </h3>
                    <div className={WEEKDAY_CLS}>
                      {weekday}{time ? ` · ${time}` : ''}
                    </div>
                  </div>
                </div>

                <div className={TICKET_LIST_CLS}>
                  <div className={TICKET_ITEM_CLS}>
                    <div>
                      <div className={TICKET_NAME_CLS}>Онлайн тасалбар (360° дамжуулалт)</div>
                      <div className={TICKET_KIND_CLS}>Нийтийн борлуулалт</div>
                    </div>
                    <div className={TICKET_RIGHT_CLS}>
                      <span className={TICKET_PRICE_CLS}>{money(event.base)}</span>
                      <Link to={`/watch?event=${event.id}`} className={TICKET_CTA_CLS}>
                        Тасалбар авах
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>

                {event.desc && (
                  <div className={DESC_WRAP_CLS}>
                    <h3 className={DESC_HEADING_CLS}>Тайлбар</h3>
                    <p className={DESC_CLS}>{event.desc}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
