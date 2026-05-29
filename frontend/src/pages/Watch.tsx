import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRequireAuth } from '../auth';
import type { Session } from '../auth';
import UserMenu from '../components/UserMenu';
import StoryVideo from '../components/StoryVideo';
import { cancelOrder, createOrder, listEvents, listOrders } from '../data/store';
import type { EventRecord, OrderRecord } from '../data/store';
import {
  VIEWER_ANGLE_ACTIVE_CLS,
  VIEWER_ANGLE_CLS,
  VIEWER_ANGLE_LABEL_CLS,
  VIEWER_ANGLE_LIVE_CLS,
  VIEWER_ANGLE_THUMB_CLS,
  VIEWER_ANGLES_CLS,
  VIEWER_BODY_CLS,
  VIEWER_CHAT_CLS,
  VIEWER_CHAT_COUNT_CLS,
  VIEWER_CHAT_FORM_CLS,
  VIEWER_CHAT_HEAD_CLS,
  VIEWER_CHAT_LIST_CLS,
  VIEWER_CHAT_SEND_CLS,
  VIEWER_CLOSE_CLS,
  VIEWER_CLS,
  VIEWER_CONTROLS_CLS,
  VIEWER_CONTROLS_LEFT_CLS,
  VIEWER_CONTROLS_RIGHT_CLS,
  VIEWER_HEADER_CLS,
  VIEWER_ICON_BTN_CLS,
  VIEWER_ICON_BTN_ON_CLS,
  VIEWER_LIVE_PILL_CLS,
  VIEWER_LIVE_PULSE_CLS,
  VIEWER_MAIN_CAM_CLS,
  VIEWER_MSG_CLS,
  VIEWER_MSG_MINE_CLS,
  VIEWER_MSG_NAME_CLS,
  VIEWER_QUALITY_CLS,
  VIEWER_REACT_CLS,
  VIEWER_REACT_FLOAT_CLS,
  VIEWER_REACTIONS_CLS,
  VIEWER_STAGE_CLS,
  VIEWER_STAGE_SHELL_CLS,
  VIEWER_STAT_CLS,
  VIEWER_STATS_CLS,
  VIEWER_TITLE_CLS,
  VIEWER_TITLE_WRAP_CLS,
  VIEWER_VOL_CLS,
  VFX_VIDEO_CLS,
  TICKET_ALERT_CLS,
  TICKET_CHECKOUT_CLS,
  TICKET_FINEPRINT_CLS,
  TICKET_MODAL_BACKDROP_CLS,
  TICKET_MODAL_BODY_CLS,
  TICKET_MODAL_CARD_CLS,
  TICKET_MODAL_CLOSE_CLS,
  TICKET_MODAL_CLS,
  TICKET_MODAL_COVER_CLS,
  TICKET_MODAL_COVER_META_CLS,
  TICKET_MODAL_DATE_CLS,
  TICKET_MODAL_FORM_CLS,
  TICKET_MODAL_SUCCESS_CLS,
  TICKET_MODAL_TITLE_CLS,
  TICKET_MODAL_VENUE_CLS,
  TICKET_PAY_DESC_CLS,
  TICKET_PAY_NAME_CLS,
  TICKET_QTY_BTN_CLS,
  TICKET_QTY_CLS,
  TICKET_QTY_VAL_CLS,
  TICKET_RADIO_CARD_CLS,
  TICKET_RADIO_GROUP_CLS,
  TICKET_RADIO_INPUT_CLS,
  TICKET_RADIO_LABEL_CLS,
  TICKET_ROW_CLS,
  TICKET_SECTION_CLS,
  TICKET_SECTION_LABEL_CLS,
  TICKET_STUB_ACTIONS_CLS,
  TICKET_STUB_BARCODE_CLS,
  TICKET_STUB_BODY_CLS,
  TICKET_STUB_BTN_CLS,
  TICKET_STUB_CLS,
  TICKET_STUB_CODE_CLS,
  TICKET_STUB_COVER_CLS,
  TICKET_STUB_DATE_CLS,
  TICKET_STUB_META_CLS,
  TICKET_STUB_META_DD_CLS,
  TICKET_STUB_META_DT_CLS,
  TICKET_STUB_REMOVE_HOVER_CLS,
  TICKET_STUB_TIER_CLS,
  TICKET_STUB_TITLE_CLS,
  TICKET_SUCCESS_ACTIONS_CLS,
  TICKET_SUCCESS_CODE_CLS,
  TICKET_SUCCESS_DESC_CLS,
  TICKET_SUCCESS_ICON_CLS,
  TICKET_SUCCESS_TITLE_CLS,
  TICKET_TIER_DESC_CLS,
  TICKET_TIER_NAME_CLS,
  TICKET_TIER_PRICE_CLS,
  TICKET_TOTAL_CLS,
  TICKET_TOTAL_WRAP_CLS,
  TICKETS_EMPTY_CLS,
  TICKETS_EMPTY_ICON_CLS,
  TICKETS_LIST_CLS,
  WATCH_BADGE_CLS,
  WATCH_BTN_CLS,
  WATCH_BTN_GHOST_CLS,
  WATCH_BTN_PRIMARY_CLS,
  WATCH_CARD_ACTIONS_CLS,
  WATCH_CARD_BODY_CLS,
  WATCH_CARD_CLS,
  WATCH_CARD_DATE_CLS,
  WATCH_CARD_DESC_CLS,
  WATCH_CARD_IMG_CLS,
  WATCH_CARD_PILL_CLS,
  WATCH_CARD_PRICE_CLS,
  WATCH_CARD_TITLE_CLS,
  WATCH_EYEBROW_CLS,
  WATCH_FEATURE_ACTIONS_CLS,
  WATCH_FEATURE_CLS,
  WATCH_FEATURE_DESC_CLS,
  WATCH_FEATURE_TEXT_CLS,
  WATCH_FEATURE_TITLE_CLS,
  WATCH_GRID_CLS,
  WATCH_HEADER_CLS,
  WATCH_LIVE_DOT_CLS,
  WATCH_LIVE_PILL_CLS,
  WATCH_LIVE_PULSE_CLS,
  WATCH_LOCKED_CLS,
  WATCH_LOCKED_ICON_CLS,
  WATCH_LOCKED_INNER_CLS,
  WATCH_LOGO_CLS,
  WATCH_MAIN_CLS,
  WATCH_META_LIST_CLS,
  WATCH_PAGE_BG,
  WATCH_PAGE_CLS,
  WATCH_PLAY_CLS,
  WATCH_PLAYER_CLS,
  WATCH_PLAYER_LOCKED_CLS,
  WATCH_PLAYER_META_CLS,
  WATCH_PLAYER_OVERLAY_CLS,
  WATCH_SECTION_CLS,
  WATCH_SECTION_HEAD_CLS,
  WATCH_TAB_ACTIVE_CLS,
  WATCH_TAB_CLS,
  WATCH_TAB_COUNT_CLS,
  WATCH_TABS_CLS,
  WATCH_TITLE_CLS,
  WATCH_USER_CLS,
} from './_watchStyles';

type TabId = 'live' | 'upcoming' | 'tickets';
type CamKey = 'stage' | 'crowd' | 'drone' | 'band';
type TierValue = 'standard' | 'vip' | 'platinum';
type PayValue = 'qpay' | 'socialpay' | 'card';

type TicketModalEvent = {
  id: string;
  title: string;
  date: string;
  image: string;
  base: number;
};

type ChatMessage = { name: string; color: string; text: string; mine: boolean };

const FEATURED_FALLBACK: TicketModalEvent = {
  id: 'featured-placeholder',
  title: 'Удахгүй',
  date: '',
  image: '/assets/images/stadium/exterior.jpg',
  base: 0,
};

const CAMS: Record<CamKey, { label: string; sub: string }> = {
  stage: { label: 'Тайз',      sub: 'Cam 01 · 4K HDR' },
  crowd: { label: 'Үзэгчид',   sub: 'Cam 02 · 1080p' },
  drone: { label: 'Панорама',  sub: 'Cam 03 · 4K' },
  band:  { label: 'Хөгжимчид', sub: 'Cam 04 · 1080p' },
};

const TICKET_TIERS: { value: TierValue; name: string; desc: string; mult: number }[] = [
  { value: 'standard', name: 'Стандарт',   desc: 'HD 1080p шууд дамжуулал · нэг төхөөрөмж',         mult: 1 },
  { value: 'vip',      name: 'VIP 360°',   desc: '4K · 360° форматаар · хоёр төхөөрөмж зэрэг үзэх',  mult: 2 },
  { value: 'platinum', name: 'Платинум',   desc: '4K · 360° · олон өнцөг · 30 хоног дахин үзэх',     mult: 3 },
];

const PAY_METHODS: { value: PayValue; name: string; desc: string }[] = [
  { value: 'qpay',      name: 'QPay',      desc: 'Банкны апп-аар' },
  { value: 'socialpay', name: 'SocialPay', desc: 'Хаан банкны хэтэвч' },
  { value: 'card',      name: 'Карт',      desc: 'Visa · Mastercard' },
];

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

const TAB_IDS: readonly TabId[] = ['live', 'upcoming', 'tickets'] as const;
const isTabId = (value: string): value is TabId =>
  (TAB_IDS as readonly string[]).includes(value);

const money = (n: number): string => n.toLocaleString('en-US') + '₮';

export default function Watch() {
  const session = useRequireAuth();
  const location = useLocation();

  const hashId = location.hash.slice(1);
  const initialTab: TabId = isTabId(hashId) ? hashId : 'live';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [tickets, setTickets] = useState<OrderRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [modalEvent, setModalEvent] = useState<TicketModalEvent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const refreshTickets = useCallback(() => {
    listOrders().then((all) => setTickets(all.filter((t) => t.status !== 'refunded')));
  }, []);

  useEffect(() => {
    refreshTickets();
    listEvents().then(setEvents);
  }, [refreshTickets]);

  const featuredEvent = useMemo<TicketModalEvent>(() => {
    const found = events.find((e) => e.featured);
    if (!found) return FEATURED_FALLBACK;
    return { id: found.id, title: found.title, date: found.date, image: found.image, base: found.base };
  }, [events]);

  const myTickets = useMemo(
    () => tickets.filter((t) => !t.user || (session && t.user === session.identifier)),
    [tickets, session],
  );

  const ownsFeatured = useMemo(
    () => myTickets.some((t) => t.eventId === featuredEvent.id),
    [myTickets, featuredEvent.id],
  );

  const openTicketModal = useCallback((event: TicketModalEvent) => setModalEvent(event), []);
  const closeTicketModal = useCallback(() => setModalEvent(null), []);

  const openViewer = useCallback(() => setViewerOpen(true), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const goSection = useCallback((id: TabId) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const open = viewerOpen || !!modalEvent;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewerOpen, modalEvent]);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (isTabId(id)) setActiveTab(id);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [location.hash]);

  if (!session) return null;

  return (
    <div className={WATCH_PAGE_CLS} style={{ background: WATCH_PAGE_BG }}>
      <header className={WATCH_HEADER_CLS}>
        <Link className={WATCH_LOGO_CLS} to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img src="/assets/images/brand/logo-white.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>

        <nav className={WATCH_TABS_CLS} aria-label="Үзэх төрөл">
          <a className={`${WATCH_TAB_CLS}${activeTab === 'live' ? ' ' + WATCH_TAB_ACTIVE_CLS : ''}`} href="#live" onClick={(e) => { e.preventDefault(); goSection('live'); }}>Шууд</a>
          <a className={`${WATCH_TAB_CLS}${activeTab === 'upcoming' ? ' ' + WATCH_TAB_ACTIVE_CLS : ''}`} href="#upcoming" onClick={(e) => { e.preventDefault(); goSection('upcoming'); }}>Удахгүй</a>
          <a className={`${WATCH_TAB_CLS}${activeTab === 'tickets' ? ' ' + WATCH_TAB_ACTIVE_CLS : ''}`} href="#tickets" onClick={(e) => { e.preventDefault(); goSection('tickets'); }}>
            Тасалбар
            <span className={WATCH_TAB_COUNT_CLS} hidden={myTickets.length === 0}>{myTickets.length}</span>
          </a>
        </nav>

        <div className={WATCH_USER_CLS}>
          <UserMenu />
        </div>
      </header>

      <main className={WATCH_MAIN_CLS}>
        <LiveSection
          featuredEvent={featuredEvent}
          ownsFeatured={ownsFeatured}
          onWatch={() => ownsFeatured ? openViewer() : openTicketModal(featuredEvent)}
          viewerOpen={viewerOpen}
        />

        <UpcomingSection events={events} onBuy={openTicketModal} />

        <TicketsSection
          tickets={myTickets}
          onCancel={async (code) => {
            if (!confirm('Энэ тасалбарыг цуцлах уу?')) return;
            await cancelOrder(code);
            refreshTickets();
          }}
          onWatch={openViewer}
        />
      </main>

      {viewerOpen && (
        <ViewerOverlay session={session} featuredEvent={featuredEvent} onClose={closeViewer} />
      )}

      {modalEvent && (
        <TicketModal
          event={modalEvent}
          session={session}
          onClose={closeTicketModal}
          onPurchased={async (order) => {
            await createOrder(order);
            refreshTickets();
          }}
          onWatchSuccess={() => {
            closeTicketModal();

            setTimeout(() => goSection('tickets'), 250);
          }}
        />
      )}
    </div>
  );
}

type LiveSectionProps = {
  featuredEvent: TicketModalEvent;
  ownsFeatured: boolean;
  onWatch: () => void;
  viewerOpen: boolean;
};

function LiveSection({ featuredEvent, ownsFeatured, onWatch, viewerOpen }: LiveSectionProps) {
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

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (viewerOpen) v.pause();
    else v.play().catch(() => {});
  }, [viewerOpen]);

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
    <section className={WATCH_SECTION_CLS} id="live">
      <div className={WATCH_SECTION_HEAD_CLS}>
        <span className={WATCH_EYEBROW_CLS}>
          <span className={WATCH_LIVE_DOT_CLS} aria-hidden="true"></span>
          Шууд дамжуулал
        </span>
        <h1 className={WATCH_TITLE_CLS}>Одоо явагдаж буй</h1>
      </div>

      <article className={WATCH_FEATURE_CLS}>
        <div className={`${WATCH_PLAYER_CLS}${ownsFeatured ? '' : ' ' + WATCH_PLAYER_LOCKED_CLS}`}>
          <StoryVideo
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={featuredEvent.image}
            fallbackAriaLabel={featuredEvent.title}
          />
          <div className={WATCH_LOCKED_CLS} hidden={ownsFeatured}>
            <div className={WATCH_LOCKED_INNER_CLS}>
              <span className={WATCH_LOCKED_ICON_CLS} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <strong>Энэ эфир төлбөртэй</strong>
              <span>«Шууд үзэх» товч дээр дарж тасалбараа авна уу.</span>
            </div>
          </div>
          <div className={WATCH_PLAYER_OVERLAY_CLS}>
            <span className={WATCH_LIVE_PILL_CLS}>
              <span className={WATCH_LIVE_PULSE_CLS} aria-hidden="true"></span>
              LIVE · 360°
            </span>
            <div className={WATCH_PLAYER_META_CLS}>
              <span>{viewers.toLocaleString('en-US')}</span> үзэгчид
            </div>
          </div>
          <button
            type="button"
            className={`${WATCH_PLAY_CLS}${paused ? ' is-paused' : ''}`}
            onClick={toggle}
            aria-label="Тоглуулах/Зогсоох"
          >
            <svg className="block [.is-paused_&]:hidden" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1"/>
              <rect x="14" y="5" width="4" height="14" rx="1"/>
            </svg>
            <svg className="hidden [.is-paused_&]:block" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>

        <div className={WATCH_FEATURE_TEXT_CLS}>
          <span className={WATCH_BADGE_CLS}>Шууд · 360°</span>
          <h2 className={WATCH_FEATURE_TITLE_CLS}>{featuredEvent.title}</h2>
          <p className={WATCH_FEATURE_DESC_CLS}>
            Гэрээсээ, ажлын газраасаа, эсвэл аяллын дунд — хаанаас ч энэ тоглолтыг
            шууд үзээрэй. Төв Цэнгэлдэх Хүрээлэнгээс зөвхөн вэбсайтаар цацагдах 360°
            гранд эфир. Концертын танхимд биш, дэлгэцэн дээрээ суух мэдрэмж.
          </p>
          <ul className={WATCH_META_LIST_CLS}>
            <li>📅 2026 / 05 / 20 · 21:00 (UTC+8)</li>
            <li>📡 Шууд дамжуулж байна · ямар ч төхөөрөмжөөс үзнэ</li>
            <li>🎥 360° олон өнцөг · 4K HDR</li>
          </ul>
          <div className={WATCH_FEATURE_ACTIONS_CLS}>
            <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`} onClick={onWatch}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              Шууд үзэх
            </button>
            <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS}`}>Чанар: 4K</button>
          </div>
        </div>
      </article>
    </section>
  );
}

type UpcomingSectionProps = {
  events: EventRecord[];
  onBuy: (event: TicketModalEvent) => void;
};

function UpcomingSection({ events, onBuy }: UpcomingSectionProps) {
  const list = events.filter((e) => !e.featured);
  return (
    <section className={WATCH_SECTION_CLS} id="upcoming">
      <div className={WATCH_SECTION_HEAD_CLS}>
        <span className={WATCH_EYEBROW_CLS}>Удахгүй</span>
        <h2 className={WATCH_TITLE_CLS}>Удахгүй болох арга хэмжээ</h2>
      </div>

      <div className={WATCH_GRID_CLS}>
        {list.map((ev) => (
          <article key={ev.id} className={WATCH_CARD_CLS}>
            <div className={WATCH_CARD_IMG_CLS}>
              <img src={ev.image} alt={ev.title} />
              <span className={WATCH_CARD_PILL_CLS}>{ev.pill}</span>
            </div>
            <div className={WATCH_CARD_BODY_CLS}>
              <span className={WATCH_CARD_DATE_CLS}>{ev.date}</span>
              <h3 className={WATCH_CARD_TITLE_CLS}>{ev.title}</h3>
              <p className={WATCH_CARD_DESC_CLS}>{ev.desc}</p>
              <div className={WATCH_CARD_ACTIONS_CLS}>
                <button
                  type="button"
                  className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
                  onClick={() => onBuy({ id: ev.id, title: ev.title, date: ev.when, image: ev.image, base: ev.base })}
                >
                  Тасалбар авах
                </button>
                <span className={WATCH_CARD_PRICE_CLS}>{ev.base.toLocaleString('en-US')}₮-аас</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type TicketsSectionProps = {
  tickets: OrderRecord[];
  onCancel: (code: string) => void;
  onWatch: () => void;
};

function TicketsSection({ tickets, onCancel, onWatch }: TicketsSectionProps) {
  const sorted = useMemo(
    () => [...tickets].sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || '')),
    [tickets],
  );

  return (
    <section className={WATCH_SECTION_CLS} id="tickets">
      <div className={WATCH_SECTION_HEAD_CLS}>
        <span className={WATCH_EYEBROW_CLS}>Хувийн булан</span>
        <h2 className={WATCH_TITLE_CLS}>Миний тасалбарууд</h2>
      </div>
      <div className={TICKETS_LIST_CLS}>
        {sorted.length === 0 ? (
          <div className={TICKETS_EMPTY_CLS}>
            <div className={TICKETS_EMPTY_ICON_CLS} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                <line x1="13" y1="5" x2="13" y2="7"/>
                <line x1="13" y1="11" x2="13" y2="13"/>
                <line x1="13" y1="17" x2="13" y2="19"/>
              </svg>
            </div>
            <h3>Танд одоогоор тасалбар алга</h3>
            <p>«Удахгүй болох арга хэмжээ» хэсгээс тасалбар авч, эндээ хадгална уу.</p>
            <a className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`} href="#upcoming">Арга хэмжээ үзэх</a>
          </div>
        ) : (
          sorted.map((t) => (
            <article key={t.code} className={TICKET_STUB_CLS} data-code={t.code}>
              <div className={TICKET_STUB_COVER_CLS}>
                <img src={t.image} alt={t.title} />
                <span className={TICKET_STUB_TIER_CLS}>{t.tierName}</span>
              </div>
              <div className={TICKET_STUB_BODY_CLS}>
                <span className={TICKET_STUB_DATE_CLS}>{t.date}</span>
                <h3 className={TICKET_STUB_TITLE_CLS}>{t.title}</h3>
                <dl className={TICKET_STUB_META_CLS}>
                  <div><dt className={TICKET_STUB_META_DT_CLS}>Захиалгын код</dt><dd className={`${TICKET_STUB_META_DD_CLS} ${TICKET_STUB_CODE_CLS}`}>{t.code}</dd></div>
                  <div><dt className={TICKET_STUB_META_DT_CLS}>Үзэх эрх</dt><dd className={TICKET_STUB_META_DD_CLS}>{t.qty} төхөөрөмж</dd></div>
                  <div><dt className={TICKET_STUB_META_DT_CLS}>Нийт төлбөр</dt><dd className={TICKET_STUB_META_DD_CLS}>{money(t.total)}</dd></div>
                  <div><dt className={TICKET_STUB_META_DT_CLS}>Төлбөрийн хэрэгсэл</dt><dd className={TICKET_STUB_META_DD_CLS}>{t.paymentName || t.payment}</dd></div>
                </dl>
                <div className={TICKET_STUB_BARCODE_CLS} aria-hidden="true"></div>
                <div className={TICKET_STUB_ACTIONS_CLS}>
                  <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS} ${TICKET_STUB_BTN_CLS} ${TICKET_STUB_REMOVE_HOVER_CLS}`} onClick={() => onCancel(t.code)}>Цуцлах</button>
                  <Link to={`/orders/${t.code}`} className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS} ${TICKET_STUB_BTN_CLS}`}>
                    Дэлгэрэнгүй
                  </Link>
                  <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS} ${TICKET_STUB_BTN_CLS}`} onClick={onWatch}>
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

type ViewerOverlayProps = {
  session: Session;
  featuredEvent: TicketModalEvent;
  onClose: () => void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function ViewerOverlay({ session, featuredEvent, onClose }: ViewerOverlayProps) {
  const mainRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const reactFloatRef = useRef<HTMLDivElement>(null);

  const [angle, setAngle] = useState<CamKey>('stage');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [elapsedSec, setElapsedSec] = useState(42 * 60 + 18);
  const [viewerCount, setViewerCount] = useState(12480);
  const [quality, setQuality] = useState('1080');
  const [cc, setCc] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [idle, setIdle] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);

  const toggleStageFs = useCallback(() => {
    const t = stageRef.current as FullscreenElement | null;
    if (!t) return;
    const doc = document as FullscreenDocument;
    const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!inFs) {
      (t.requestFullscreen || t.webkitRequestFullscreen)?.call(t);
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleStageFs(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, toggleStageFs]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = mainRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume / 100;
  }, [muted, volume]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setViewerCount((n) => {
        const next = n + Math.round((Math.random() - 0.4) * 22);
        return next < 9000 ? 9000 : next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onFs = () => {
      const doc = document as FullscreenDocument;
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
      setIsFs(fsEl === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  useEffect(() => {
    if (!isFs) { setIdle(false); return; }
    let t: ReturnType<typeof setTimeout> | null = null;
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

  const onVolume = (e: ChangeEvent<HTMLInputElement>) => {
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
    } catch {
      
    }
  };

  const [bubbles, setBubbles] = useState<Array<{ id: number; emoji: string; left: string; duration: string }>>([]);
  const bubbleIdRef = useRef(0);
  const emitReact = (emoji: string) => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const id = ++bubbleIdRef.current;
        const left = (15 + Math.random() * 70) + '%';
        const duration = (1.6 + Math.random() * 0.8) + 's';
        setBubbles((prev) => [...prev, { id, emoji, left, duration }]);
        setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== id)), 2500);
      }, i * 80);
    }
  };

  const [chatInput, setChatInput] = useState('');
  const onChatSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const name = session.fullname || session.identifier || 'Та';
    setChat((prev) => [...prev, { name, color: '#4451DC', text, mine: true }]);
    setChatInput('');
  };

  const meta = CAMS[angle] || CAMS.stage;
  const qLabel = quality === 'auto' ? 'Auto' : (quality === '2160' ? '4K · 2160p' : quality + 'p');
  const subLabel = meta.sub.replace(/·\s*[^·]+$/, `· ${qLabel}`);

  return (
    <div className={VIEWER_CLS} role="dialog" aria-modal="true" aria-label="Шууд дамжуулал">
      <header className={VIEWER_HEADER_CLS}>
        <button type="button" className={VIEWER_CLOSE_CLS} aria-label="Хаах" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className={VIEWER_TITLE_WRAP_CLS}>
          <h3 className={VIEWER_TITLE_CLS}>{featuredEvent.title}</h3>
          <span className={VIEWER_LIVE_PILL_CLS}>
            <span className={VIEWER_LIVE_PULSE_CLS} aria-hidden="true"></span>
            LIVE · <span>{fmtElapsed(elapsedSec)}</span>
          </span>
        </div>
        <div className={VIEWER_STATS_CLS}>
          <span className={VIEWER_STAT_CLS} title="Үзэгчид">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{viewerCount.toLocaleString('en-US')}</span>
          </span>
          <button type="button" className={VIEWER_ICON_BTN_CLS} onClick={togglePip} aria-label="Жижиг цонх (PiP)" title="Жижиг цонх">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <rect x="13" y="11" width="6" height="5" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button type="button" className={VIEWER_ICON_BTN_CLS} onClick={toggleStageFs} aria-label="Бүтэн дэлгэц" title="Бүтэн дэлгэц">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        </div>
      </header>

      <div className={VIEWER_BODY_CLS}>
        <aside className={VIEWER_ANGLES_CLS} aria-label="Камерын өнцөг">
          {(['crowd', 'drone', 'band'] as const).map((k) => (
            <button key={k} type="button" className={`${VIEWER_ANGLE_CLS}${angle === k ? ' ' + VIEWER_ANGLE_ACTIVE_CLS : ''}`} onClick={() => setAngle(k)}>
              <span className={`${VIEWER_ANGLE_THUMB_CLS} ${VFX_VIDEO_CLS[k]}`}>
                <StoryVideo
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  poster={featuredEvent.image}
                  fallbackAriaLabel={CAMS[k].label}
                />
                <span className={VIEWER_ANGLE_LIVE_CLS}></span>
              </span>
              <span className={VIEWER_ANGLE_LABEL_CLS}>
                <strong>{CAMS[k].label}</strong>
                <small>{CAMS[k].sub.split(' · ')[0]}{CAMS[k].sub.includes(' · 4K') ? ' · 4K' : ''}</small>
              </span>
            </button>
          ))}
        </aside>

        <section className={`${VIEWER_STAGE_CLS}${isFs ? ' is-fs' : ''}${idle ? ' is-idle' : ''}`} ref={stageRef}>
          <div className={`${VIEWER_STAGE_SHELL_CLS} ${VFX_VIDEO_CLS[angle]}`}>
            <StoryVideo
              ref={mainRef}
              autoPlay
              loop
              playsInline
              preload="metadata"
              poster={featuredEvent.image}
              onDoubleClick={toggleStageFs}
              fallbackAriaLabel={featuredEvent.title}
            />
          </div>
          <span className={VIEWER_MAIN_CAM_CLS}>
            <strong>{meta.label}</strong> · <span>{subLabel}</span>
          </span>

          <div className={VIEWER_REACT_FLOAT_CLS} ref={reactFloatRef} aria-hidden="true">
            {bubbles.map((b) => (
              <span
                key={b.id}
                className="absolute bottom-20 text-[26px] opacity-0 [animation:reactRise_2s_ease-out_forwards] [will-change:transform,opacity] [filter:drop-shadow(0_4px_8px_rgba(0,0,0,0.5))]"
                style={{ left: b.left, animationDuration: b.duration }}
              >
                {b.emoji}
              </span>
            ))}
          </div>

          <div className={VIEWER_CONTROLS_CLS}>
            <div className={VIEWER_CONTROLS_LEFT_CLS}>
              <button type="button" className={`${VIEWER_ICON_BTN_CLS}${paused ? ' is-paused' : ''}`} onClick={togglePlay} aria-label="Тоглуулах/Зогсоох">
                <svg className="block [.is-paused_&]:hidden" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>
                </svg>
                <svg className="hidden [.is-paused_&]:block" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <button type="button" className={`${VIEWER_ICON_BTN_CLS}${muted || volume === 0 ? ' is-muted' : ''}`} onClick={toggleMute} aria-label="Дуу/Дуугүй">
                <svg className="block [.is-muted_&]:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <svg className="hidden [.is-muted_&]:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              </button>
              <input className={VIEWER_VOL_CLS} type="range" min="0" max="100" value={volume} onChange={onVolume} aria-label="Дуу" />
            </div>

            <div className={VIEWER_REACTIONS_CLS} role="group" aria-label="Реакц">
              {['❤️', '🔥', '👏', '🎉'].map((emoji) => (
                <button key={emoji} type="button" className={VIEWER_REACT_CLS} aria-label="Реакц" onClick={() => emitReact(emoji)}>{emoji}</button>
              ))}
            </div>

            <div className={VIEWER_CONTROLS_RIGHT_CLS}>
              <label className={VIEWER_QUALITY_CLS}>
                <span>Чанар</span>
                <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value="2160">4K · 2160p</option>
                  <option value="1080">1080p</option>
                  <option value="720">720p</option>
                  <option value="480">480p</option>
                </select>
              </label>
              <button type="button" className={`${VIEWER_ICON_BTN_CLS}${cc ? ' ' + VIEWER_ICON_BTN_ON_CLS : ''}`} onClick={() => setCc((c) => !c)} aria-label="Хадмал орчуулга" title="Хадмал">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <path d="M7 13a2 2 0 1 0 0-2"/><path d="M14 13a2 2 0 1 0 0-2"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <aside className={VIEWER_CHAT_CLS} aria-label="Шууд чат">
          <header className={VIEWER_CHAT_HEAD_CLS}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Шууд чат
            <span className={VIEWER_CHAT_COUNT_CLS}>{chat.length}</span>
          </header>
          <div className={VIEWER_CHAT_LIST_CLS} ref={chatListRef} aria-live="polite">
            {chat.map((m, i) => (
              <div key={i} className={`${VIEWER_MSG_CLS}${m.mine ? ' ' + VIEWER_MSG_MINE_CLS : ''}`}>
                <span className={VIEWER_MSG_NAME_CLS} style={{ color: m.color }}>{m.name}</span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>
          <form className={VIEWER_CHAT_FORM_CLS} onSubmit={onChatSubmit} autoComplete="off">
            <input
              type="text"
              placeholder="Мессеж бичих…"
              maxLength={140}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className={VIEWER_CHAT_SEND_CLS} aria-label="Илгээх">
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

function fmtElapsed(s: number): string {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function randomBotMessage(): ChatMessage {
  const b = BOTS[Math.floor(Math.random() * BOTS.length)];
  const t = CHAT_SAMPLES[Math.floor(Math.random() * CHAT_SAMPLES.length)];
  return { name: b.name, color: b.color, text: t, mine: false };
}

type TicketModalProps = {
  event: TicketModalEvent;
  session: Session;
  onClose: () => void;
  onPurchased: (order: OrderRecord) => void;
  onWatchSuccess: () => void;
};

function TicketModal({ event, session, onClose, onPurchased, onWatchSuccess }: TicketModalProps) {
  const [tier, setTier] = useState<TierValue>('standard');
  const [pay, setPay] = useState<PayValue>('qpay');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState('');
  const [checkoutLabel, setCheckoutLabel] = useState('Худалдан авах');
  const [success, setSuccess] = useState<OrderRecord | null>(null);

  const selectedTier = TICKET_TIERS.find((t) => t.value === tier);
  const selectedPay = PAY_METHODS.find((p) => p.value === pay);

  const total = event.base * (selectedTier?.mult || 1) * qty;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const checkout = () => {
    setAlert('');
    setBusy(true);
    setCheckoutLabel(
      pay === 'qpay' || pay === 'socialpay'
        ? `${selectedPay?.name ?? ''} рүү шилжиж байна…`
        : 'Картаар төлж байна…',
    );

    setTimeout(() => {

      if (Math.random() < 0.05) {
        setBusy(false);
        setCheckoutLabel('Дахин оролдох');
        setAlert('Төлбөр амжилтгүй боллоо. Дахин оролдоно уу.');
        return;
      }
      const order: OrderRecord = {
        code: 'TS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        user: session.identifier || '',
        eventId: event.id,
        title: event.title,
        date: event.date,
        image: event.image,
        tier,
        tierName: selectedTier?.name,
        qty,
        unitPrice: event.base * (selectedTier?.mult ?? 1),
        total,
        payment: pay,
        paymentName: selectedPay?.name,
        purchasedAt: new Date().toISOString(),
        status: 'paid',
      };
      onPurchased(order);
      setSuccess(order);
    }, 1100);
  };

  const onBackdrop = (e: ReactMouseEvent<HTMLDivElement>) => {
    const tgt = e.target as HTMLElement;
    if (tgt.dataset?.close !== undefined || tgt.closest('[data-close]')) onClose();
  };

  return (
    <div className={TICKET_MODAL_CLS} role="dialog" aria-modal="true" aria-labelledby="ticketModalTitle" onClick={onBackdrop}>
      <div className={TICKET_MODAL_BACKDROP_CLS} data-close=""></div>
      <div className={TICKET_MODAL_CARD_CLS} role="document" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={TICKET_MODAL_CLOSE_CLS} aria-label="Хаах" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {!success ? (
          <div className={TICKET_MODAL_BODY_CLS}>
            <div className={TICKET_MODAL_COVER_CLS}>
              <img src={event.image} alt={event.title} />
              <div className={TICKET_MODAL_COVER_META_CLS}>
                <span className={TICKET_MODAL_DATE_CLS}>{event.date}</span>
                <h2 id="ticketModalTitle" className={TICKET_MODAL_TITLE_CLS}>{event.title}</h2>
                <span className={TICKET_MODAL_VENUE_CLS}>📡 Онлайн шууд дамжуулал · энэ вэбсайтаас үзнэ</span>
              </div>
            </div>

            <div className={TICKET_MODAL_FORM_CLS}>
              <div className={TICKET_SECTION_CLS}>
                <span className={TICKET_SECTION_LABEL_CLS}>Үзэх багц</span>
                <div className={TICKET_RADIO_GROUP_CLS} role="radiogroup">
                  {TICKET_TIERS.map((t) => (
                    <label key={t.value} className={TICKET_RADIO_LABEL_CLS}>
                      <input className={TICKET_RADIO_INPUT_CLS} type="radio" name="tier" value={t.value} checked={tier === t.value} onChange={() => setTier(t.value)} />
                      <span className={TICKET_RADIO_CARD_CLS}>
                        <span className={TICKET_TIER_NAME_CLS}>{t.name}</span>
                        <span className={TICKET_TIER_DESC_CLS}>{t.desc}</span>
                        <span className={TICKET_TIER_PRICE_CLS}>{money(event.base * t.mult)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${TICKET_SECTION_CLS} ${TICKET_ROW_CLS}`}>
                <div>
                  <span className={TICKET_SECTION_LABEL_CLS}>Үзэх эрхийн тоо</span>
                  <div className={TICKET_QTY_CLS}>
                    <button type="button" className={TICKET_QTY_BTN_CLS} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Хасах">−</button>
                    <span className={TICKET_QTY_VAL_CLS}>{qty}</span>
                    <button type="button" className={TICKET_QTY_BTN_CLS} onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Нэмэх">+</button>
                  </div>
                </div>
                <div className={TICKET_TOTAL_WRAP_CLS}>
                  <span className={TICKET_SECTION_LABEL_CLS}>Нийт төлөх</span>
                  <span className={TICKET_TOTAL_CLS}>{money(total)}</span>
                </div>
              </div>

              <div className={TICKET_SECTION_CLS}>
                <span className={TICKET_SECTION_LABEL_CLS}>Төлбөрийн хэрэгсэл</span>
                <div className={TICKET_RADIO_GROUP_CLS} role="radiogroup">
                  {PAY_METHODS.map((p) => (
                    <label key={p.value} className={TICKET_RADIO_LABEL_CLS}>
                      <input className={TICKET_RADIO_INPUT_CLS} type="radio" name="pay" value={p.value} checked={pay === p.value} onChange={() => setPay(p.value)} />
                      <span className={TICKET_RADIO_CARD_CLS}>
                        <span className={TICKET_PAY_NAME_CLS}>{p.name}</span>
                        <span className={TICKET_PAY_DESC_CLS}>{p.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={TICKET_ALERT_CLS} hidden={!alert}>{alert}</div>

              <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS} ${TICKET_CHECKOUT_CLS}`} onClick={checkout} disabled={busy}>
                <span>{checkoutLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <p className={TICKET_FINEPRINT_CLS}>
                Төлбөр амжилттай болсны дараа таны бүртгэлд үзэх эрх нэмэгдэж, «Миний тасалбарууд»
                хэсгээс эфирийн цагт шууд үзэх боломжтой болно. Физик тасалбар өгөхгүй.
              </p>
            </div>
          </div>
        ) : (
          <div className={TICKET_MODAL_SUCCESS_CLS}>
            <div className={TICKET_SUCCESS_ICON_CLS} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className={TICKET_SUCCESS_TITLE_CLS}>Худалдан авалт амжилттай!</h3>
            <p className={TICKET_SUCCESS_DESC_CLS}>
              <strong>{success.title}</strong><br/>
              {success.tierName} · {success.qty} төхөөрөмж · {money(success.total)}<br/>
              <small>Эфирийн цагт «Миний тасалбарууд» эсвэл «Шууд» хэсгээс үзэх боломжтой.</small>
            </p>
            <div className={TICKET_SUCCESS_CODE_CLS}>
              Захиалгын код<br/>
              <strong>{success.code}</strong>
            </div>
            <div className={TICKET_SUCCESS_ACTIONS_CLS}>
              <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS}`} onClick={onClose}>Хаах</button>
              <button type="button" className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`} onClick={onWatchSuccess}>Миний тасалбарууд</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
