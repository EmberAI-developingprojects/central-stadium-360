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
import Hls from 'hls.js';
import * as THREE from 'three';
import { Link, useLocation } from 'react-router-dom';
import { useRequireAuth } from '../auth';
import type { Session } from '../auth';
import UserMenu from '../components/UserMenu';
import { api } from '../lib/api';
import type { WatchCam } from '../lib/api';
import { createOrder, listEvents, listOrders } from '../data/store';
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
  VIEWER_STATS_CLS,
  VIEWER_TITLE_CLS,
  VIEWER_TITLE_WRAP_CLS,
  VIEWER_VOL_CLS,
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
type CamKey = string;
type TierValue = 'standard' | 'vip' | 'platinum';
type PayValue = 'qpay' | 'socialpay' | 'card';

type TicketModalEvent = {
  id: string;
  title: string;
  date: string;
  image: string;
  base: number;
  start_time?: string;
  desc?: string;
};

type ChatMessage = { name: string; color: string; text: string; mine: boolean };

const FEATURED_FALLBACK: TicketModalEvent = {
  id: 'featured-placeholder',
  title: 'Удахгүй',
  date: '',
  image: '/assets/images/stadium/exterior.jpg',
  base: 0,
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
    if (events.length === 0) return FEATURED_FALLBACK;
    const now = Date.now();
    const sorted = [...events].sort((a, b) => {
      const da = Math.abs(new Date(a.start_time).getTime() - now);
      const db = Math.abs(new Date(b.start_time).getTime() - now);
      return da - db;
    });
    const ev = sorted[0];
    return { id: ev.id, title: ev.title, date: ev.date, image: ev.image, base: ev.base, start_time: ev.start_time, desc: ev.desc };
  }, [events]);

  const myTickets = useMemo(
    () => tickets.filter((t) => !t.user || (session && t.user === session.identifier)),
    [tickets, session],
  );

  const ownsFeatured = useMemo(
    () => myTickets.some((t) => t.eventId === featuredEvent.id),
    [myTickets, featuredEvent.id],
  );

  const isLive = useMemo(() => {
    if (!featuredEvent.start_time) return false;
    return new Date(featuredEvent.start_time).getTime() <= Date.now();
  }, [featuredEvent.start_time]);

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
          isLive={isLive}
          onWatch={() => ownsFeatured ? openViewer() : openTicketModal(featuredEvent)}
          viewerOpen={viewerOpen}
        />

        <UpcomingSection events={events} onBuy={openTicketModal} />

        <TicketsSection
          tickets={myTickets}
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
  isLive: boolean;
  onWatch: () => void;
  viewerOpen: boolean;
};

const MONTHS_ABBR_EN = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function LiveSection({ featuredEvent, ownsFeatured, isLive, onWatch }: LiveSectionProps) {
  const d = featuredEvent.start_time ? new Date(featuredEvent.start_time) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const dateStr = valid
    ? `${MONTHS_ABBR_EN[d!.getMonth()]} ${d!.getDate()} / ${d!.getFullYear()}`
    : featuredEvent.date;

  return (
    <section className="w-full" id="live">
      <div className="grid [grid-template-columns:55%_45%] max-[720px]:grid-cols-1 min-h-[460px] max-[720px]:min-h-0">
        {/* Left: image */}
        <div className="relative overflow-hidden bg-[#0a1628] max-[720px]:[aspect-ratio:16/9]">
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
          {isLive && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-2 bg-[#e53935] text-white text-[11px] font-bold uppercase tracking-[0.14em] rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-live-blink" aria-hidden="true" />
              LIVE
            </span>
          )}
        </div>

        {/* Right: info */}
        <div className="bg-[#071526] flex flex-col justify-center px-10 py-14 max-[920px]:px-7 max-[920px]:py-10 max-[720px]:px-6 max-[720px]:py-8">
          <p className="text-[rgba(255,255,255,0.5)] text-[13px] font-bold uppercase tracking-[0.2em] m-0 mb-5">
            {dateStr}
          </p>
          <h1 className="text-white text-[40px] font-extrabold uppercase tracking-[-0.01em] leading-[1.1] m-0 max-[920px]:text-[30px] max-[720px]:text-[24px]">
            {featuredEvent.title}
          </h1>
          {featuredEvent.desc && (
            <p className="text-[rgba(255,255,255,0.5)] text-[14px] mt-3 m-0 uppercase tracking-[0.06em] font-medium">
              {featuredEvent.desc}
            </p>
          )}
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link
              to={`/events/${featuredEvent.id}`}
              className="inline-flex items-center justify-center h-12 px-7 rounded-sm bg-white text-[#071526] text-[13px] font-bold uppercase tracking-[0.1em] no-underline [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.88)] hover:-translate-y-px"
            >
              Дэлгэрэнгүй
            </Link>
            <button
              type="button"
              onClick={onWatch}
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-sm bg-transparent border-2 border-solid border-white text-white text-[13px] font-bold uppercase tracking-[0.1em] cursor-pointer font-[inherit] [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.1)] hover:-translate-y-px"
            >
              {isLive && ownsFeatured ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#e53935] animate-live-blink" aria-hidden="true" />
                  Шууд үзэх
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
                  </svg>
                  Тасалбар авах
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const MONTHS_ABBR_MN = ["1-р","2-р","3-р","4-р","5-р","6-р","7-р","8-р","9-р","10-р","11-р","12-р"];

function fmtEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${ampm}`;
}

type UpcomingSectionProps = {
  events: EventRecord[];
  onBuy: (event: TicketModalEvent) => void;
};

function UpcomingSection({ events, onBuy }: UpcomingSectionProps) {
  if (events.length === 0) return null;
  return (
    <section className="w-full px-6 py-10 max-[920px]:px-5" id="upcoming">
      <div className="max-w-screen-page mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <svg className="w-[18px] h-[18px] text-[rgba(255,255,255,0.5)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            Арга хэмжээнүүд
          </span>
        </div>
        <div className="grid grid-cols-3 gap-5 max-[920px]:grid-cols-2 max-[560px]:grid-cols-1">
          {events.map((ev) => {
            const d = new Date(ev.start_time);
            const valid = !Number.isNaN(d.getTime());
            const day = valid ? d.getDate() : "";
            const monthAbbr = valid ? MONTHS_ABBR_MN[d.getMonth()] : "";
            const time = valid ? fmtEventTime(ev.start_time) : "";
            const evLive = valid && d.getTime() <= Date.now();
            return (
              <article
                key={ev.id}
                className="flex flex-col rounded-[14px] overflow-hidden bg-[#0d2044] group [transition:transform_.2s_ease,box-shadow_.2s_ease] hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_rgba(0,0,0,0.7)] cursor-pointer"
                onClick={() => onBuy({ id: ev.id, title: ev.title, date: ev.when, image: ev.image, base: ev.base, start_time: ev.start_time, desc: ev.desc })}
              >
                <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#071a35] flex-none">
                  {ev.image ? (
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover block [transition:transform_.45s_ease] group-hover:scale-[1.04]" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-[rgba(255,255,255,0.12)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    </div>
                  )}
                  {evLive && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-blink" aria-hidden="true"/>LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-4 p-4 flex-1">
                  <div className="flex flex-col items-center min-w-[44px] shrink-0 pt-0.5">
                    <span className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-[0.07em] leading-none">{monthAbbr}</span>
                    <span className="text-[34px] font-extrabold text-white leading-[1.05] tracking-[-0.02em]">{day}</span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.45)] leading-none mt-0.5">{time}</span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    {ev.pill && (
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.14em] bg-[rgba(255,255,255,0.08)] text-[#6fa8dc] border border-solid border-[rgba(111,168,220,0.3)] rounded px-2 py-0.5 mb-2">{ev.pill}</span>
                    )}
                    <h3 className="text-white font-extrabold text-[16px] leading-[1.25] m-0 tracking-[-0.01em] uppercase">{ev.title}</h3>
                    {ev.desc && <p className="text-[rgba(255,255,255,0.5)] text-[12px] mt-1.5 m-0 leading-[1.45]">{ev.desc}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type TicketsSectionProps = {
  tickets: OrderRecord[];
  onWatch: () => void;
};

function TicketsSection({ tickets, onWatch }: TicketsSectionProps) {
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

type QualityLevel = { index: number; height: number; label: string };

function ViewerOverlay({ session, featuredEvent, onClose }: ViewerOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  const [cams, setCams] = useState<WatchCam[]>([]);
  const [camIdx, setCamIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [qualityIdx, setQualityIdx] = useState(-1);
  const [cc, setCc] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [idle, setIdle] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [bubbles, setBubbles] = useState<Array<{ id: number; emoji: string; left: string; duration: string }>>([]);
  const bubbleIdRef = useRef(0);

  const activeCam = cams[camIdx] ?? null;
  const is360 = activeCam?.type === '360';

  // Load camera stream configs
  useEffect(() => {
    api.getWatchToken().then((res) => {
      if (res.ok) setCams(res.data.cams);
    });
  }, []);

  // HLS stream loading — re-runs when active camera changes
  useEffect(() => {
    const video = videoRef.current;
    const url = activeCam?.hlsUrl;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setQualityLevels([]);
    setQualityIdx(-1);

    if (!url) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels: QualityLevel[] = data.levels.map((l, i) => ({
          index: i,
          height: l.height,
          label: l.height >= 1080 ? '1080p' : l.height >= 720 ? '720p' : `${l.height}p`,
        }));
        setQualityLevels(levels);
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [activeCam?.hlsUrl]);

  // Apply quality level selection
  useEffect(() => {
    if (hlsRef.current) hlsRef.current.currentLevel = qualityIdx;
  }, [qualityIdx]);

  // Sync video state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume / 100;
    const syncPlay = () => setPaused(v.paused);
    v.addEventListener('play', syncPlay);
    v.addEventListener('pause', syncPlay);
    return () => { v.removeEventListener('play', syncPlay); v.removeEventListener('pause', syncPlay); };
  }, [muted, volume]);

  // 360° Three.js sphere renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!is360 || !canvas || !video) return;

    const scene = new THREE.Scene();
    const cam3 = new THREE.PerspectiveCamera(75, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 1000);
    cam3.position.set(0, 0, 0.01);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.SphereGeometry(5, 64, 40);
    geometry.scale(-1, 1, 1);
    const sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
    scene.add(sphere);

    let isDragging = false;
    let prevX = 0, prevY = 0;
    let rotX = 0, rotY = 0;

    const applyRot = () => {
      cam3.rotation.order = 'YXZ';
      cam3.rotation.y = THREE.MathUtils.degToRad(rotY);
      cam3.rotation.x = THREE.MathUtils.degToRad(rotX);
    };

    const onDown = (x: number, y: number) => { isDragging = true; prevX = x; prevY = y; };
    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      rotY += (x - prevX) * 0.25;
      rotX = Math.max(-85, Math.min(85, rotX + (y - prevY) * 0.25));
      prevX = x; prevY = y;
      applyRot();
    };
    const onUp = () => { isDragging = false; };

    const onMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    const ro = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      cam3.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      cam3.updateProjectionMatrix();
    });
    ro.observe(canvas);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      texture.needsUpdate = true;
      renderer.render(scene, cam3);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [is360]);

  // Elapsed timer from viewer open
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fullscreen state
  const toggleStageFs = useCallback(() => {
    const t = stageRef.current as FullscreenElement | null;
    if (!t) return;
    const doc = document as FullscreenDocument;
    const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!inFs) (t.requestFullscreen || t.webkitRequestFullscreen)?.call(t);
    else (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
  }, []);

  useEffect(() => {
    const onFs = () => {
      const doc = document as FullscreenDocument;
      setIsFs((doc.fullscreenElement || doc.webkitFullscreenElement) === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); };
  }, []);

  useEffect(() => {
    if (!isFs) { setIdle(false); return; }
    let t: ReturnType<typeof setTimeout> | null = null;
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = () => { setIdle(false); if (t) clearTimeout(t); t = setTimeout(() => setIdle(true), 2500); };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', () => setIdle(false));
    onMove();
    return () => { if (t) clearTimeout(t); stage.removeEventListener('mousemove', onMove); };
  }, [isFs]);

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
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const toggleMute = () => setMuted((m) => { const next = !m; if (!next && volume === 0) setVolume(60); return next; });
  const onVolume = (e: ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value, 10); setVolume(v); setMuted(v === 0); };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (videoRef.current?.requestPictureInPicture) await videoRef.current.requestPictureInPicture();
    } catch { /* pip not supported */ }
  };

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

  const onChatSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const name = session.fullname || session.identifier || 'Та';
    setChat((prev) => [...prev, { name, color: '#4451DC', text, mine: true }]);
    setChatInput('');
  };

  const qualityLabel = qualityIdx === -1 ? 'Auto' : (qualityLevels.find(l => l.index === qualityIdx)?.label ?? 'Auto');
  const subLabel = activeCam ? `${activeCam.sub} · ${qualityLabel}` : '';

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
        {/* Camera sidebar — all 4 selectable */}
        <aside className={VIEWER_ANGLES_CLS} aria-label="Камерын өнцөг">
          {cams.map((cam, i) => (
            <button
              key={cam.id}
              type="button"
              className={`${VIEWER_ANGLE_CLS}${camIdx === i ? ' ' + VIEWER_ANGLE_ACTIVE_CLS : ''}`}
              onClick={() => setCamIdx(i)}
            >
              <span className={VIEWER_ANGLE_THUMB_CLS} style={{ background: '#0b1929', position: 'relative' }}>
                {featuredEvent.image && (
                  <img
                    src={featuredEvent.image}
                    alt=""
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: camIdx === i ? 0.5 : 0.35 }}
                  />
                )}
                <span className={VIEWER_ANGLE_LIVE_CLS}></span>
                {cam.type === '360' && (
                  <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,0.7)', color: '#60a5fa', padding: '1px 4px', borderRadius: 3, letterSpacing: '0.06em' }}>360°</span>
                )}
              </span>
              <span className={VIEWER_ANGLE_LABEL_CLS}>
                <strong>{cam.label}</strong>
                <small>{cam.sub}</small>
              </span>
            </button>
          ))}
        </aside>

        {/* Main player stage */}
        <section className={`${VIEWER_STAGE_CLS}${isFs ? ' is-fs' : ''}${idle ? ' is-idle' : ''}`} ref={stageRef}>
          <div className={VIEWER_STAGE_SHELL_CLS} style={{ background: '#000', position: 'relative', width: '100%', height: '100%' }}>
            {/* Hidden video element — used for both normal and 360° (as texture source) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={muted}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: is360 ? 'none' : 'block' }}
              poster={featuredEvent.image}
              onDoubleClick={toggleStageFs}
            />
            {/* Three.js canvas for 360° camera */}
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: is360 ? 'block' : 'none', cursor: 'grab', touchAction: 'none' }}
              onDoubleClick={toggleStageFs}
            />
            {/* No stream placeholder */}
            {!activeCam?.hlsUrl && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Урсгал тохируулагдаагүй байна</span>
              </div>
            )}
          </div>

          {activeCam && (
            <span className={VIEWER_MAIN_CAM_CLS}>
              <strong>{activeCam.label}</strong> · <span>{subLabel}</span>
            </span>
          )}

          <div className={VIEWER_REACT_FLOAT_CLS} aria-hidden="true">
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
                <select value={qualityIdx} onChange={(e) => setQualityIdx(Number(e.target.value))}>
                  <option value={-1}>Auto</option>
                  {qualityLevels.filter(l => l.height === 1080 || l.height === 720).map((l) => (
                    <option key={l.index} value={l.index}>{l.label}</option>
                  ))}
                </select>
              </label>
              <button type="button" className={`${VIEWER_ICON_BTN_CLS}${cc ? ' ' + VIEWER_ICON_BTN_ON_CLS : ''}`} onClick={() => setCc((c) => !c)} aria-label="Хадмал" title="Хадмал">
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
            {chat.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Одоогоор мессеж алга.<br/>Та мессеж бичиж эхлэх боломжтой.
              </div>
            )}
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
