import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useRequireAuth } from '../auth.jsx';
import UserMenu from '../components/UserMenu.jsx';
import StoryVideo from '../components/StoryVideo.jsx';

// ---------- Static data ----------
const FEATURED_EVENT = {
  id: 'thunderz-tengri',
  title: 'Thunderz × Tengri — Гранд тоглолт',
  date: '2026 / 05 / 20 · 21:00 (Шууд)',
  image: '/assets/images/events/Tengri-_Shoppy_(1920x648).png',
  base: 35000,
};

const UPCOMING = [
  { id: 'thunderz-tengri',         title: 'Thunderz — Tengri',          desc: 'Үндэсний рок хамтлагын гранд тоглолт.',                date: '05 / 23 · 2026', when: '2026 / 05 / 23 · 21:00', pill: 'Концерт',       image: '/assets/images/events/Tengri-_Shoppy_(1920x648).png', base: 35000 },
  { id: 'zunii-zugaa-26',          title: 'Zunii Zugaa — Homecoming 26', desc: 'Зуны эхэн үеийн уламжлалт нээлтийн тоглолт.',          date: '05 / 30 · 2026', when: '2026 / 05 / 30 · 20:00', pill: 'Концерт',       image: '/assets/images/events/1920x648.png',                 base: 25000 },
  { id: 'sarantuya-khairyn-burkhan', title: 'Б. Сарантуяа — Хайрын Бурхан', desc: 'Дуучин Б.Сарантуяагийн соло тоглолт.',              date: '06 / 06 · 2026', when: '2026 / 06 / 06 · 20:30', pill: 'Live Concert',  image: '/assets/images/events/Ginjin_1920x648.png',           base: 45000 },
  { id: 'super-concert-phase-3',   title: 'Super Concert — Phase 3',      desc: 'Олон шилдэг уран бүтээлчийн нэгдсэн тоглолт.',         date: '06 / 20 · 2026', when: '2026 / 06 / 20 · 19:30', pill: 'Super Concert', image: '/assets/images/events/HEVTEE_BANNER_1.png',           base: 55000 },
];

const CAMS = {
  stage: { label: 'Тайз',      sub: 'Cam 01 · 4K HDR' },
  crowd: { label: 'Үзэгчид',   sub: 'Cam 02 · 1080p' },
  drone: { label: 'Панорама',  sub: 'Cam 03 · 4K' },
  band:  { label: 'Хөгжимчид', sub: 'Cam 04 · 1080p' },
};

const TICKET_TIERS = [
  { value: 'standard', name: 'Стандарт',   desc: 'HD 1080p шууд дамжуулал · нэг төхөөрөмж',         mult: 1 },
  { value: 'vip',      name: 'VIP 360°',   desc: '4K · 360° форматаар · хоёр төхөөрөмж зэрэг үзэх',  mult: 2 },
  { value: 'platinum', name: 'Платинум',   desc: '4K · 360° · олон өнцөг · 30 хоног дахин үзэх',     mult: 3 },
];

const PAY_METHODS = [
  { value: 'qpay',      name: 'QPay',      desc: 'Банкны апп-аар' },
  { value: 'socialpay', name: 'SocialPay', desc: 'Хаан банкны хэтэвч' },
  { value: 'card',      name: 'Карт',      desc: 'Visa · Mastercard' },
];

const TICKETS_KEY = 'tsengeldekh_tickets';

const BOTS = [
  { name: 'Болормаа',   color: '#F87171' },
  { name: 'Нямсүрэн',   color: '#34D399' },
  { name: 'Цэцэгмаа',   color: '#FBBF24' },
  { name: 'Энхбаяр',    color: '#60A5FA' },
  { name: 'Дөлгөөн',    color: '#C084FC' },
  { name: 'Алтанзул',   color: '#F472B6' },
  { name: 'Баяржаргал', color: '#22D3EE' },
];

const CHAT_SAMPLES = [
  'Хөөх ямар үзэсгэлэнтэй юм бэ 🔥',
  '360° формат супер!',
  'Тайзны цахилгаан тоног төхөөрөмж дэвшилттэй болсон',
  'Хөгжмийн зохиолын чанар маш сайн байна',
  'Дроне cam-ийн өнцөг үнэхээр гоё',
  'Алгаа ташсаар ❤️',
  'Энэ дууг хүлээж байсан',
  'Гар утаснаасаа үзэж байна, чанар нь хүчтэй',
  'Тайзны гэрэлтүүлэг шилдэг',
  'Live chat-д хүн их байна 👏',
  '4K чанартай үзэхэд талбай дээр байгаа мэт',
];

// ---------- Helpers ----------
const money = (n) => n.toLocaleString('en-US') + '₮';

function readTickets() {
  try { return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]'); }
  catch { return []; }
}
function writeTickets(all) {
  try { localStorage.setItem(TICKETS_KEY, JSON.stringify(all)); } catch {}
}

// ---------- Top-level page ----------
export default function Watch() {
  const session = useRequireAuth();
  const location = useLocation();

  const initialTab = ['live', 'upcoming', 'tickets'].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : 'live';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tickets, setTickets] = useState(() => readTickets());
  const [modalEvent, setModalEvent] = useState(null);     // event object when modal open
  const [viewerOpen, setViewerOpen] = useState(false);

  const myTickets = useMemo(
    () => tickets.filter((t) => !t.user || (session && t.user === session.identifier)),
    [tickets, session]
  );

  const ownsFeatured = useMemo(
    () => myTickets.some((t) => t.eventId === FEATURED_EVENT.id),
    [myTickets]
  );

  const refreshTickets = useCallback(() => setTickets(readTickets()), []);

  const openTicketModal = useCallback((event) => setModalEvent(event), []);
  const closeTicketModal = useCallback(() => setModalEvent(null), []);

  const openViewer = useCallback(() => setViewerOpen(true), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  // Scroll to a section + activate tab
  const goSection = useCallback((id) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Lock body scroll while modal/viewer is open
  useEffect(() => {
    const open = viewerOpen || !!modalEvent;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewerOpen, modalEvent]);

  // Scroll to the section named in the URL hash (e.g. /watch#tickets).
  // Wait a tick so the section has mounted and ticket cards have rendered.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveTab(id);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [location.hash]);

  if (!session) return null; // useRequireAuth will navigate

  return (
    <div className="watch-page">
      <header className="watch-header">
        <Link className="watch-logo" to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img src="/assets/images/brand/logo-white.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>

        <nav className="watch-tabs" aria-label="Үзэх төрөл">
          <a className={`watch-tab${activeTab === 'live' ? ' is-active' : ''}`} href="#live" onClick={(e) => { e.preventDefault(); goSection('live'); }}>Шууд</a>
          <a className={`watch-tab${activeTab === 'upcoming' ? ' is-active' : ''}`} href="#upcoming" onClick={(e) => { e.preventDefault(); goSection('upcoming'); }}>Удахгүй</a>
          <a className={`watch-tab${activeTab === 'tickets' ? ' is-active' : ''}`} href="#tickets" onClick={(e) => { e.preventDefault(); goSection('tickets'); }}>
            Тасалбар
            <span className="watch-tab-count" hidden={myTickets.length === 0}>{myTickets.length}</span>
          </a>
        </nav>

        <div className="watch-user">
          <UserMenu />
        </div>
      </header>

      <main className="watch-main">
        <LiveSection
          ownsFeatured={ownsFeatured}
          onWatch={() => ownsFeatured ? openViewer() : openTicketModal(FEATURED_EVENT)}
          viewerOpen={viewerOpen}
        />

        <UpcomingSection events={UPCOMING} onBuy={openTicketModal} />

        <TicketsSection
          tickets={myTickets}
          onCancel={(code) => {
            if (!confirm('Энэ тасалбарыг цуцлах уу?')) return;
            const all = readTickets().filter((t) => t.code !== code);
            writeTickets(all);
            refreshTickets();
          }}
          onWatch={openViewer}
        />
      </main>

      {viewerOpen && (
        <ViewerOverlay session={session} onClose={closeViewer} />
      )}

      {modalEvent && (
        <TicketModal
          event={modalEvent}
          session={session}
          onClose={closeTicketModal}
          onPurchased={(order) => {
            const all = readTickets();
            all.push(order);
            writeTickets(all);
            refreshTickets();
          }}
          onWatchSuccess={() => {
            closeTicketModal();
            // Smooth-scroll to tickets section after the modal animation
            setTimeout(() => goSection('tickets'), 250);
          }}
        />
      )}
    </div>
  );
}

// ---------- Live section ----------
function LiveSection({ ownsFeatured, onWatch, viewerOpen }) {
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

  // Pause the inline player while the multi-cam overlay is open
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (viewerOpen) v.pause();
    else v.play().catch(() => {});
  }, [viewerOpen]);

  // Drifting viewer count
  const [viewers, setViewers] = useState(12480);
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((n) => {
        const next = n + Math.round((Math.random() - 0.45) * 18);
        return next < 9000 ? 9000 : next;
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  return (
    <section className="watch-section" id="live">
      <div className="watch-section-head">
        <span className="watch-eyebrow">
          <span className="watch-live-dot" aria-hidden="true"></span>
          Шууд дамжуулал
        </span>
        <h1 className="watch-title">Одоо явагдаж буй</h1>
      </div>

      <article className="watch-feature">
        <div className={`watch-player${ownsFeatured ? '' : ' is-locked'}`}>
          <StoryVideo
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={FEATURED_EVENT.image}
            fallbackAriaLabel={FEATURED_EVENT.title}
          />
          <div className="watch-locked" hidden={ownsFeatured}>
            <div className="watch-locked-inner">
              <span className="watch-locked-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <strong>Энэ эфир төлбөртэй</strong>
              <span>«Шууд үзэх» товч дээр дарж тасалбараа авна уу.</span>
            </div>
          </div>
          <div className="watch-player-overlay">
            <span className="watch-live-pill">
              <span className="watch-live-pulse" aria-hidden="true"></span>
              LIVE · 360°
            </span>
            <div className="watch-player-meta">
              <span>{viewers.toLocaleString('en-US')}</span> үзэгчид
            </div>
          </div>
          <button type="button" className={`watch-play${paused ? ' is-paused' : ''}`} onClick={toggle} aria-label="Тоглуулах/Зогсоох">
            <svg className="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1"/>
              <rect x="14" y="5" width="4" height="14" rx="1"/>
            </svg>
            <svg className="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>

        <div className="watch-feature-text">
          <span className="watch-badge">Шууд · 360°</span>
          <h2 className="watch-feature-title">{FEATURED_EVENT.title}</h2>
          <p className="watch-feature-desc">
            Гэрээсээ, ажлын газраасаа, эсвэл аяллын дунд — хаанаас ч энэ тоглолтыг
            шууд үзээрэй. Төв Цэнгэлдэх Хүрээлэнгээс зөвхөн вэбсайтаар цацагдах 360°
            гранд эфир. Концертын танхимд биш, дэлгэцэн дээрээ суух мэдрэмж.
          </p>
          <ul className="watch-meta-list">
            <li>📅 2026 / 05 / 20 · 21:00 (UTC+8)</li>
            <li>📡 Шууд дамжуулж байна · ямар ч төхөөрөмжөөс үзнэ</li>
            <li>🎥 360° олон өнцөг · 4K HDR</li>
          </ul>
          <div className="watch-feature-actions">
            <button type="button" className="watch-btn watch-btn-primary" onClick={onWatch}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              Шууд үзэх
            </button>
            <button type="button" className="watch-btn watch-btn-ghost">Чанар: 4K</button>
          </div>
        </div>
      </article>
    </section>
  );
}

// ---------- Upcoming section ----------
function UpcomingSection({ events, onBuy }) {
  return (
    <section className="watch-section" id="upcoming">
      <div className="watch-section-head">
        <span className="watch-eyebrow">Удахгүй</span>
        <h2 className="watch-title">Удахгүй болох арга хэмжээ</h2>
      </div>

      <div className="watch-grid">
        {events.map((ev) => (
          <article key={ev.id} className="watch-card">
            <div className="watch-card-img">
              <img src={ev.image} alt={ev.title} />
              <span className="watch-card-pill">{ev.pill}</span>
            </div>
            <div className="watch-card-body">
              <span className="watch-card-date">{ev.date}</span>
              <h3 className="watch-card-title">{ev.title}</h3>
              <p className="watch-card-desc">{ev.desc}</p>
              <div className="watch-card-actions">
                <button
                  type="button"
                  className="watch-btn watch-btn-primary watch-buy"
                  onClick={() => onBuy({ id: ev.id, title: ev.title, date: ev.when, image: ev.image, base: ev.base })}
                >
                  Тасалбар авах
                </button>
                <span className="watch-card-price">{ev.base.toLocaleString('en-US')}₮-аас</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------- Tickets section ----------
function TicketsSection({ tickets, onCancel, onWatch }) {
  const sorted = useMemo(
    () => [...tickets].sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || '')),
    [tickets]
  );

  return (
    <section className="watch-section" id="tickets">
      <div className="watch-section-head">
        <span className="watch-eyebrow">Хувийн булан</span>
        <h2 className="watch-title">Миний тасалбарууд</h2>
      </div>
      <div className="tickets-list">
        {sorted.length === 0 ? (
          <div className="tickets-empty">
            <div className="tickets-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                <line x1="13" y1="5" x2="13" y2="7"/>
                <line x1="13" y1="11" x2="13" y2="13"/>
                <line x1="13" y1="17" x2="13" y2="19"/>
              </svg>
            </div>
            <h3>Танд одоогоор тасалбар алга</h3>
            <p>«Удахгүй болох арга хэмжээ» хэсгээс тасалбар авч, эндээ хадгална уу.</p>
            <a className="watch-btn watch-btn-primary" href="#upcoming">Арга хэмжээ үзэх</a>
          </div>
        ) : (
          sorted.map((t) => (
            <article key={t.code} className="ticket-stub" data-code={t.code}>
              <div className="ticket-stub-cover">
                <img src={t.image} alt={t.title} />
                <span className="ticket-stub-tier">{t.tierName}</span>
              </div>
              <div className="ticket-stub-body">
                <span className="ticket-stub-date">{t.date}</span>
                <h3 className="ticket-stub-title">{t.title}</h3>
                <dl className="ticket-stub-meta">
                  <div><dt>Захиалгын код</dt><dd className="ticket-stub-code">{t.code}</dd></div>
                  <div><dt>Үзэх эрх</dt><dd>{t.qty} төхөөрөмж</dd></div>
                  <div><dt>Нийт төлбөр</dt><dd>{money(t.total)}</dd></div>
                  <div><dt>Төлбөрийн хэрэгсэл</dt><dd>{t.paymentName || t.payment}</dd></div>
                </dl>
                <div className="ticket-stub-barcode" aria-hidden="true"></div>
                <div className="ticket-stub-actions">
                  <button type="button" className="watch-btn watch-btn-ghost ticket-stub-remove" onClick={() => onCancel(t.code)}>Цуцлах</button>
                  <Link to={`/orders/${t.code}`} className="watch-btn watch-btn-ghost">
                    Дэлгэрэнгүй
                  </Link>
                  <button type="button" className="watch-btn watch-btn-primary ticket-stub-watch" onClick={onWatch}>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                    Шууд үзэх
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

// ---------- Multi-cam viewer overlay ----------
function ViewerOverlay({ session, onClose }) {
  const mainRef = useRef(null);
  const stageRef = useRef(null);
  const chatListRef = useRef(null);
  const reactFloatRef = useRef(null);

  const [angle, setAngle] = useState('stage');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [elapsedSec, setElapsedSec] = useState(42 * 60 + 18);
  const [viewerCount, setViewerCount] = useState(12480);
  const [quality, setQuality] = useState('1080');
  const [cc, setCc] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [idle, setIdle] = useState(false);
  const [chat, setChat] = useState([]); // { name, color, text, mine }

  // ESC key to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleStageFs(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  // Sync main video play/pause + mute state
  useEffect(() => {
    const v = mainRef.current;
    if (!v) return;
    v.volume = volume / 100;
    v.muted = muted;
    const syncPlay = () => setPaused(v.paused);
    v.addEventListener('play', syncPlay);
    v.addEventListener('pause', syncPlay);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener('play', syncPlay);
      v.removeEventListener('pause', syncPlay);
    };
  }, []);

  useEffect(() => {
    const v = mainRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume / 100;
  }, [muted, volume]);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Viewer count drift
  useEffect(() => {
    const id = setInterval(() => {
      setViewerCount((n) => {
        const next = n + Math.round((Math.random() - 0.4) * 22);
        return next < 9000 ? 9000 : next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // Fullscreen change sync
  useEffect(() => {
    const onFs = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFs(fsEl === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  // Auto-hide controls when idle in fullscreen
  useEffect(() => {
    if (!isFs) { setIdle(false); return; }
    let t = null;
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = () => {
      setIdle(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => setIdle(true), 2500);
    };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', () => setIdle(false));
    onMove();
    return () => {
      if (t) clearTimeout(t);
      stage.removeEventListener('mousemove', onMove);
    };
  }, [isFs]);

  // Seed chat + drip
  useEffect(() => {
    const seed = Array.from({ length: 6 }, () => randomBotMessage());
    setChat(seed);
    const id = setInterval(() => {
      setChat((prev) => {
        const next = prev.length > 80 ? prev.slice(1) : prev.slice();
        next.push(randomBotMessage());
        return next;
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat]);

  const togglePlay = () => {
    const v = mainRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (!next && volume === 0) setVolume(60);
      return next;
    });
  };

  const onVolume = (e) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    setMuted(v === 0);
  };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (mainRef.current?.requestPictureInPicture) {
        await mainRef.current.requestPictureInPicture();
      }
    } catch {}
  };

  const toggleStageFs = useCallback(() => {
    const t = stageRef.current;
    if (!t) return;
    const inFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!inFs) {
      (t.requestFullscreen || t.webkitRequestFullscreen).call(t);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }, []);

  const emitReact = (emoji) => {
    const float = reactFloatRef.current;
    if (!float) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'viewer-react-bubble';
        el.textContent = emoji;
        el.style.left = (15 + Math.random() * 70) + '%';
        el.style.animationDuration = (1.6 + Math.random() * 0.8) + 's';
        float.appendChild(el);
        setTimeout(() => el.remove(), 2500);
      }, i * 80);
    }
  };

  const [chatInput, setChatInput] = useState('');
  const onChatSubmit = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const name = (session && (session.fullname || session.identifier)) || 'Та';
    setChat((prev) => [...prev, { name, color: 'var(--brand-blue-soft)', text, mine: true }]);
    setChatInput('');
  };

  const meta = CAMS[angle] || CAMS.stage;
  const qLabel = quality === 'auto' ? 'Auto' : (quality === '2160' ? '4K · 2160p' : quality + 'p');
  const subLabel = meta.sub.replace(/·\s*[^·]+$/, `· ${qLabel}`);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Шууд дамжуулал">
      <header className="viewer-header">
        <button type="button" className="viewer-close" aria-label="Хаах" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="viewer-title-wrap">
          <h3 className="viewer-title">{FEATURED_EVENT.title}</h3>
          <span className="viewer-live-pill">
            <span className="viewer-live-pulse" aria-hidden="true"></span>
            LIVE · <span>{fmtElapsed(elapsedSec)}</span>
          </span>
        </div>
        <div className="viewer-stats">
          <span className="viewer-stat" title="Үзэгчид">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{viewerCount.toLocaleString('en-US')}</span>
          </span>
          <button type="button" className="viewer-icon-btn" onClick={togglePip} aria-label="Жижиг цонх (PiP)" title="Жижиг цонх">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <rect x="13" y="11" width="6" height="5" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button type="button" className="viewer-icon-btn" onClick={toggleStageFs} aria-label="Бүтэн дэлгэц" title="Бүтэн дэлгэц">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="viewer-body">
        <aside className="viewer-angles" aria-label="Камерын өнцөг">
          {['crowd', 'drone', 'band'].map((k) => (
            <button key={k} type="button" className={`viewer-angle${angle === k ? ' is-active' : ''}`} onClick={() => setAngle(k)}>
              <span className="viewer-angle-thumb" data-vfx={k}>
                <StoryVideo
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  poster={FEATURED_EVENT.image}
                  fallbackAriaLabel={CAMS[k].label}
                />
                <span className="viewer-angle-live"></span>
              </span>
              <span className="viewer-angle-label">
                <strong>{CAMS[k].label}</strong>
                <small>{CAMS[k].sub.split(' · ')[0]}{CAMS[k].sub.includes(' · 4K') ? ' · 4K' : ''}</small>
              </span>
            </button>
          ))}
        </aside>

        <section className={`viewer-stage${isFs ? ' is-fs' : ''}${idle ? ' is-idle' : ''}`} ref={stageRef}>
          <div className="viewer-stage-shell" data-vfx={angle}>
            <StoryVideo
              ref={mainRef}
              autoPlay
              loop
              playsInline
              preload="metadata"
              poster={FEATURED_EVENT.image}
              onDoubleClick={toggleStageFs}
              fallbackAriaLabel={FEATURED_EVENT.title}
            />
          </div>
          <span className="viewer-main-cam">
            <strong>{meta.label}</strong> · <span>{subLabel}</span>
          </span>

          <div className="viewer-react-float" ref={reactFloatRef} aria-hidden="true"></div>

          <div className="viewer-controls">
            <div className="viewer-controls-left">
              <button type="button" className={`viewer-icon-btn${paused ? ' is-paused' : ''}`} onClick={togglePlay} aria-label="Тоглуулах/Зогсоох">
                <svg className="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>
                </svg>
                <svg className="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <button type="button" className={`viewer-icon-btn${muted || volume === 0 ? ' is-muted' : ''}`} onClick={toggleMute} aria-label="Дуу/Дуугүй">
                <svg className="icon-vol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <svg className="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              </button>
              <input type="range" min="0" max="100" value={volume} onChange={onVolume} aria-label="Дуу" />
            </div>

            <div className="viewer-reactions" role="group" aria-label="Реакц">
              {['❤️', '🔥', '👏', '🎉'].map((emoji) => (
                <button key={emoji} type="button" className="viewer-react" aria-label="Реакц" onClick={() => emitReact(emoji)}>{emoji}</button>
              ))}
            </div>

            <div className="viewer-controls-right">
              <label className="viewer-quality">
                <span>Чанар</span>
                <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value="2160">4K · 2160p</option>
                  <option value="1080">1080p</option>
                  <option value="720">720p</option>
                  <option value="480">480p</option>
                </select>
              </label>
              <button type="button" className={`viewer-icon-btn${cc ? ' is-on' : ''}`} onClick={() => setCc((c) => !c)} aria-label="Хадмал орчуулга" title="Хадмал">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <path d="M7 13a2 2 0 1 0 0-2"/><path d="M14 13a2 2 0 1 0 0-2"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <aside className="viewer-chat" aria-label="Шууд чат">
          <header className="viewer-chat-head">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Шууд чат
            <span className="viewer-chat-count">{chat.length}</span>
          </header>
          <div className="viewer-chat-list" ref={chatListRef} aria-live="polite">
            {chat.map((m, i) => (
              <div key={i} className={`viewer-msg${m.mine ? ' is-mine' : ''}`}>
                <span className="viewer-msg-name" style={{ color: m.color }}>{m.name}</span>
                <span className="viewer-msg-text">{m.text}</span>
              </div>
            ))}
          </div>
          <form className="viewer-chat-form" onSubmit={onChatSubmit} autoComplete="off">
            <input
              type="text"
              placeholder="Мессеж бичих…"
              maxLength={140}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="viewer-chat-send" aria-label="Илгээх">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function fmtElapsed(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function randomBotMessage() {
  const b = BOTS[Math.floor(Math.random() * BOTS.length)];
  const t = CHAT_SAMPLES[Math.floor(Math.random() * CHAT_SAMPLES.length)];
  return { name: b.name, color: b.color, text: t, mine: false };
}

// ---------- Ticket purchase modal ----------
function TicketModal({ event, session, onClose, onPurchased, onWatchSuccess }) {
  const [tier, setTier] = useState('standard');
  const [pay, setPay] = useState('qpay');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState('');
  const [checkoutLabel, setCheckoutLabel] = useState('Худалдан авах');
  const [success, setSuccess] = useState(null); // order object on success

  const selectedTier = TICKET_TIERS.find((t) => t.value === tier);
  const selectedPay = PAY_METHODS.find((p) => p.value === pay);

  const total = event.base * (selectedTier?.mult || 1) * qty;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const checkout = () => {
    setAlert('');
    setBusy(true);
    setCheckoutLabel(
      pay === 'qpay' || pay === 'socialpay'
        ? `${selectedPay.name} рүү шилжиж байна…`
        : 'Картаар төлж байна…'
    );

    setTimeout(() => {
      // Simulate a 5% failure rate so the error path is reachable
      if (Math.random() < 0.05) {
        setBusy(false);
        setCheckoutLabel('Дахин оролдох');
        setAlert('Төлбөр амжилтгүй боллоо. Дахин оролдоно уу.');
        return;
      }
      const order = {
        code: 'TS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        user: (session && session.identifier) || '',
        eventId: event.id,
        title: event.title,
        date: event.date,
        image: event.image,
        tier,
        tierName: selectedTier.name,
        qty,
        unitPrice: event.base * selectedTier.mult,
        total,
        payment: pay,
        paymentName: selectedPay.name,
        purchasedAt: new Date().toISOString(),
      };
      onPurchased(order);
      setSuccess(order);
    }, 1100);
  };

  const onBackdrop = (e) => {
    if (e.target.dataset.close !== undefined || e.target.closest('[data-close]')) onClose();
  };

  return (
    <div className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticketModalTitle" onClick={onBackdrop}>
      <div className="ticket-modal-backdrop" data-close=""></div>
      <div className="ticket-modal-card" role="document" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ticket-modal-close" aria-label="Хаах" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {!success ? (
          <div className="ticket-modal-body">
            <div className="ticket-modal-cover">
              <img src={event.image} alt={event.title} />
              <div className="ticket-modal-cover-meta">
                <span className="ticket-modal-date">{event.date}</span>
                <h2 id="ticketModalTitle" className="ticket-modal-title">{event.title}</h2>
                <span className="ticket-modal-venue">📡 Онлайн шууд дамжуулал · энэ вэбсайтаас үзнэ</span>
              </div>
            </div>

            <div className="ticket-modal-form">
              <div className="ticket-section">
                <span className="ticket-section-label">Үзэх багц</span>
                <div className="ticket-tiers" role="radiogroup">
                  {TICKET_TIERS.map((t) => (
                    <label key={t.value} className="ticket-tier">
                      <input type="radio" name="tier" value={t.value} checked={tier === t.value} onChange={() => setTier(t.value)} />
                      <span className="ticket-tier-card">
                        <span className="ticket-tier-name">{t.name}</span>
                        <span className="ticket-tier-desc">{t.desc}</span>
                        <span className="ticket-tier-price">{money(event.base * t.mult)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="ticket-section ticket-row">
                <div>
                  <span className="ticket-section-label">Үзэх эрхийн тоо</span>
                  <div className="ticket-qty">
                    <button type="button" className="ticket-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Хасах">−</button>
                    <span className="ticket-qty-val">{qty}</span>
                    <button type="button" className="ticket-qty-btn" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Нэмэх">+</button>
                  </div>
                </div>
                <div className="ticket-total-wrap">
                  <span className="ticket-section-label">Нийт төлөх</span>
                  <span className="ticket-total">{money(total)}</span>
                </div>
              </div>

              <div className="ticket-section">
                <span className="ticket-section-label">Төлбөрийн хэрэгсэл</span>
                <div className="ticket-pays" role="radiogroup">
                  {PAY_METHODS.map((p) => (
                    <label key={p.value} className="ticket-pay">
                      <input type="radio" name="pay" value={p.value} checked={pay === p.value} onChange={() => setPay(p.value)} />
                      <span className="ticket-pay-card">
                        <span className="ticket-pay-name">{p.name}</span>
                        <span className="ticket-pay-desc">{p.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="ticket-alert" hidden={!alert}>{alert}</div>

              <button type="button" className="watch-btn watch-btn-primary ticket-checkout" onClick={checkout} disabled={busy}>
                <span className="ticket-checkout-label">{checkoutLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <p className="ticket-fineprint">
                Төлбөр амжилттай болсны дараа таны бүртгэлд үзэх эрх нэмэгдэж, «Миний тасалбарууд»
                хэсгээс эфирийн цагт шууд үзэх боломжтой болно. Физик тасалбар өгөхгүй.
              </p>
            </div>
          </div>
        ) : (
          <div className="ticket-modal-success">
            <div className="ticket-success-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="ticket-success-title">Худалдан авалт амжилттай!</h3>
            <p className="ticket-success-desc">
              <strong>{success.title}</strong><br/>
              {success.tierName} · {success.qty} төхөөрөмж · {money(success.total)}<br/>
              <small>Эфирийн цагт «Миний тасалбарууд» эсвэл «Шууд» хэсгээс үзэх боломжтой.</small>
            </p>
            <div className="ticket-success-code">
              Захиалгын код<br/>
              <strong>{success.code}</strong>
            </div>
            <div className="ticket-success-actions">
              <button type="button" className="watch-btn watch-btn-ghost" onClick={onClose}>Хаах</button>
              <button type="button" className="watch-btn watch-btn-primary" onClick={onWatchSuccess}>Миний тасалбарууд</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
