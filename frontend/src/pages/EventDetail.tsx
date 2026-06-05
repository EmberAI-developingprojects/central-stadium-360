import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { getEvent } from '../data/store';
import type { EventRecord } from '../data/store';

const MONTHS_MN = ['1 сар','2 сар','3 сар','4 сар','5 сар','6 сар','7 сар','8 сар','9 сар','10 сар','11 сар','12 сар'];
const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WEEKDAYS_MN = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'];

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours(), m = d.getMinutes();
  return {
    day: d.getDate(),
    month: MONTHS_MN[d.getMonth()],
    monthEn: MONTHS_EN[d.getMonth()],
    year: d.getFullYear(),
    weekday: WEEKDAYS_MN[d.getDay()],
    time: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
  };
}

const money = (n: number) => n.toLocaleString('en-US') + '₮';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getEvent(id).then(setEvent).finally(() => setLoading(false));
  }, [id]);

  const dt = event ? fmtDate(event.start_time) : null;
  const isLive = event?.start_time ? new Date(event.start_time).getTime() <= Date.now() : false;

  return (
    <div className="min-h-screen bg-surface-1">
      <SiteHeader />

      {loading && (
        <div className="max-w-screen-page mx-auto px-6 py-20 text-center text-ink-soft text-[14px]">
          Уншиж байна…
        </div>
      )}
      {!loading && !event && (
        <div className="max-w-screen-page mx-auto px-6 py-20 text-center text-ink-soft text-[14px]">
          Арга хэмжээ олдсонгүй.
        </div>
      )}

      {event && (
        <>

          <div className="relative w-full overflow-hidden bg-[#0a1628]" style={{ aspectRatio: '21/9', minHeight: 220, maxHeight: 460 }}>
            {event.image && (
              <img src={event.image} alt={event.title} className="w-full h-full object-cover block" loading="eager" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,22,40,0.1) 0%, rgba(10,22,40,0.55) 55%, rgba(10,22,40,0.92) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-7 md:px-14 md:pb-10" style={{ maxWidth: 860 }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4.5vw, 52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.06, color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                {event.title}
              </h1>
            </div>
            {isLive && (
              <span className="absolute top-4 left-5 md:left-14 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[11px] font-bold uppercase tracking-[0.14em] rounded-full px-3 py-1.5">
                <span className="w-[7px] h-[7px] rounded-full bg-white animate-live-blink" />LIVE
              </span>
            )}
          </div>

          <div className="max-w-[1060px] mx-auto px-5 py-10 md:px-10 md:py-14 grid grid-cols-1 md:[grid-template-columns:1fr_260px] gap-8 md:gap-14 items-start">

            <div>
              <Link to="/events" className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft no-underline hover:text-brand-blue mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Бүх арга хэмжээ
              </Link>

              {dt && (
                <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-ink-soft mb-3">
                  {dt.monthEn} {dt.day} / {dt.year}
                </div>
              )}
              <h2 className="text-[clamp(22px,3.5vw,38px)] font-extrabold tracking-tight leading-[1.1] text-ink m-0 mb-3 uppercase">
                {event.title}
              </h2>
              {event.desc && (
                <p className="text-[14px] leading-relaxed text-ink-soft m-0 mb-8">{event.desc}</p>
              )}

              <div className="h-px bg-[rgba(31,41,55,0.1)] my-8" />

              <div className="flex flex-col gap-3">
                {dt && (
                  <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-blue">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {dt.weekday} · {dt.time}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-blue">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Төв Цэнгэлдэх Хүрээлэн · Улаанбаатар
                </div>
                <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-blue">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  360° онлайн дамжуулалт · 4 камер
                </div>
              </div>
            </div>

            <div className="order-first md:order-last md:sticky md:top-24 bg-white rounded-2xl p-6 shadow-[0_8px_32px_-12px_rgba(31,41,55,0.18)] border border-solid border-[rgba(31,41,55,0.07)]">
              {dt && (
                <div className="mb-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft mb-1">{dt.weekday}</div>
                  <div className="text-[28px] font-extrabold text-ink leading-none tracking-tight">
                    {dt.day} <span className="text-[18px] font-semibold text-ink-soft">{dt.month}</span>
                  </div>
                  <div className="text-[13px] text-ink-soft mt-1">{dt.time}</div>
                </div>
              )}

              <Link
                to="/watch"
                className="flex items-center justify-center gap-2 w-full rounded-full bg-brand-blue text-white font-bold text-[13px] tracking-[0.1em] uppercase no-underline py-3.5 px-5 shadow-[0_6px_18px_-8px_rgba(34,48,198,0.55)] hover:bg-brand-blue-soft hover:-translate-y-px transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                </svg>
                Тасалбар авах
              </Link>

              {event.base > 0 && (
                <div className="text-[12px] text-ink-soft text-center mt-2">{money(event.base)}-аас эхлэх үнэтэй</div>
              )}

              <div className="h-px bg-[rgba(31,41,55,0.08)] my-5" />

              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft mb-0.5">Байршил</div>
                  <div className="text-[13px] text-ink">Төв Цэнгэлдэх Хүрээлэн · Улаанбаатар</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft mb-0.5">Дамжуулалт</div>
                  <div className="text-[13px] text-ink">360° · 4 камер · HD чанар</div>
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
