import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getEvent } from '../data/store';
import type { EventRecord } from '../data/store';

const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { monthMn: '', day: 0, year: 0, time: '' };
  const h = d.getHours(), m = d.getMinutes();
  return {
    monthMn: MONTHS_MN[d.getMonth()],
    day: d.getDate(),
    year: d.getFullYear(),
    time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  };
}

const money = (n: number) => n.toLocaleString('en-US') + '₮';

export default function WatchEventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    <div style={{ minHeight: '100vh', background: '#071526', color: '#fff' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 28px', height: 60,
        background: 'rgba(7,21,38,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', padding: '6px 0',
            transition: 'color .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Буцах
        </button>
        <Link to="/" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <img src="/assets/images/brand/logo-white.png" alt="Төв Цэнгэлдэх Хүрээлэн" style={{ height: 32 }} />
        </Link>
      </header>

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          Уншиж байна…
        </div>
      )}

      {!loading && !event && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          Арга хэмжээ олдсонгүй.
        </div>
      )}

      {event && (
        <>
          {/* Hero */}
          <div className="relative w-full overflow-hidden bg-[#0a1628]" style={{ aspectRatio: '21/9', minHeight: 200, maxHeight: 480 }}>
            {event.image && (
              <img
                src={event.image}
                alt={event.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
            {/* Dark gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,21,38,0.15) 0%, rgba(7,21,38,0.55) 60%, rgba(7,21,38,0.95) 100%)' }} />
            {/* Event title over image */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-8 md:px-12 md:pb-10" style={{ maxWidth: 900 }}>
              {event.pill && (
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                  {event.pill}
                </div>
              )}
              <h1 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.05, color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
                {event.title}
              </h1>
            </div>
            {isLive && (
              <div style={{ position: 'absolute', top: 20, left: 48, display: 'inline-flex', alignItems: 'center', gap: 7, background: '#e53935', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', borderRadius: 999, padding: '5px 12px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'pulse 1.4s ease-in-out infinite' }} />
                LIVE
              </div>
            )}
          </div>

          {/* Body — two equal cards side by side */}
          <div className="max-w-[1200px] mx-auto px-5 py-10 md:px-8 md:py-14 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">

            {/* Left card: event info */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '36px 40px',
            }}>
              {dt?.monthMn && (
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                  {dt.year} оны {dt.monthMn} {dt.day}
                </div>
              )}
              <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.1, color: '#fff' }}>
                {event.title}
              </h2>
              {event.desc && (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.72, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
                  {event.desc}
                </p>
              )}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '28px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>Төв Цэнгэлдэх Хүрээлэн · Улаанбаатар</span>
              </div>
            </div>

            {/* Right card: ticket purchase */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '36px 40px',
            }}>
              {dt?.monthMn && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.0 }}>
                    {dt.monthMn} {dt.day}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                    {dt.year} он · {dt.time}
                  </div>
                </div>
              )}

              <Link
                to="/watch"
                className="flex items-center justify-center gap-2 w-full rounded-xl text-white font-bold text-[14px] tracking-[0.1em] uppercase no-underline py-4 px-6 transition-colors bg-blue-600 hover:bg-blue-700"
              >
                Тасалбар авах
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                </svg>
              </Link>

              {event.base > 0 && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 10, textAlign: 'center' }}>
                  {money(event.base)}-аас эхлэх үнэтэй
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '28px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 5 }}>Байршил</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>Төв Цэнгэлдэх Хүрээлэн · Улаанбаатар</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 5 }}>Онлайн дамжуулалт</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>360° · 4 камер · HD чанар</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
