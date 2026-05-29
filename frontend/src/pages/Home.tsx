import { useEffect, useRef, useState } from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import StoryVideo from '../components/StoryVideo';
import useRevealOnScroll from '../hooks/useRevealOnScroll';
import useSmoothAnchors from '../hooks/useSmoothAnchors';
import { REVEAL_UP_CLS } from '../hooks/_revealCls';
import { useGatedNavigate } from '../auth';
import { getHomeContent, listEvents } from '../data/store';
import type {
  EventRecord,
  HomeContent,
  MemberItem,
  NewsItem,
  Partner,
  RoadmapItem,
} from '../data/store';

const EMPTY_CONTENT: HomeContent = { news: [], partners: [], roadmap: [], members: [] };

export default function Home() {
  useRevealOnScroll();
  useSmoothAnchors();
  const gatedGo = useGatedNavigate();

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [content, setContent] = useState<HomeContent>(EMPTY_CONTENT);

  useEffect(() => {
    let alive = true;
    Promise.all([listEvents(), getHomeContent()]).then(([evts, c]) => {
      if (!alive) return;
      setEvents(evts);
      setContent(c);
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <SiteHeader />
      <Hero gatedGo={gatedGo} />
      <Highlights />
      <Stats />
      <Upcoming gatedGo={gatedGo} events={events} />
      <Members items={content.members} />
      <VideoCta />
      <Partners items={content.partners} />
      <Roadmap items={content.roadmap} />
      <News items={content.news} />
      <SiteFooter />
    </>
  );
}

function Hero({ gatedGo }: { gatedGo: (to: string) => void }) {
  return (
    <section className="w-full bg-surface-1 py-14 px-6 max-[920px]:px-5" id="top">
      <div className="max-w-screen-page mx-auto grid items-center gap-12 max-[920px]:gap-9 [grid-template-columns:55%_45%] max-[920px]:[grid-template-columns:1fr]">
        <div className={`flex flex-col items-start ${REVEAL_UP_CLS}`}>
          <span className="inline-flex items-center gap-2 bg-brand-blue-tint rounded-full text-[13px] font-medium tracking-[0.01em] text-[#1a1a1a] py-1.5 pl-2.5 pr-[14px]">
            <span className="w-2.5 h-2.5 bg-brand-blue rounded-sm inline-block" aria-hidden="true"></span>
            Тавтай морилно уу &middot; 1958 оноос
          </span>

          <h1 className="mt-5 mb-0 text-[46px] leading-[1.15] font-extrabold tracking-[-0.02em] max-w-[620px] text-[#1a1a1a] max-[920px]:text-4xl max-[480px]:text-3xl">
            Соёлын <span className="text-brand-blue italic font-extrabold">зүрх</span><br/>
            Монголын спорт<br/>
            Төв Цэнгэлдэх Хүрээлэн
          </h1>

          <p className="mt-4 mb-0 text-[15px] leading-[1.6] max-w-[420px] text-[#666666]">
            Улаанбаатарын төвд, дэлхийн жишигт нийцсэн арга хэмжээ, сэтгэл хөдөлгөм
            тоглолт, мартагдашгүй мөчүүдийг 360° форматаар манай вэбсайтаас
            хаанаас ч шууд үзээрэй.
          </p>

          <div className="mt-7 flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2.5 bg-brand-blue text-white border-0 rounded-lg text-[15px] font-semibold cursor-pointer px-6 py-3 font-[inherit] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] [transition:filter_.2s_ease,transform_.15s_ease,box-shadow_.2s_ease] hover:bg-brand-blue-soft hover:brightness-[1.03] hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] active:translate-y-px [&_svg]:block"
              type="button"
              onClick={() => gatedGo('/watch')}
            >
              Live тасалбар авах
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button
              className="bg-transparent border-0 text-[15px] font-medium cursor-pointer text-[#1a1a1a] font-[inherit] py-3 px-[14px] hover:underline"
              type="button"
            >
              Дэлгэрэнгүй
            </button>
          </div>
        </div>

        {(() => {

          const TILE_BASE =
            "absolute grid place-items-center overflow-hidden [isolation:isolate] [background:linear-gradient(132deg,rgba(255,255,255,0.10),rgba(255,255,255,0)_36%),#FAF7EE] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.36),0_10px_22px_rgba(0,0,0,0.025)] after:content-[''] after:absolute after:inset-0 after:-z-10 after:[background:radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.2),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(0,0,0,0.04),transparent_42%)] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:object-center [&_img]:block [&_img]:[transition:transform_.6s_cubic-bezier(.2,.8,.2,1)]";
          return (
            <main
              className="relative w-full max-w-[500px] mx-auto [aspect-ratio:1/1] [container-type:inline-size] max-[720px]:max-w-[420px]"
              aria-label="Four card layout"
            >
              <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                  <clipPath id="tile1-shape" clipPathUnits="objectBoundingBox">
                    <path d="M 0.1016,0 H 0.7898 C 0.8822,0 0.9677,0.0642 0.9769,0.1415 C 1.0046,0.3566 1.0116,0.5962 0.9700,0.8604 C 0.9584,0.9321 0.8799,0.9981 0.7852,0.9981 H 0.1016 C 0.0462,0.9981 0,0.9604 0,0.9151 V 0.0830 C 0,0.0377 0.0462,0 0.1016,0 Z" />
                  </clipPath>
                </defs>
              </svg>
              <section
                className={`${TILE_BASE} left-[-14.1%] top-[6.8%] w-[53.2%] h-[87.9%] [border-radius:4cqw] [clip-path:url(#tile1-shape)] hover:[&_img]:[transform:scale(1.04)]`}
              >
                <img src="/assets/images/hero/featured.jpg" alt="Онцлох үйл явдал" loading="eager" />
              </section>
              <section
                className={`${TILE_BASE} left-[42.2%] top-[6.8%] w-[51.8%] h-[28%] [border-radius:4.44cqw] [transform:skewX(18deg)] [transform-origin:center] [&_img]:[transform:skewX(-18deg)_scale(1.18)] [&_img]:[transform-origin:center] hover:[&_img]:[transform:skewX(-18deg)_scale(1.22)]`}
              >
                <img src="/assets/images/hero/stadium-aerial.png" alt="Төв цэнгэлдэх хүрээлэн" loading="lazy" />
              </section>
              <section
                className={`${TILE_BASE} left-[45.1%] top-[36.6%] w-[53.2%] h-[28%] [border-radius:3.89cqw] hover:[&_img]:[transform:scale(1.04)]`}
              >
                <img src="/assets/images/hero/event-tengri.png" alt="THUNDERZ — TENGRI" loading="lazy" />
              </section>
              <section
                className={`${TILE_BASE} left-[42.1%] top-[66.4%] w-[51.8%] h-[28.3%] [border-radius:4.44cqw] [transform:skewX(-18deg)] [transform-origin:center] [&_img]:[transform:skewX(18deg)_scale(1.18)] [&_img]:[transform-origin:center] hover:[&_img]:[transform:skewX(18deg)_scale(1.22)]`}
              >
                <img src="/assets/images/hero/live-360.png" alt="Live streaming · 360°" loading="lazy" />
              </section>
            </main>
          );
        })()}
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className="w-full bg-white py-12 px-6 max-[920px]:py-14 max-[920px]:px-5" id="about">
      <div className="max-w-screen-page mx-auto">
        <h2 className={`text-[42px] font-extrabold tracking-[-0.02em] m-0 mb-10 text-[#1a1a1a] max-[920px]:text-[34px] ${REVEAL_UP_CLS}`}>Бидний тухай</h2>

        <div className="grid gap-10 items-start [grid-template-columns:1.05fr_1fr_1fr] max-[920px]:gap-8 max-[920px]:[grid-template-columns:1fr_1fr] max-[600px]:[grid-template-columns:1fr]">
          <article className={`flex flex-col justify-center max-[920px]:[grid-column:1/-1] max-[600px]:[grid-column:auto] ${REVEAL_UP_CLS}`} data-stagger="1">
            <h3 className="text-[28px] leading-[1.3] text-ink m-0 mb-[18px] tracking-[-0.01em] font-bold max-[900px]:text-2xl">Монголын спортын зүрх — 1958 оноос хойш</h3>
            <p className="text-[17px] leading-[1.75] text-ink-soft m-0 max-[900px]:text-base">
              Төв Цэнгэлдэх Хүрээлэн нь 1958 онд байгуулагдсан, Монгол Улсын анхны үндэсний хэмжээний цэнгэлдэх. Олон арван жилийн турш үндэсний шигшээ багуудын чухал тоглолт, олон улсын тэмцээн, томоохон соёлын арга хэмжээний голлох тавцан болж ирсэн. Өнөөдөр бид 12,500 суудалтай, 25,000 хүртэлх үзэгчийг хүлээн авах хүчин чадалтай орчин үеийн цогцолбор болон өргөжиж, иргэддээ дэлхийн жишигт нийцсэн үйлчилгээ хүргэхээр зорьж байна.
            </p>
          </article>

          <div className={`w-full grid overflow-hidden bg-[#e9e9e9] text-[#b8b8b8] [aspect-ratio:1/1.05] rounded-[56px] place-items-center ${REVEAL_UP_CLS}`} data-stagger="2">
            <img src="/assets/images/stadium/exterior.jpg" alt="Төв цэнгэлдэх хүрээлэн — гадна талаас" className="w-full h-full object-cover object-center block [border-radius:inherit]" loading="lazy" />
          </div>

          <div className={`flex flex-col gap-[14px] [aspect-ratio:1/1.05] ${REVEAL_UP_CLS}`} data-stagger="3">
            <div
              className="flex-1 w-full grid cursor-pointer min-h-0 rounded-[28px] bg-[#e9e9e9] place-items-center transition-[background] duration-200 hover:bg-[#e2e2e2]"
              role="button"
              aria-label="Видео тоглуулах"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,.55) 100%), url('/assets/images/stadium/huuchin.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <span className="w-14 h-14 rounded-full bg-ink text-white grid place-items-center [&_svg]:w-[22px] [&_svg]:h-[22px] [&_svg]:ml-[3px]">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </div>
            <p className="text-[17px] font-bold leading-[1.35] m-0 text-[#1a1a1a]">Манай түүх, эрхэм зорилго, ирээдүйн төлөвлөгөөтэй танилцана уу.</p>
            <a
              href="#"
              className="self-start inline-flex items-center gap-2.5 rounded-full bg-transparent text-sm font-semibold no-underline cursor-pointer px-[22px] py-3 border-[1.5px] border-solid border-[#1a1a1a] text-[#1a1a1a] font-[inherit] [transition:background_0.2s_ease,color_0.2s_ease] hover:bg-[#1a1a1a] hover:text-white"
            >
              Дэлгэрэнгүй унших
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { num: '1958', label: 'Founded · Байгуулагдсан' },
    { num: '12,500', label: 'Seats · Суудал' },
    { num: '25k+', label: 'Capacity · Хүлээн авах' },
    { num: '105×68', label: 'Field (m) · Талбай' },
  ];
  return (
    <section className="w-full bg-white pt-8 px-6 pb-6 max-[920px]:py-16 max-[920px]:px-5">
      <div className="max-w-screen-page mx-auto pb-10 border-b border-solid border-[#e0e0e0]">
        <div className="grid items-center [grid-template-columns:1fr_auto_1fr_auto_1fr_auto_1fr] gap-[18px] max-[920px]:[grid-template-columns:1fr_1fr] max-[920px]:gap-x-[18px] max-[920px]:gap-y-8 max-[480px]:[grid-template-columns:1fr]">
          {items.map((s, i) => (
            <span key={s.num} style={{ display: 'contents' }}>
              {i > 0 && (
                <span
                  className="w-0.5 h-16 bg-brand-blue-tint relative rounded-[1px] justify-self-center max-[920px]:hidden before:content-[''] before:absolute before:left-1/2 before:w-[9px] before:h-[9px] before:rounded-full before:bg-brand-blue-tint before:-translate-x-1/2 before:-top-[5px] after:content-[''] after:absolute after:left-1/2 after:w-[9px] after:h-[9px] after:rounded-full after:bg-brand-blue-tint after:-translate-x-1/2 after:-bottom-[5px]"
                  aria-hidden="true"
                ></span>
              )}
              <div className={`flex flex-col items-center gap-2.5 text-center ${REVEAL_UP_CLS}`} data-stagger={i + 1}>
                <div className="text-[42px] font-extrabold tracking-[-0.02em] leading-none text-[#1a1a1a] max-[920px]:text-4xl">{s.num}</div>
                <div className="text-sm text-[#888] font-medium">{s.label}</div>
              </div>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

type UpcomingProps = { gatedGo: (to: string) => void; events: EventRecord[] };

function Upcoming({ gatedGo, events }: UpcomingProps) {

  const upcoming = events.map((e) => {
    const [d, y] = (e.date || '').split('·').map((s) => s.trim());
    return { id: e.id, src: e.image, alt: e.title, date: d || e.date, year: y || '', pill: e.pill };
  });

  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const intervalMs = 5500;

  useEffect(() => {
    if (upcoming.length === 0) return;
    if (idx >= upcoming.length) setIdx(0);
  }, [upcoming.length, idx]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || upcoming.length === 0) return;

    let rafId: number | null = null;
    let startTs = 0;
    let paused = false;

    const tick = (ts: number) => {
      if (paused) { rafId = requestAnimationFrame(tick); return; }
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const pct = Math.min(100, (elapsed / intervalMs) * 100);
      setProgress(pct);
      if (elapsed >= intervalMs) {
        setIdx((i) => (i + 1) % upcoming.length);
        startTs = ts;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onEnter = () => { paused = true; setProgress(0); startTs = 0; };
    const onLeave = () => { paused = false; startTs = 0; };

    const stage = stageRef.current;
    if (stage) {
      stage.addEventListener('mouseenter', onEnter);
      stage.addEventListener('mouseleave', onLeave);
    }

    let observed = false;
    if ('IntersectionObserver' in window && stage) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !observed) {
            observed = true;
            rafId = requestAnimationFrame(tick);
          } else if (!e.isIntersecting) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
            observed = false;
            startTs = 0;
          }
        });
      }, { threshold: 0.25 });
      io.observe(stage);
      return () => {
        io.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        if (stage) {
          stage.removeEventListener('mouseenter', onEnter);
          stage.removeEventListener('mouseleave', onLeave);
        }
      };
    } else {
      rafId = requestAnimationFrame(tick);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (stage) {
          stage.removeEventListener('mouseenter', onEnter);
          stage.removeEventListener('mouseleave', onLeave);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (next: number) => {
    if (upcoming.length === 0) return;
    setIdx((next + upcoming.length) % upcoming.length);
    setProgress(0);
  };

  const upBtnBase = "inline-flex items-center gap-2 rounded-full font-bold text-xs uppercase no-underline cursor-pointer py-3 px-[22px] tracking-[0.12em] border border-solid border-transparent [transition:background_0.18s_ease,color_0.18s_ease,transform_0.18s_ease] max-[720px]:py-2.5 max-[720px]:px-4 max-[720px]:text-[11px]";
  const upNavBase = "absolute top-1/2 w-12 h-12 rounded-full text-white inline-flex items-center justify-center border-0 z-[3] cursor-pointer [transform:translateY(-50%)] bg-[rgba(255,255,255,0.12)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [transition:background_0.18s_ease,color_0.18s_ease,transform_0.18s_ease] hover:bg-brand-blue hover:text-white hover:[transform:translateY(-50%)_scale(1.06)] [&_svg]:w-[22px] [&_svg]:h-[22px] max-[720px]:w-10 max-[720px]:h-10";
  const upThumbBase = "w-full rounded-[10px] overflow-hidden relative cursor-pointer bg-surface-1 p-0 block [aspect-ratio:1920/648] border-2 border-solid border-transparent [transition:border-color_0.18s_ease,transform_0.18s_ease,box-shadow_0.18s_ease] hover:[&_img]:[filter:none] hover:[&_img]:scale-[1.04]";
  const upThumbActive = "!border-brand-blue [transform:translateY(-2px)] shadow-[0_8px_22px_-6px_rgba(34,48,198,0.5)]";

  return (
    <section
      className="w-full relative px-6 pt-20 pb-[88px] [background:radial-gradient(60%_80%_at_50%_0%,rgba(34,48,198,0.05)_0%,transparent_70%),#FFFFFF] max-[600px]:px-[18px] max-[600px]:pt-14 max-[600px]:pb-[72px]"
      id="certificates"
    >
      <div className="max-w-screen-page mx-auto">
        <div className={`flex items-end justify-between gap-4 mb-8 flex-wrap ${REVEAL_UP_CLS}`}>
          <div>
            <span className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase text-brand-blue mb-3 tracking-[0.18em]">
              <span className="w-2.5 h-2.5 rounded-full animate-live-blink bg-[#E53935] shadow-[0_0_0_0_rgba(229,57,53,0.6)] flex-none" aria-hidden="true"></span>Live · Удахгүй болох
            </span>
            <h2 className="text-left text-[32px] font-extrabold text-ink m-0 tracking-[-0.01em] leading-[1.15] max-[600px]:text-2xl">Шууд дамжуулал — арга хэмжээ</h2>
          </div>
          <a href="#" className="text-[13px] font-bold uppercase text-ink no-underline inline-flex items-center gap-2 pb-1 tracking-[0.06em] border-b-2 border-solid border-transparent [transition:color_0.18s_ease,border-color_0.18s_ease,gap_0.18s_ease] hover:text-brand-blue hover:gap-3 hover:border-brand-blue [&_svg]:w-[14px] [&_svg]:h-[14px]">
            Бүх арга хэмжээ үзэх
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14"/>
              <path d="M13 6l6 6-6 6"/>
            </svg>
          </a>
        </div>

        <div className={`relative rounded-[18px] overflow-hidden bg-ink [aspect-ratio:1920/648] shadow-[0_30px_60px_-30px_rgba(15,23,42,0.5)] [isolation:isolate] ${REVEAL_UP_CLS}`} ref={stageRef}>
          <div className="absolute inset-0">
            {upcoming.map((u, i) => {
              const active = i === idx;
              return (
                <article
                  key={u.id || u.alt}
                  className={`absolute inset-0 [transition:opacity_700ms_cubic-bezier(.4,0,.2,1),transform_9s_linear] ${active ? 'opacity-100 pointer-events-auto [transform:scale(1.04)]' : 'opacity-0 pointer-events-none [transform:scale(1)]'}`}
                  data-up={i}
                >
                  <img className="w-full h-full object-cover block" src={u.src} alt={u.alt} loading={i === 0 ? 'eager' : 'lazy'} />
                  <div className="absolute flex items-end justify-between gap-4 flex-wrap text-white z-[2] inset-x-0 bottom-0 top-auto p-[clamp(16px,2.5vw,28px)] [background:linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.82)_100%)] max-[720px]:py-[14px] max-[720px]:px-4 max-[720px]:gap-2.5">
                    <div className="inline-flex items-center gap-[14px] flex-wrap">
                      <span className="text-sm font-medium uppercase tracking-[0.08em] text-[rgba(255,255,255,0.85)]">
                        <strong className="text-brand-blue-soft font-extrabold text-lg">{u.date}</strong>{u.year ? ` · ${u.year}` : ''}
                      </span>
                      <span className="rounded-full text-[11px] uppercase font-semibold text-brand-blue-soft bg-[rgba(255,255,255,0.08)] border border-solid border-[rgba(68,81,220,0.55)] py-1.5 px-3 tracking-[0.15em]">{u.pill}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="absolute inline-flex items-center gap-4 flex-wrap z-[3] right-[clamp(16px,2.5vw,28px)] bottom-[clamp(16px,2.5vw,28px)] max-[720px]:gap-2.5">
            <button
              type="button"
              className={`${upBtnBase} bg-brand-blue text-white hover:bg-brand-blue-soft hover:-translate-y-px after:content-['→'] after:[transition:transform_0.18s_ease] hover:after:translate-x-1`}
              onClick={() => gatedGo('/watch')}
            >
              Live үзэх
            </button>
            <button
              type="button"
              className="inline-flex items-center font-bold text-xs uppercase no-underline text-white pb-1 tracking-[0.12em] border-b-2 border-solid border-[rgba(255,255,255,0.55)] [transition:color_0.18s_ease,border-color_0.18s_ease] hover:text-brand-blue-soft hover:border-brand-blue-soft"
              onClick={() => gatedGo('/watch')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
            >
              Live тасалбар
            </button>
          </div>

          <button className={`${upNavBase} left-4`} onClick={() => go(idx - 1)} aria-label="Өмнөх">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className={`${upNavBase} right-4`} onClick={() => go(idx + 1)} aria-label="Дараах">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <div className="absolute left-0 right-0 bottom-0 h-[3px] z-[3] bg-[rgba(255,255,255,0.15)]" aria-hidden="true">
            <span className="block h-full w-0 [background:linear-gradient(90deg,#2230C6,#4451DC)] shadow-[0_0_12px_rgba(34,48,198,0.6)]" style={{ width: `${progress}%` }}></span>
          </div>
        </div>

        <ol className={`mt-4 mb-0 mx-0 grid gap-[14px] list-none p-0 grid-cols-4 max-[720px]:grid-cols-2 ${REVEAL_UP_CLS}`} role="tablist" aria-label="Арга хэмжээ сонгох">
          {upcoming.map((u, i) => {
            const active = i === idx;
            return (
              <li key={u.id || u.alt}>
                <button onClick={() => go(i)} className={`${upThumbBase}${active ? ' ' + upThumbActive : ''}`} aria-label={u.alt}>
                  <img className={`w-full h-full object-cover block ${active ? '[filter:none]' : '[filter:saturate(.7)_brightness(.85)]'} [transition:filter_0.18s_ease,transform_600ms_ease]`} src={u.src} alt="" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function MemberIcon({ iconKey }: { iconKey: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (iconKey) {
    case 'music':
      return <svg {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
    case 'doc':
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>;
    case 'news':
      return <svg {...common}><path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/><path d="M20 8h2v8a2 2 0 0 1-2 2"/></svg>;
    case 'chat':
      return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg>;
    case 'stream':
      return <svg {...common}><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M12 8v8"/><path d="M9 10.5L15 13.5"/><path d="M15 10.5L9 13.5"/></svg>;
    case 'stadium':
      return <svg {...common}><path d="M2 12c0-4 4.5-7 10-7s10 3 10 7-4.5 7-10 7S2 16 2 12z"/><path d="M2 12c0 2 4.5 4 10 4s10-2 10-4"/><path d="M12 5v14"/><path d="M7 6.2v11.6"/><path d="M17 6.2v11.6"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function Members({ items = [] }: { items: MemberItem[] }) {
  const memberCardCls = [
    "group bg-white rounded-[18px] flex flex-col items-start gap-4 text-left pt-7 px-[26px] pb-6 relative overflow-hidden",
    "border border-solid border-[rgba(31,41,55,0.06)] shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
    "[transition:transform_.45s_cubic-bezier(.34,1.56,.64,1),box-shadow_.35s_ease,border-color_.35s_ease,background-color_.35s_ease]",
    "hover:border-brand-blue hover:bg-brand-blue hover:[transform:translateY(-8px)_scale(1.015)] hover:shadow-[0_28px_50px_-20px_rgba(34,48,198,0.55)]",
    "before:content-[''] before:absolute before:top-0 before:h-full before:pointer-events-none before:z-[1] before:left-[-120%] before:w-[60%]",
    "before:[background:linear-gradient(115deg,transparent_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0)_70%,transparent_100%)]",
    "before:[transform:skewX(-18deg)] before:[transition:left_.9s_cubic-bezier(.4,0,.2,1)] hover:before:left-[160%]",
    "[&>*]:relative [&>*]:z-[2]",
    REVEAL_UP_CLS,
  ].join(" ");

  const cardBadgeCls = [
    "absolute inline-flex items-center gap-1.5 bg-brand-blue text-white text-[11px] font-bold uppercase rounded-full z-[3]",
    "top-5 right-5 py-1 px-2.5 tracking-[.08em] [transition:background_.25s_ease,color_.25s_ease]",
    "group-hover:bg-white group-hover:text-brand-blue",
    "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-white before:shadow-[0_0_0_0_rgba(255,255,255,.9)]",
    "before:[animation:live-pulse_1.6s_ease-in-out_infinite] before:[transition:background_.25s_ease]",
    "group-hover:before:bg-brand-blue",
  ].join(" ");

  const cardIconCls = [
    "w-14 h-14 rounded-[14px] bg-brand-blue-tint grid place-items-center text-brand-blue p-0 flex-none",
    "[transition:transform_.55s_cubic-bezier(.34,1.56,.64,1),box-shadow_.35s_ease]",
    "group-hover:[transform:translateY(-2px)_rotate(-6deg)_scale(1.08)] group-hover:shadow-[0_10px_22px_-10px_rgba(0,0,0,0.35)]",
    "[&_svg]:w-7 [&_svg]:h-7 [&_svg]:[transition:transform_.45s_cubic-bezier(.34,1.56,.64,1)]",
    "group-hover:[&_svg]:scale-[1.08]",
  ].join(" ");

  const cardBtnCls = [
    "self-start mt-auto inline-flex items-center gap-1.5 bg-transparent text-brand-blue text-sm font-semibold no-underline rounded-none shadow-none pt-1.5 px-0 pb-0",
    "[transition:gap_.25s_ease,color_.25s_ease]",
    "group-hover:text-white hover:gap-2.5 hover:text-brand-blue hover:shadow-none",
    "[&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:[transition:transform_.35s_cubic-bezier(.34,1.56,.64,1)]",
    "group-hover:[&_svg]:translate-x-1",
  ].join(" ");

  return (
    <section className="w-full bg-surface-1 pt-20 px-6 pb-24" id="membership">
      <div className="max-w-screen-page mx-auto">
        <h2 className={`text-center text-[38px] font-extrabold text-ink m-0 mb-3 tracking-[-0.015em] max-[900px]:text-3xl max-[540px]:text-[26px] ${REVEAL_UP_CLS}`}>Үйл ажиллагаа &amp; үйлчилгээ</h2>
        <p className={`text-center text-base text-ink-soft max-w-[640px] mx-auto mb-14 leading-[1.65] ${REVEAL_UP_CLS}`}>
          Төв Цэнгэлдэх Хүрээлэнгийн үндсэн чиглэл, иргэдэд хүрэх үйлчилгээ.
        </p>

        <div className="grid gap-6 mx-auto mb-8 grid-cols-3 max-[900px]:grid-cols-2 max-[540px]:grid-cols-1">
          {items.map((m, i) => (
            <article key={m.id} className={memberCardCls} data-stagger={i + 1}>
              {m.badge && <span className={cardBadgeCls} aria-label={m.badge}>{m.badge}</span>}
              <span className={cardIconCls} aria-hidden="true">
                <MemberIcon iconKey={m.iconKey} />
              </span>
              <h3 className="text-lg font-bold text-ink m-0 leading-[1.35] tracking-[-0.01em] group-hover:text-white">{m.title}</h3>
              <p className="text-sm text-ink-soft leading-[1.65] m-0 flex-1 group-hover:text-[rgba(255,255,255,0.85)]">{m.desc}</p>
              <a href={m.href || '#'} className={cardBtnCls}>
                {m.badge === 'Live' ? 'Шууд үзэх' : 'Цааш үзэх'}
                <Arrow/>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function VideoCta() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => setPaused(v.paused);
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    sync();
    return () => {
      v.removeEventListener('play', sync);
      v.removeEventListener('pause', sync);
    };
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  return (
    <section className="w-full bg-white py-8 px-6 max-[900px]:pt-8 max-[900px]:px-5 max-[900px]:pb-14">
      <div className="mx-auto bg-surface-1 rounded-[28px] p-14 max-w-[1880px] max-[900px]:py-9 max-[900px]:px-4 max-[900px]:rounded-[22px]">
        <div className="max-w-screen-page mx-auto grid gap-12 items-center [grid-template-columns:0.82fr_1.18fr] max-[900px]:gap-7 max-[900px]:[grid-template-columns:1fr]">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase text-white bg-brand-blue rounded-full mb-[14px] tracking-[0.16em] py-[5px] px-[11px]">Шууд тоглолт</span>
            <h2 className="text-4xl font-extrabold tracking-[-0.02em] m-0 mb-[18px] leading-[1.15] text-[#1a1a1a] max-[900px]:text-[28px]">«Чамтай бас чамгүй»</h2>
            <p className="text-[15px] leading-[1.7] m-0 mb-6 max-w-[480px] text-[#5b5b5b]">
              Төв Цэнгэлдэх Хүрээлэн дэх амьд тоглолтын онцлох агшнууд. Тайз, гэрэл,
              үзэгчдийн халуун дулаан агаар &mdash; бүгд энд. Тоглолт аль хэдийн эхэлсэн.
            </p>
            <p className="text-[13px] font-bold uppercase text-brand-blue m-0 mb-6 tracking-[0.06em] leading-[1.7] max-w-[480px]">Ариунаа ft. Morningstar</p>
            <a
              href="#"
              className="inline-flex items-center gap-2 !bg-brand-blue !text-white no-underline rounded-full text-sm font-semibold py-[11px] px-[22px] border-0 shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] [transition:filter_.2s_ease,transform_.15s_ease,box-shadow_.2s_ease] hover:!bg-brand-blue-soft hover:brightness-[1.03] hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-[13px] [&_svg]:h-[13px]"
            >
              Дэлгэрэнгүй
              <Arrow/>
            </a>
          </div>
          <div className="relative w-full rounded-3xl overflow-hidden [aspect-ratio:16/9] bg-[#111] shadow-[0_18px_40px_rgba(0,0,0,0.12)] [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:block [&_video]:[filter:blur(3px)] [&_video]:[transform:scale(1.04)]">
            <StoryVideo
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="/assets/images/stadium/exterior.jpg"
              fallbackAriaLabel="Чамтай бас чамгүй — тоглолтын зураг"
            />
            <button
              className={`absolute z-[2] w-12 h-12 rounded-full border-0 cursor-pointer inline-flex items-center justify-center text-white left-4 bottom-4 bg-[rgba(15,23,42,0.55)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] [transition:background_0.18s_ease,transform_0.18s_ease] hover:bg-brand-blue hover:scale-[1.06]${paused ? ' is-paused' : ''}`}
              type="button"
              aria-label="Видео тоглуулах/түр зогсоох"
              onClick={toggle}
            >
              <svg className="w-5 h-5 block [.is-paused_&]:hidden" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1"/>
                <rect x="14" y="5" width="4" height="14" rx="1"/>
              </svg>
              <svg className="w-5 h-5 hidden [.is-paused_&]:block" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Partners({ items = [] }: { items: Partner[] }) {

  const rows: Partner[][] = [];
  for (let i = 0; i < items.length; i += 4) rows.push(items.slice(i, i + 4));
  return (
    <section className="w-full bg-white pt-3 px-6 pb-14" id="partners">
      <div className="max-w-none w-full mx-auto bg-transparent rounded-none text-center py-14 px-12 max-[720px]:py-10 max-[720px]:px-6">
        <h2 className="text-[28px] font-extrabold text-ink tracking-[-0.01em] m-0 mb-3 leading-[1.25] max-[720px]:text-[22px]">Манай хамтрагч байгууллагууд</h2>
        <p className="text-[13.5px] text-[#6b6b6b] max-w-[560px] mx-auto mb-9 leading-[1.6]">
          Төв Цэнгэлдэх Хүрээлэн нь Монголын тэргүүлэх аж ахуйн нэгж, олон улсын
          байгууллагуудтай олон жилийн турш урт хугацаанд хамтран ажиллаж,
          спорт, соёл, олон нийтийн томоохон арга хэмжээг хамтын хүчээр амжилттай
          зохион байгуулсаар ирсэн. Тэдний итгэл, дэмжлэг бидний өсөлт, шинэчлэл,
          иргэддээ хүргэх үйлчилгээний чанарын гол түшиц юм.
        </p>

        {rows.map((row, ri) => (
          <div
            key={ri}
            className={`flex flex-wrap justify-center items-center gap-14 max-[720px]:gap-5${ri > 0 ? ' mt-12' : ''}`}
          >
            {row.map((p) => (
              <a
                key={p.id}
                href="#"
                className="inline-flex items-center justify-center w-[140px] h-[140px] bg-white rounded-[20px] overflow-hidden border border-solid border-[rgba(31,41,55,0.08)] p-[18px] shadow-[0_6px_18px_-10px_rgba(31,41,55,0.18)] [transition:transform_0.25s_ease,box-shadow_0.25s_ease,border-color_0.25s_ease] hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(34,48,198,0.35)] hover:border-[rgba(34,48,198,0.25)] max-[720px]:w-24 max-[720px]:h-24 max-[720px]:rounded-2xl max-[720px]:p-3"
              >
                <img src={p.image} alt={p.alt || 'Партнёр байгууллага'} loading="lazy" className="w-full h-full max-w-full object-contain block"/>
              </a>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function Roadmap({ items = [] }: { items: RoadmapItem[] }) {

  const bot = items.filter((m) => m.position === 'bot');
  const top = items.filter((m) => m.position !== 'bot');
  const posFor = (count: number, i: number): number => {
    if (count <= 1) return 50;
    const span = 92;
    return 4 + (i * span) / (count - 1);
  };
  const phaseBase = "flex-1 flex flex-col justify-center min-h-[56px] py-2 pr-[38px] font-[inherit] max-[640px]:[clip-path:none] max-[640px]:m-0 max-[640px]:rounded max-[640px]:py-2.5 max-[640px]:px-4";
  return (
    <section className="w-full bg-white pt-12 px-6 pb-16" id="events">
      <div className="max-w-screen-page mx-auto">
        <h2 className="text-[32px] font-extrabold tracking-[-0.02em] m-0 mb-7 text-[#1a1a1a]">ТҮҮХЭН ЗАМНАЛ</h2>

        <div className="flex items-stretch gap-0 mb-7 max-[640px]:flex-col max-[640px]:gap-1">
          <div className={`${phaseBase} pl-8 bg-brand-blue-tint text-ink [clip-path:polygon(0_0,calc(100%_-_20px)_0,100%_50%,calc(100%_-_20px)_100%,0_100%)] -mr-2.5`}>
            <strong className="text-[13px] font-extrabold block tracking-[0.02em]">1958-1993</strong>
            <small className="text-[11px] block opacity-85">Үндэсний цэнгэлдэхийн үүсэл</small>
          </div>
          <div className={`${phaseBase} pl-[42px] bg-ink text-brand-blue-tint [clip-path:polygon(0_0,calc(100%_-_20px)_0,100%_50%,calc(100%_-_20px)_100%,0_100%,20px_50%)] -mr-2.5`}>
            <strong className="text-[13px] font-extrabold block tracking-[0.02em]">2007-2019</strong>
            <small className="text-[11px] block opacity-85">Шинэчлэл ба өмчийн өөрчлөлт</small>
          </div>
          <div className={`${phaseBase} pl-[42px] bg-ink text-brand-blue-tint [clip-path:polygon(0_0,calc(100%_-_20px)_0,100%_50%,calc(100%_-_20px)_100%,0_100%,20px_50%)]`}>
            <strong className="text-[13px] font-extrabold block tracking-[0.02em]">2024+</strong>
            <small className="text-[11px] block opacity-85">Дэвшилтэт шинэ бодлого</small>
          </div>
        </div>

        <div className="relative w-full mb-3 h-[320px] max-[900px]:h-[380px] max-[640px]:hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 320" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 30,250 C 100,250 130,250 180,250 S 270,240 300,235 S 400,220 450,200 S 540,175 600,150 S 720,95 800,80 S 950,70 1170,70"
                  stroke="#2230C6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

            <line x1="60"   y1="250" x2="60"   y2="278" stroke="#4D5670" strokeWidth="1"/>
            <line x1="171"  y1="250" x2="171"  y2="278" stroke="#4D5670" strokeWidth="1"/>
            <line x1="282"  y1="238" x2="282"  y2="278" stroke="#4D5670" strokeWidth="1"/>
            <line x1="393"  y1="217" x2="393"  y2="278" stroke="#4D5670" strokeWidth="1"/>
            <line x1="615"  y1="144" x2="615"  y2="278" stroke="#4D5670" strokeWidth="1"/>

            <line x1="504"  y1="182" x2="504"  y2="58" stroke="#4D5670" strokeWidth="1"/>
            <line x1="726"  y1="98"  x2="726"  y2="58" stroke="#4D5670" strokeWidth="1"/>
            <line x1="837"  y1="74"  x2="837"  y2="58" stroke="#4D5670" strokeWidth="1"/>
            <line x1="948"  y1="69"  x2="948"  y2="58" stroke="#4D5670" strokeWidth="1"/>
            <line x1="1059" y1="70"  x2="1059" y2="58" stroke="#4D5670" strokeWidth="1"/>
            <line x1="1170" y1="70"  x2="1170" y2="58" stroke="#4D5670" strokeWidth="1"/>

            <circle cx="60"   cy="250" r="4.5" fill="#A89968"/>
            <circle cx="171"  cy="250" r="4.5" fill="#A89968"/>
            <circle cx="282"  cy="238" r="4.5" fill="#A89968"/>
            <circle cx="393"  cy="217" r="4.5" fill="#A89968"/>
            <circle cx="504"  cy="182" r="4.5" fill="#A89968"/>
            <circle cx="615"  cy="144" r="4.5" fill="#A89968"/>
            <circle cx="726"  cy="98"  r="4.5" fill="#A89968"/>
            <circle cx="837"  cy="74"  r="4.5" fill="#A89968"/>
            <circle cx="948"  cy="69"  r="4.5" fill="#A89968"/>
            <circle cx="1059" cy="70"  r="4.5" fill="#A89968"/>
            <circle cx="1170" cy="70"  r="4.5" fill="#A89968"/>
          </svg>

          {bot.map((m, i) => (
            <div key={m.id} className="absolute text-[11px] leading-[1.4] text-center -translate-x-1/2 w-[120px] text-[#4a4a4a] max-[900px]:w-[110px] max-[900px]:text-[10px] top-[87.5%]" style={{ left: `${posFor(bot.length, i)}%` }}>
              <strong className="block font-bold text-[11.5px] mb-0.5 text-[#1a1a1a]">{m.year}</strong><span>{m.title}</span>
            </div>
          ))}
          {top.map((m, i) => (
            <div key={m.id} className="absolute text-[11px] leading-[1.4] text-center -translate-x-1/2 w-[120px] text-[#4a4a4a] max-[900px]:w-[110px] max-[900px]:text-[10px] bottom-[82%]" style={{ left: `${posFor(top.length, i)}%` }}>
              <strong className="block font-bold text-[11.5px] mb-0.5 text-[#1a1a1a]">{m.year}</strong><span>{m.title}</span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 text-xs mt-2 text-[#6b6b6b]">
          <span className="w-2 h-2 rounded-full bg-ink" aria-hidden="true"></span>
          Түүхэн чухал үйл явдлууд
        </div>
      </div>
    </section>
  );
}

function News({ items = [] }: { items: NewsItem[] }) {
  const featured = items.find((n) => n.featured) || items[0];
  const side = items.filter((n) => n !== featured).slice(0, 3);

  const sectionCls = "w-full bg-white pt-12 px-6 pb-16";
  const innerCls = "max-w-screen-page mx-auto";
  const headerCls = `flex items-center justify-between mb-8 gap-5 ${REVEAL_UP_CLS}`;
  const titleCls = "text-[38px] font-extrabold tracking-[-0.02em] m-0 text-[#1a1a1a] max-[900px]:text-3xl";

  if (!featured) {
    return (
      <section className={sectionCls} id="news">
        <div className={innerCls}>
          <div className={headerCls}>
            <h2 className={titleCls}>Сүүлийн мэдээ</h2>
          </div>
        </div>
      </section>
    );
  }

  const labelBase = "block leading-none text-xs text-brand-blue font-bold uppercase tracking-[.08em]";
  const newsImageBase = "rounded-[10px] grid place-items-center overflow-hidden bg-surface-1 text-[#b8b8b8] group [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:object-center [&_img]:block [&_img]:[transition:transform_.6s_cubic-bezier(.2,.8,.2,1)] [&_img]:group-hover:scale-[1.04]";

  return (
    <section className={sectionCls} id="news">
      <div className={innerCls}>
        <div className={headerCls}>
          <h2 className={titleCls}>Сүүлийн мэдээ</h2>
          <a
            href="#"
            className="inline-flex items-center gap-2.5 rounded-full no-underline text-[13.5px] font-semibold text-white bg-brand-blue border-none py-[11px] px-[22px] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] [transition:background_.15s_ease,transform_.15s_ease,box-shadow_.2s_ease] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-[13px] [&_svg]:h-[13px]"
          >
            Бүх мэдээ үзэх
            <Arrow/>
          </a>
        </div>

        <div className="grid [grid-template-columns:1.05fr_1fr] [grid-template-rows:auto_auto] gap-x-[44px] gap-y-[22px] max-[900px]:[grid-template-columns:1fr] max-[900px]:[grid-template-rows:auto_auto_auto] max-[900px]:gap-7">
          <a
            href="#"
            className={`${newsImageBase} w-full [grid-column:1] [grid-row:1] aspect-[16/9] ${REVEAL_UP_CLS}`}
            data-stagger="1"
            aria-label={featured.title}
          >
            <img src={featured.image} alt={featured.title} />
          </a>

          <div className="grid [grid-column:2] [grid-row:1/3] [grid-template-rows:1fr_1fr_1fr] gap-[22px] max-[900px]:[grid-column:1] max-[900px]:[grid-row:3] max-[900px]:[grid-template-rows:auto_auto_auto] max-[900px]:gap-5">
            {side.map((n, i) => (
              <article
                key={n.id}
                className={`grid gap-5 items-center [grid-template-columns:140px_1fr] max-[540px]:[grid-template-columns:100px_1fr] max-[540px]:gap-[14px] hover:shadow-[0_16px_32px_-16px_rgba(34,48,198,.25)] group ${REVEAL_UP_CLS}`}
                data-stagger={i + 2}
              >
                <a
                  href="#"
                  className={`${newsImageBase} w-[140px] h-full max-h-[140px] max-[540px]:w-[100px] max-[540px]:h-[84px]`}
                  aria-label={n.title}
                >
                  <img src={n.image} alt={n.title} />
                </a>
                <div className="flex flex-col min-w-0">
                  <span className={`${labelBase} mb-2`}>{n.label}</span>
                  <h3 className="text-[14.5px] font-bold m-0 leading-[1.45] text-ink">{n.title}</h3>
                </div>
              </article>
            ))}
          </div>

          <div className={`max-w-[580px] [grid-column:1] [grid-row:2] py-0 px-0.5 ${REVEAL_UP_CLS}`} data-stagger="2">
            <span className={`${labelBase} mb-2.5`}>{featured.label}</span>
            <h3 className="text-xl font-bold m-0 mb-[14px] leading-[1.35] text-ink">{featured.title}</h3>
            {featured.body && <p className="text-sm leading-[1.7] m-0 text-[#6b6b6b]">{featured.body}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
