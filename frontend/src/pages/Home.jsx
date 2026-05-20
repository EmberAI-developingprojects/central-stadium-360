import { useEffect, useRef, useState } from 'react';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import useRevealOnScroll from '../hooks/useRevealOnScroll.js';
import useSmoothAnchors from '../hooks/useSmoothAnchors.js';
import { useGatedNavigate } from '../auth.jsx';

const UPCOMING = [
  { src: '/assets/images/events/Tengri-_Shoppy_(1920x648).png', alt: 'Thunderz — Tengri', date: '05 / 23', year: 2026, pill: 'Концерт' },
  { src: '/assets/images/events/1920x648.png', alt: 'Zunii Zugaa — Homecoming 26', date: '05 / 30', year: 2026, pill: 'Концерт' },
  { src: '/assets/images/events/Ginjin_1920x648.png', alt: 'Б. Сарантуяа — Хайрын Бурхан', date: '06 / 06', year: 2026, pill: 'Live Concert' },
  { src: '/assets/images/events/HEVTEE_BANNER_1.png', alt: 'Super Concert — Phase 3', date: '06 / 20', year: 2026, pill: 'Super Concert' },
];

export default function Home() {
  useRevealOnScroll();
  useSmoothAnchors();
  const gatedGo = useGatedNavigate();

  return (
    <>
      <SiteHeader />
      <Hero gatedGo={gatedGo} />
      <Highlights />
      <Stats />
      <Upcoming gatedGo={gatedGo} />
      <Members />
      <VideoCta />
      <Partners />
      <Roadmap />
      <News />
      <SiteFooter />
    </>
  );
}

function Hero({ gatedGo }) {
  return (
    <section className="hero" id="top">
      <div className="hero-container">
        <div className="hero-content reveal-up">
          <span className="badge">
            <span className="badge-icon" aria-hidden="true"></span>
            Тавтай морилно уу &middot; 1958 оноос
          </span>

          <h1 className="headline">
            Соёлын <span className="headline-accent">зүрх</span><br/>
            Монголын спорт<br/>
            Төв Цэнгэлдэх Хүрээлэн
          </h1>

          <p className="description">
            Улаанбаатарын төвд, дэлхийн жишигт нийцсэн арга хэмжээ, сэтгэл хөдөлгөм
            тоглолт, мартагдашгүй мөчүүд таныг угтаж байна. Та энд ирж, эсвэл
            360° форматаар манай вэбсайтаас шууд үзээрэй.
          </p>

          <div className="cta-row">
            <button className="btn-primary" type="button" onClick={() => gatedGo('/watch')}>
              Тасалбар авах
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button className="btn-secondary" type="button">Дэлгэрэнгүй</button>
          </div>
        </div>

        <main className="layout" aria-label="Four card layout">
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <defs>
              <clipPath id="tile1-shape" clipPathUnits="objectBoundingBox">
                <path d="M 0.1016,0 H 0.7898 C 0.8822,0 0.9677,0.0642 0.9769,0.1415 C 1.0046,0.3566 1.0116,0.5962 0.9700,0.8604 C 0.9584,0.9321 0.8799,0.9981 0.7852,0.9981 H 0.1016 C 0.0462,0.9981 0,0.9604 0,0.9151 V 0.0830 C 0,0.0377 0.0462,0 0.1016,0 Z" />
              </clipPath>
            </defs>
          </svg>
          <section className="tile tile-1"><img src="/assets/images/hero/featured.jpg" alt="Онцлох үйл явдал" loading="eager" /></section>
          <section className="tile tile-2"><img src="/assets/images/hero/stadium-aerial.png" alt="Төв цэнгэлдэх хүрээлэн" loading="lazy" /></section>
          <section className="tile tile-3"><img src="/assets/images/hero/event-tengri.png" alt="THUNDERZ — TENGRI" loading="lazy" /></section>
          <section className="tile tile-4"><img src="/assets/images/hero/live-360.png" alt="Live streaming · 360°" loading="lazy" /></section>
        </main>
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className="highlights" id="about">
      <div className="highlights-inner">
        <h2 className="highlights-title reveal-up">Бидний тухай</h2>

        <div className="highlights-grid">
          <article className="testimonial reveal-up" data-stagger="1">
            <h3 className="testimonial-heading">Монголын спортын зүрх — 1958 оноос хойш</h3>
            <p className="testimonial-body">
              Төв Цэнгэлдэх Хүрээлэн нь 1958 онд байгуулагдсан, Монгол Улсын анхны үндэсний хэмжээний цэнгэлдэх. Олон арван жилийн турш үндэсний шигшээ багуудын чухал тоглолт, олон улсын тэмцээн, томоохон соёлын арга хэмжээний голлох тавцан болж ирсэн. Өнөөдөр бид 12,500 суудалтай, 25,000 хүртэлх үзэгчийг хүлээн авах хүчин чадалтай орчин үеийн цогцолбор болон өргөжиж, иргэддээ дэлхийн жишигт нийцсэн үйлчилгээ хүргэхээр зорьж байна.
            </p>
          </article>

          <div className="highlight-image reveal-up" data-stagger="2">
            <img src="/assets/images/stadium/exterior.jpg" alt="Төв цэнгэлдэх хүрээлэн — гадна талаас" className="img-fill" loading="lazy" />
          </div>

          <div className="highlight-cta reveal-up" data-stagger="3">
            <div
              className="highlight-video"
              role="button"
              aria-label="Видео тоглуулах"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,.55) 100%), url('/assets/images/stadium/huuchin.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <span className="play-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </div>
            <p className="highlight-cta-text">Манай түүх, эрхэм зорилго, ирээдүйн төлөвлөгөөтэй танилцана уу.</p>
            <a href="#" className="highlight-cta-btn">
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
    <section className="stats-block">
      <div className="stats-inner">
        <div className="stats-row">
          {items.map((s, i) => (
            <span key={s.num} style={{ display: 'contents' }}>
              {i > 0 && <span className="stat-divider" aria-hidden="true"></span>}
              <div className="stat reveal-up" data-stagger={i + 1}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Upcoming({ gatedGo }) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const stageRef = useRef(null);
  const intervalMs = 5500;

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let rafId = null;
    let startTs = 0;
    let paused = false;

    const tick = (ts) => {
      if (paused) { rafId = requestAnimationFrame(tick); return; }
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const pct = Math.min(100, (elapsed / intervalMs) * 100);
      setProgress(pct);
      if (elapsed >= intervalMs) {
        setIdx((i) => (i + 1) % UPCOMING.length);
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
  }, []);

  // Reset progress on manual change
  const go = (next) => {
    setIdx((next + UPCOMING.length) % UPCOMING.length);
    setProgress(0);
  };

  return (
    <section className="certs" id="certificates">
      <div className="certs-inner">
        <div className="certs-header reveal-up">
          <div>
            <span className="certs-eyebrow">
              <span className="live-dot" aria-hidden="true"></span>Live · Удахгүй болох
            </span>
            <h2 className="certs-title">Шууд дамжуулал — арга хэмжээ</h2>
          </div>
          <a href="#" className="certs-viewall">
            Бүх арга хэмжээ үзэх
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14"/>
              <path d="M13 6l6 6-6 6"/>
            </svg>
          </a>
        </div>

        <div className="up-stage reveal-up" ref={stageRef}>
          <div className="up-track">
            {UPCOMING.map((u, i) => (
              <article key={u.alt} className={`up-slide${i === idx ? ' is-active' : ''}`} data-up={i}>
                <img src={u.src} alt={u.alt} loading={i === 0 ? 'eager' : 'lazy'} />
                <div className="up-overlay">
                  <div className="up-meta">
                    <span className="up-date"><strong>{u.date}</strong> · {u.year}</span>
                    <span className="up-pill">{u.pill}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="up-actions">
            <button type="button" className="up-btn up-btn-gold" onClick={() => gatedGo('/watch')}>Live үзэх</button>
            <button type="button" className="up-text-cta" onClick={() => gatedGo('/watch')} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>Тасалбар</button>
          </div>

          <button className="up-nav up-prev" onClick={() => go(idx - 1)} aria-label="Өмнөх">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="up-nav up-next" onClick={() => go(idx + 1)} aria-label="Дараах">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <div className="up-progress" aria-hidden="true"><span style={{ width: `${progress}%` }}></span></div>
        </div>

        <ol className="up-thumbs reveal-up" role="tablist" aria-label="Арга хэмжээ сонгох">
          {UPCOMING.map((u, i) => (
            <li key={u.alt}>
              <button onClick={() => go(i)} className={i === idx ? 'is-active' : undefined} aria-label={u.alt}>
                <img src={u.src} alt="" />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Members() {
  return (
    <section className="members" id="membership">
      <div className="members-inner">
        <h2 className="members-title reveal-up">Үйл ажиллагаа &amp; үйлчилгээ</h2>
        <p className="members-subtitle reveal-up">
          Төв Цэнгэлдэх Хүрээлэнгийн үндсэн чиглэл, иргэдэд хүрэх үйлчилгээ.
        </p>

        <div className="members-grid">

          <article className="member-card reveal-up" data-stagger="1">
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </span>
            <h3 className="card-title">Тоглолт, арга хэмжээ, талбайн түрээс</h3>
            <p className="card-desc">«Төв Цэнгэлдэх Хүрээлэн» ХХК нь үндэсний болон олон улсын томоохон арга хэмжээ, тоглолт зохион байгуулах, талбай түрээслүүлэх үйлчилгээг иргэд, байгууллагуудад хүргэдэг.</p>
            <a href="#" className="card-btn">Цааш үзэх<Arrow/></a>
          </article>

          <article className="member-card reveal-up" data-stagger="2">
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="15" y2="17"/>
              </svg>
            </span>
            <h3 className="card-title">Хууль, эрх зүй</h3>
            <p className="card-desc">Иргэн, байгууллагын эрх зүйн асуудал, манай үйл ажиллагаатай холбоотой хууль, дүрэм, журамтай танилцана уу.</p>
            <a href="#" className="card-btn">Цааш үзэх<Arrow/></a>
          </article>

          <article className="member-card reveal-up" data-stagger="3">
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4z"/>
                <line x1="8" y1="9"  x2="16" y2="9"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="13" y2="17"/>
                <path d="M20 8h2v8a2 2 0 0 1-2 2"/>
              </svg>
            </span>
            <h3 className="card-title">Мэдээ, мэдээлэл</h3>
            <p className="card-desc">Манай байгууллагын үйл ажиллагаа, удахгүй болох арга хэмжээ, шинэ мэдээллийг эндээс цаг алдалгүй авах боломжтой.</p>
            <a href="#news" className="card-btn">Цааш үзэх<Arrow/></a>
          </article>

          <article className="member-card reveal-up" data-stagger="4">
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <line x1="8"  y1="10" x2="16" y2="10"/>
                <line x1="8"  y1="14" x2="13" y2="14"/>
              </svg>
            </span>
            <h3 className="card-title">Холбоо барих, санал хүсэлт</h3>
            <p className="card-desc">Та санал, шүүмж, талархал болон ерөнхий чиглэлийн асуултаа бидэнд илгээж, шуурхай хариу авах боломжтой.</p>
            <a href="#contact" className="card-btn">Цааш үзэх<Arrow/></a>
          </article>

          <article className="member-card reveal-up" data-stagger="5">
            <span className="card-badge" aria-label="Шууд дамжуулалт">Live</span>
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="12" rx="10" ry="4"/>
                <path d="M12 8v8"/><path d="M9 10.5L15 13.5"/><path d="M15 10.5L9 13.5"/>
              </svg>
            </span>
            <h3 className="card-title">360° шууд дамжуулалт</h3>
            <p className="card-desc">Цэнгэлдэхэд болж буй тоглолт, тэмцээн, арга хэмжээг 360° форматаар манай вэбсайтаас шууд үзэх боломжтой — танхимд байгаа мэт мэдрэмж.</p>
            <a href="#" className="card-btn">Шууд үзэх<Arrow/></a>
          </article>

          <article className="member-card reveal-up" data-stagger="6">
            <span className="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c0-4 4.5-7 10-7s10 3 10 7-4.5 7-10 7S2 16 2 12z"/>
                <path d="M2 12c0 2 4.5 4 10 4s10-2 10-4"/>
                <path d="M12 5v14"/><path d="M7 6.2v11.6"/><path d="M17 6.2v11.6"/>
              </svg>
            </span>
            <h3 className="card-title">Төв Цэнгэлдэх Хүрээлэн</h3>
            <p className="card-desc">1958 онд байгуулагдсан, 12,500 суудалтай, 25,000 хүртэлх үзэгчийг хүлээн авах хүчин чадалтай Монгол Улсын анхдагч цогцолбор. Спорт, соёл, олон нийтийн арга хэмжээний голлох тавцан.</p>
            <a href="#about" className="card-btn">Цааш үзэх<Arrow/></a>
          </article>

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
  const videoRef = useRef(null);
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
    <section className="video-cta">
      <div className="video-cta-inner">
        <div className="video-cta-content">
          <div className="video-text">
            <span className="cap-eyebrow">Шууд тоглолт</span>
            <h2>«Чамтай бас чамгүй»</h2>
            <p>
              Төв Цэнгэлдэх Хүрээлэн дэх амьд тоглолтын онцлох агшнууд. Тайз, гэрэл,
              үзэгчдийн халуун дулаан агаар &mdash; бүгд энд. Тоглолт аль хэдийн эхэлсэн.
            </p>
            <p className="video-artist">Ариунаа ft. Morningstar</p>
            <a href="#" className="feature-btn">
              Дэлгэрэнгүй
              <Arrow/>
            </a>
          </div>
          <div className="video-wrap">
            <video ref={videoRef} autoPlay loop muted playsInline preload="metadata">
              <source src="/assets/video/our-story.mp4" type="video/mp4" />
            </video>
            <button className={`video-toggle${paused ? ' is-paused' : ''}`} type="button" aria-label="Видео тоглуулах/түр зогсоох" onClick={toggle}>
              <svg className="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1"/>
                <rect x="14" y="5" width="4" height="14" rx="1"/>
              </svg>
              <svg className="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Partners() {
  return (
    <section className="partners" id="partners">
      <div className="partners-inner">
        <h2 className="partners-title">Манай хамтрагч байгууллагууд</h2>
        <p className="partners-subtitle">
          Төв Цэнгэлдэх Хүрээлэн нь Монголын тэргүүлэх аж ахуйн нэгж, олон улсын
          байгууллагуудтай олон жилийн турш урт хугацаанд хамтран ажиллаж,
          спорт, соёл, олон нийтийн томоохон арга хэмжээг хамтын хүчээр амжилттай
          зохион байгуулсаар ирсэн. Тэдний итгэл, дэмжлэг бидний өсөлт, шинэчлэл,
          иргэддээ хүргэх үйлчилгээний чанарын гол түшиц юм.
        </p>

        <div className="partners-logos">
          <a href="#" className="partner-logo"><img src="/assets/images/partners/LogoT.webp" alt="Партнёр байгууллага" loading="lazy"/></a>
          <a href="#" className="partner-logo"><img src="/assets/images/partners/partner-1.png" alt="Партнёр байгууллага" loading="lazy"/></a>
          <a href="#" className="partner-logo"><img src="/assets/images/partners/partner-2.jpeg" alt="Партнёр байгууллага" loading="lazy"/></a>
          <a href="#" className="partner-logo"><img src="/assets/images/partners/partner-3.png" alt="Партнёр байгууллага" loading="lazy"/></a>
        </div>
        <div className="partners-logos">
          <a href="#" className="partner-logo"><img src="/assets/images/partners/partner-4.png" alt="Партнёр байгууллага" loading="lazy"/></a>
          <a href="#" className="partner-logo"><img src="/assets/images/partners/485805154_693233113229983_1842200449251181263_n.jpg" alt="Партнёр байгууллага" loading="lazy"/></a>
          <a href="#" className="partner-logo"><img src="/assets/images/partners/ad0c4ccd-a055-472a-aa21-1dc056def10f.jpg" alt="Партнёр байгууллага" loading="lazy"/></a>
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section className="roadmap" id="events">
      <div className="roadmap-inner">
        <h2 className="roadmap-title">ТҮҮХЭН ЗАМНАЛ</h2>

        <div className="roadmap-phases">
          <div className="phase phase-light phase-1"><strong>1958-1993</strong><small>Үндэсний цэнгэлдэхийн үүсэл</small></div>
          <div className="phase phase-dark phase-2"><strong>2007-2019</strong><small>Шинэчлэл ба өмчийн өөрчлөлт</small></div>
          <div className="phase phase-dark phase-3"><strong>2024+</strong><small>Дэвшилтэт шинэ бодлого</small></div>
        </div>

        <div className="roadmap-chart">
          <svg className="chart-svg" viewBox="0 0 1200 320" preserveAspectRatio="none" aria-hidden="true">
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

          <div className="milestone milestone-bot" style={{ left: '5%' }}><strong>1958</strong><span>БНХАУ-ын тусламжтай байгуулагдсан</span></div>
          <div className="milestone milestone-bot" style={{ left: '14.25%' }}><strong>1961</strong><span>Нийслэлийн өмчид шилжсэн</span></div>
          <div className="milestone milestone-bot" style={{ left: '23.5%' }}><strong>1971</strong><span>Төв асар ашиглалтад · 12,500 суудал</span></div>
          <div className="milestone milestone-bot" style={{ left: '32.75%' }}><strong>1990</strong><span>Ашиг орлогын тогтолцоо бүрдсэн</span></div>
          <div className="milestone milestone-bot" style={{ left: '51.25%' }}><strong>1993</strong><span>Эзэмшлийн маргаан үүссэн</span></div>

          <div className="milestone milestone-top" style={{ left: '42%' }}><strong>2007</strong><span>Үзэгчийн суудал шинэчлэгдсэн</span></div>
          <div className="milestone milestone-top" style={{ left: '60.5%' }}><strong>2014</strong><span>Эзэмшил дахин үнэлэгдсэн · 12.7 га</span></div>
          <div className="milestone milestone-top" style={{ left: '69.75%' }}><strong>2019</strong><span>100% нийслэлийн өмчид шилжсэн</span></div>
          <div className="milestone milestone-top" style={{ left: '79%' }}><strong>2024</strong><span>Шинэ гүйцэтгэх захирал томилогдсон</span></div>
          <div className="milestone milestone-top" style={{ left: '88.25%' }}><strong>2025</strong><span>Дэвшилтэт шинэ бодлого хэрэгжсэн</span></div>
          <div className="milestone milestone-top" style={{ left: '97.5%' }}><strong>2026</strong><span>360° Live вэбсайтын шинэчлэл</span></div>
        </div>

        <div className="roadmap-legend">
          <span className="legend-dot" aria-hidden="true"></span>
          Түүхэн чухал үйл явдлууд
        </div>
      </div>
    </section>
  );
}

function News() {
  return (
    <section className="news" id="news">
      <div className="news-inner">
        <div className="news-header reveal-up">
          <h2 className="news-title">Сүүлийн мэдээ</h2>
          <a href="#" className="news-more">
            Бүх мэдээ үзэх
            <Arrow/>
          </a>
        </div>

        <div className="news-grid">
          <a href="#" className="news-image news-image-lg reveal-up" data-stagger="1" aria-label="ДӨЛ-2026 тэмцээн">
            <img src="/assets/images/news/dol-tournament.jpg" alt="ДӨЛ-2026 тэмцээний нээлт" />
          </a>

          <div className="news-side">
            <article className="news-card reveal-up" data-stagger="2">
              <a href="#" className="news-image news-image-sm" aria-label="2026 оны үйл явдлууд">
                <img src="/assets/images/news/events-2026.jpg" alt="2026 оны үйл явдлуудын товч" />
              </a>
              <div className="news-card-text">
                <span className="news-label">Үйл явдал</span>
                <h3 className="news-card-headline">2026 онд Төв цэнгэлдэхэд болох шилдэг үзвэрүүд</h3>
              </div>
            </article>

            <article className="news-card reveal-up" data-stagger="3">
              <a href="#" className="news-image news-image-sm" aria-label="Дуут дохио бэлтгэл">
                <img src="/assets/images/news/training.jpg" alt="Дуут дохио сургалт" />
              </a>
              <div className="news-card-text">
                <span className="news-label">Сургалт</span>
                <h3 className="news-card-headline">Дуут дохио ба онцгой нөхцлийн бэлэн байдлын сургалт</h3>
              </div>
            </article>

            <article className="news-card reveal-up" data-stagger="4">
              <a href="#" className="news-image news-image-sm" aria-label="Ж.Мөнхбатын хөшөө">
                <img src="/assets/images/news/monument.jpg" alt="Ж.Мөнхбатын хөшөөний нээлт" />
              </a>
              <div className="news-card-text">
                <span className="news-label">Түүх</span>
                <h3 className="news-card-headline">Ардын тамирчин Ж.Мөнхбатын хөшөөг хүндэтгэлтэйгээр залрууллаа</h3>
              </div>
            </article>
          </div>

          <div className="news-body reveal-up" data-stagger="2">
            <span className="news-label">Онцлох</span>
            <h3 className="news-headline">ДӨЛ-2026 тэмцээний нээлтийн ёслол Төв цэнгэлдэхэд боллоо</h3>
            <p className="news-desc">
              Монгол улсын хөдөлмөрчдийн уламжлалт «ДӨЛ» спортын наадам энэ онд дахин Төв цэнгэлдэх
              хүрээлэнгийн дэвжээн дээр өрнөж байна. Нээлтийн ёслолд олон мянган үзэгчид цугларч,
              тамирчид өндөр хөтөлбөртэй жагсаал, дүрсжүүлсэн тоглолтоор хүндэтгэл үзүүлэв.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
