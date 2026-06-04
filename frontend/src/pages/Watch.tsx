import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Hls from "hls.js";
import * as THREE from "three";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "../auth";
import type { Session } from "../auth";
import UserMenu from "../components/UserMenu";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api } from "../lib/api";
import type { WatchCam } from "../lib/api";
import { createOrder, listEvents, listOrders } from "../data/store";
import type { EventRecord, OrderRecord } from "../data/store";
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
  VIEWER_CAM_PICKER_BTN_CLS,
  VIEWER_CAM_SHEET_BACKDROP_CLS,
  VIEWER_CAM_SHEET_CLS,
  VIEWER_CAM_SHEET_HEAD_CLS,
  VIEWER_CAM_SHEET_TITLE_CLS,
  VIEWER_CAM_SHEET_CLOSE_CLS,
  VIEWER_CAM_SHEET_LIST_CLS,
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
  WATCH_BTN_CLS,
  WATCH_BTN_GHOST_CLS,
  WATCH_BTN_PRIMARY_CLS,
  WATCH_EYEBROW_CLS,
  WATCH_HEADER_CLS,
  WATCH_LOGO_CLS,
  WATCH_MAIN_CLS,
  WATCH_PAGE_BG,
  WATCH_PAGE_CLS,
  WATCH_SECTION_CLS,
  WATCH_SECTION_HEAD_CLS,
  WATCH_TAB_ACTIVE_CLS,
  WATCH_TAB_CLS,
  WATCH_TAB_COUNT_CLS,
  WATCH_TABS_CLS,
  WATCH_TITLE_CLS,
  WATCH_USER_CLS,
} from "./_watchStyles";

type TabId = "live" | "upcoming" | "tickets";
type CamKey = string;
type TierValue = "standard";
type PayValue = "qpay";

type TicketModalEvent = {
  id: string;
  title: string;
  date: string;
  image: string;
  base: number;
  start_time?: string;
  desc?: string;
};

type ChatMessage = {
  id: string;
  name: string;
  color: string;
  text: string;
  clientId: string;
};

const CHAT_WS_URL = (() => {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  if (base) {
    return base.replace(/^http(s?):/, "ws$1:").replace(/\/$/, "") + "/api/chat";
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/api/chat`;
  }
  return "";
})();

const FEATURED_FALLBACK: TicketModalEvent = {
  id: "featured-placeholder",
  title: "Удахгүй",
  date: "",
  image: "",
  base: 0,
};

const TICKET_TIERS: {
  value: TierValue;
  name: string;
  desc: string;
  mult: number;
}[] = [
  {
    value: "standard",
    name: "Стандарт",
    desc: "HD 1080p шууд дамжуулал · нэг төхөөрөмж",
    mult: 1,
  },
];

const TAB_IDS: readonly TabId[] = ["live", "upcoming", "tickets"] as const;
const isTabId = (value: string): value is TabId =>
  (TAB_IDS as readonly string[]).includes(value);

const money = (n: number): string => n.toLocaleString("en-US") + "₮";

export default function Watch() {
  const { t } = useTranslation();
  const session = useRequireAuth();
  const location = useLocation();

  const hashId = location.hash.slice(1);
  const initialTab: TabId = isTabId(hashId) ? hashId : "live";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [tickets, setTickets] = useState<OrderRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [modalEvent, setModalEvent] = useState<TicketModalEvent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const refreshTickets = useCallback(() => {
    listOrders().then((all) =>
      setTickets(all.filter((t) => t.status !== "refunded")),
    );
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
    return {
      id: ev.id,
      title: ev.title,
      date: ev.date,
      image: ev.image,
      base: ev.base,
      start_time: ev.start_time,
      desc: ev.desc,
    };
  }, [events]);

  const myTickets = useMemo(
    () =>
      tickets.filter(
        (t) => !t.user || (session && t.user === session.identifier),
      ),
    [tickets, session],
  );

  const ownsFeatured = useMemo(
    () => myTickets.some((t) => t.eventId === featuredEvent.id),
    [myTickets, featuredEvent.id],
  );

  const openTicketModal = useCallback(
    (event: TicketModalEvent) => setModalEvent(event),
    [],
  );
  const closeTicketModal = useCallback(() => setModalEvent(null), []);

  const openViewer = useCallback(() => setViewerOpen(true), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const goSection = useCallback((id: TabId) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const open = viewerOpen || !!modalEvent;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewerOpen, modalEvent]);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (isTabId(id)) setActiveTab(id);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [location.hash]);

  if (!session) return null;

  return (
    <div className={WATCH_PAGE_CLS} style={{ background: WATCH_PAGE_BG }}>
      <header className={WATCH_HEADER_CLS}>
        <Link
          className={WATCH_LOGO_CLS}
          to="/"
          aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
        >
          <img
            src="/assets/images/brand/logo-white.png"
            alt="Төв Цэнгэлдэх Хүрээлэн"
          />
        </Link>

        <nav className={WATCH_TABS_CLS} aria-label={t("watch_tab_live")}>
          <a
            className={`${WATCH_TAB_CLS}${activeTab === "live" ? " " + WATCH_TAB_ACTIVE_CLS : ""}`}
            href="#live"
            onClick={(e) => {
              e.preventDefault();
              goSection("live");
            }}
          >
            {t("watch_tab_live")}
          </a>
          <a
            className={`${WATCH_TAB_CLS}${activeTab === "upcoming" ? " " + WATCH_TAB_ACTIVE_CLS : ""}`}
            href="#upcoming"
            onClick={(e) => {
              e.preventDefault();
              goSection("upcoming");
            }}
          >
            {t("watch_tab_upcoming")}
          </a>
          <a
            className={`${WATCH_TAB_CLS}${activeTab === "tickets" ? " " + WATCH_TAB_ACTIVE_CLS : ""}`}
            href="#tickets"
            onClick={(e) => {
              e.preventDefault();
              goSection("tickets");
            }}
          >
            {t("watch_tab_tickets")}
            <span
              className={WATCH_TAB_COUNT_CLS}
              hidden={myTickets.length === 0}
            >
              {myTickets.length}
            </span>
          </a>
        </nav>

        <div
          className={WATCH_USER_CLS}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <LanguageSwitcher dark />
          <UserMenu dark />
        </div>
      </header>

      <main className={WATCH_MAIN_CLS}>
        <LiveSection
          featuredEvent={featuredEvent}
          ownsFeatured={ownsFeatured}
          onWatch={() =>
            ownsFeatured ? openViewer() : openTicketModal(featuredEvent)
          }
        />

        <UpcomingSection
          events={events}
          myTickets={myTickets}
          onBuy={openTicketModal}
          onWatch={openViewer}
        />

        <TicketsSection
          tickets={myTickets}
          events={events}
          onWatch={openViewer}
        />
      </main>

      {viewerOpen && (
        <ViewerOverlay
          session={session}
          featuredEvent={featuredEvent}
          onClose={closeViewer}
        />
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

            setTimeout(() => goSection("tickets"), 250);
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
};

const MONTHS_ABBR_EN = [
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
const pad2 = (n: number) => String(n).padStart(2, "0");

function useCountdown(startTime: string | undefined) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const startMs = startTime ? new Date(startTime).getTime() : null;
  const isLive = startMs !== null ? now >= startMs : false;
  const totalSec =
    startMs !== null ? Math.max(0, Math.floor((startMs - now) / 1000)) : 0;
  return {
    isLive,
    hasTime: startMs !== null,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function LiveSection({
  featuredEvent,
  ownsFeatured,
  onWatch,
}: LiveSectionProps) {
  const { t } = useTranslation();
  const { isLive, hasTime, days, hours, minutes, seconds } = useCountdown(
    featuredEvent.start_time,
  );
  const d = featuredEvent.start_time
    ? new Date(featuredEvent.start_time)
    : null;
  const valid = d && !Number.isNaN(d.getTime());
  const dateStr = valid
    ? `${MONTHS_ABBR_EN[d!.getMonth()]} ${d!.getDate()} / ${d!.getFullYear()}`
    : featuredEvent.date;

  return (
    <section className="w-full max-w-full overflow-hidden" id="live">
      <div className="grid [grid-template-columns:55%_45%] max-[720px]:grid-cols-1 min-h-[460px] max-[720px]:min-h-0 w-full max-w-full">
        <div className="relative overflow-hidden bg-[#0a1628] min-w-0 max-[720px]:[aspect-ratio:16/9]">
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
              <span
                className="w-2 h-2 rounded-full bg-white animate-live-blink"
                aria-hidden="true"
              />
              LIVE
            </span>
          )}
        </div>

        <div className="bg-[#071526] flex flex-col justify-center min-w-0 px-10 py-14 max-[920px]:px-7 max-[920px]:py-10 max-[720px]:px-5 max-[720px]:py-7 max-[420px]:px-4 max-[420px]:py-6">
          <p className="text-[rgba(255,255,255,0.5)] text-[13px] font-bold uppercase tracking-[0.2em] m-0 mb-5 max-[420px]:text-[12px] max-[420px]:mb-3">
            {dateStr}
          </p>
          <h1 className="text-white text-[40px] font-extrabold uppercase tracking-[-0.01em] leading-[1.1] m-0 break-words max-[920px]:text-[30px] max-[720px]:text-[22px] max-[420px]:text-[20px]">
            {featuredEvent.title}
          </h1>
          {featuredEvent.desc && (
            <p className="text-[rgba(255,255,255,0.5)] text-[14px] mt-3 m-0 uppercase tracking-[0.06em] font-medium break-words max-[420px]:text-[12px]">
              {featuredEvent.desc}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3 max-[720px]:mt-6 max-[420px]:gap-2">
            <Link
              to={`/watch/events/${featuredEvent.id}`}
              className="inline-flex items-center justify-center h-11 px-5 rounded-sm bg-white text-[#071526] text-[12px] font-bold uppercase tracking-[0.1em] no-underline [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.88)] hover:-translate-y-px whitespace-nowrap max-[420px]:flex-1 max-[420px]:px-3 max-[420px]:text-[11px] max-[420px]:tracking-[0.06em]"
            >
              {t("watch_details")}
            </Link>

            {!ownsFeatured && (
              <button
                type="button"
                onClick={onWatch}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-sm bg-transparent border-2 border-solid border-white text-white text-[12px] font-bold uppercase tracking-[0.1em] cursor-pointer font-[inherit] [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.1)] hover:-translate-y-px whitespace-nowrap max-[420px]:flex-1 max-[420px]:px-3 max-[420px]:text-[11px] max-[420px]:tracking-[0.06em] max-[420px]:gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
                </svg>
                {t("watch_buy_ticket")}
              </button>
            )}

            {ownsFeatured && !isLive && hasTime && (
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {t("watch_starts_in")}
                </span>
                <span className="text-[28px] font-black text-white [font-variant-numeric:tabular-nums] tracking-[-0.02em] leading-none max-[420px]:text-[22px]">
                  {days > 0 ? `${days} өдөр ` : ""}
                  {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
                </span>
              </div>
            )}

            {ownsFeatured && isLive && (
              <button
                type="button"
                onClick={onWatch}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-sm bg-transparent border-2 border-solid border-white text-white text-[12px] font-bold uppercase tracking-[0.1em] cursor-pointer font-[inherit] [transition:background_.15s_ease,transform_.15s_ease] hover:bg-[rgba(255,255,255,0.1)] hover:-translate-y-px whitespace-nowrap max-[420px]:flex-1 max-[420px]:px-3 max-[420px]:text-[11px] max-[420px]:tracking-[0.06em] max-[420px]:gap-1.5"
              >
                <span
                  className="w-2 h-2 rounded-full bg-[#e53935] animate-live-blink shrink-0"
                  aria-hidden="true"
                />
                {t("watch_watch_live")}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const MONTHS_ABBR_MN = [
  "1-р",
  "2-р",
  "3-р",
  "4-р",
  "5-р",
  "6-р",
  "7-р",
  "8-р",
  "9-р",
  "10-р",
  "11-р",
  "12-р",
];

function fmtEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours(),
    m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

type UpcomingSectionProps = {
  events: EventRecord[];
  myTickets: OrderRecord[];
  onBuy: (event: TicketModalEvent) => void;
  onWatch: () => void;
};

function UpcomingSection({
  events,
  myTickets,
  onBuy,
  onWatch,
}: UpcomingSectionProps) {
  const { t } = useTranslation();
  if (events.length === 0) return null;
  return (
    <section className="w-full px-6 py-10 max-[920px]:px-5" id="upcoming">
      <div className="max-w-screen-page mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <svg
            className="w-[18px] h-[18px] text-[rgba(255,255,255,0.5)] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            {t("watch_events_section")}
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
            const owned = myTickets.some((t) => t.eventId === ev.id);
            return (
              <article
                key={ev.id}
                className="flex flex-col rounded-[14px] overflow-hidden bg-[#0d2044] group [transition:transform_.2s_ease,box-shadow_.2s_ease] hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_rgba(0,0,0,0.7)] cursor-pointer"
                onClick={() =>
                  owned
                    ? onWatch()
                    : onBuy({
                        id: ev.id,
                        title: ev.title,
                        date: ev.when,
                        image: ev.image,
                        base: ev.base,
                        start_time: ev.start_time,
                        desc: ev.desc,
                      })
                }
              >
                <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#071a35] flex-none">
                  {ev.image ? (
                    <img
                      src={ev.image}
                      alt={ev.title}
                      className="w-full h-full object-cover block [transition:transform_.45s_ease] group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-[rgba(255,255,255,0.12)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                  )}
                  {evLive && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-[#e53935] text-white text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-2.5 py-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white animate-live-blink"
                        aria-hidden="true"
                      />
                      LIVE
                    </span>
                  )}
                  {owned && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-[rgba(16,185,129,0.85)] text-white text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2.5 py-1">
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {t("watch_ticketed")}
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-4 p-4 flex-1">
                  <div className="flex flex-col items-center min-w-[44px] shrink-0 pt-0.5">
                    <span className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-[0.07em] leading-none">
                      {monthAbbr}
                    </span>
                    <span className="text-[34px] font-extrabold text-white leading-[1.05] tracking-[-0.02em]">
                      {day}
                    </span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.45)] leading-none mt-0.5">
                      {time}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    {ev.pill && (
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.14em] bg-[rgba(255,255,255,0.08)] text-[#6fa8dc] border border-solid border-[rgba(111,168,220,0.3)] rounded px-2 py-0.5 mb-2">
                        {ev.pill}
                      </span>
                    )}
                    <h3 className="text-white font-extrabold text-[16px] leading-[1.25] m-0 tracking-[-0.01em] uppercase">
                      {ev.title}
                    </h3>
                    {ev.desc && (
                      <p className="text-[rgba(255,255,255,0.5)] text-[12px] mt-1.5 m-0 leading-[1.45]">
                        {ev.desc}
                      </p>
                    )}
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
  events: EventRecord[];
  onWatch: () => void;
};

type TicketCardProps = {
  ticket: OrderRecord;
  startTime: string | undefined;
  onWatch: () => void;
};

function TicketCard({ ticket: tk, startTime, onWatch }: TicketCardProps) {
  const { t } = useTranslation();
  const { isLive, hasTime, days, hours, minutes, seconds } =
    useCountdown(startTime);
  return (
    <article className={TICKET_STUB_CLS} data-code={tk.code}>
      <div className={TICKET_STUB_COVER_CLS}>
        <img src={tk.image} alt={tk.title} />
        <span className={TICKET_STUB_TIER_CLS}>{tk.tierName}</span>
      </div>
      <div className={TICKET_STUB_BODY_CLS}>
        <span className={TICKET_STUB_DATE_CLS}>{tk.date}</span>
        <h3 className={TICKET_STUB_TITLE_CLS}>{tk.title}</h3>
        <dl className={TICKET_STUB_META_CLS}>
          <div>
            <dt className={TICKET_STUB_META_DT_CLS}>{t("watch_order_code")}</dt>
            <dd
              className={`${TICKET_STUB_META_DD_CLS} ${TICKET_STUB_CODE_CLS}`}
            >
              {tk.code}
            </dd>
          </div>
          <div>
            <dt className={TICKET_STUB_META_DT_CLS}>
              {t("watch_view_access")}
            </dt>
            <dd className={TICKET_STUB_META_DD_CLS}>
              {tk.qty} {t("watch_devices")}
            </dd>
          </div>
          <div>
            <dt className={TICKET_STUB_META_DT_CLS}>{t("watch_total")}</dt>
            <dd className={TICKET_STUB_META_DD_CLS}>{money(tk.total)}</dd>
          </div>
          <div>
            <dt className={TICKET_STUB_META_DT_CLS}>
              {t("watch_payment_method")}
            </dt>
            <dd className={TICKET_STUB_META_DD_CLS}>
              {tk.paymentName || tk.payment}
            </dd>
          </div>
        </dl>
        <div className={TICKET_STUB_BARCODE_CLS} aria-hidden="true"></div>
        <div className={TICKET_STUB_ACTIONS_CLS}>
          <Link
            to={`/watch/events/${tk.eventId}`}
            className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS} ${TICKET_STUB_BTN_CLS}`}
          >
            {t("watch_details")}
          </Link>
          {isLive && (
            <button
              type="button"
              className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS} ${TICKET_STUB_BTN_CLS}`}
              onClick={onWatch}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-white animate-live-blink flex-none"
                aria-hidden="true"
              />
              {t("watch_watch_live")}
            </button>
          )}
          {!isLive && hasTime && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {t("watch_starts_in")}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#fff",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                {days > 0 ? `${days} өдөр ` : ""}
                {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function TicketsSection({ tickets, events, onWatch }: TicketsSectionProps) {
  const { t: tr } = useTranslation();
  const sorted = useMemo(
    () =>
      [...tickets].sort((a, b) =>
        (b.purchasedAt || "").localeCompare(a.purchasedAt || ""),
      ),
    [tickets],
  );

  return (
    <section className={WATCH_SECTION_CLS} id="tickets">
      <div className={WATCH_SECTION_HEAD_CLS}>
        <span className={WATCH_EYEBROW_CLS}>{tr("watch_my_section")}</span>
        <h2 className={WATCH_TITLE_CLS}>{tr("watch_my_tickets")}</h2>
      </div>
      <div className={TICKETS_LIST_CLS}>
        {sorted.length === 0 ? (
          <div className={TICKETS_EMPTY_CLS}>
            <div className={TICKETS_EMPTY_ICON_CLS} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
                <line x1="13" y1="5" x2="13" y2="7" />
                <line x1="13" y1="11" x2="13" y2="13" />
                <line x1="13" y1="17" x2="13" y2="19" />
              </svg>
            </div>
            <h3>{tr("watch_no_tickets")}</h3>
            <p>{tr("watch_no_tickets_hint")}</p>
            <a
              className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
              href="#upcoming"
            >
              {tr("watch_browse_events")}
            </a>
          </div>
        ) : (
          sorted.map((tk) => {
            const ev = events.find((e) => e.id === tk.eventId);
            return (
              <TicketCard
                key={tk.code}
                ticket={tk}
                startTime={ev?.start_time}
                onWatch={onWatch}
              />
            );
          })
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

function ViewerOverlay({
  session,
  featuredEvent,
  onClose,
}: ViewerOverlayProps) {
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
  const [pseudoFs, setPseudoFs] = useState(false);
  const [idle, setIdle] = useState(false);
  const [isAtLive, setIsAtLive] = useState(true);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatConnected, setChatConnected] = useState(false);
  const chatSocketRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(
    Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10),
  );
  const [bubbles, setBubbles] = useState<
    Array<{ id: number; emoji: string; left: string; duration: string }>
  >([]);
  const bubbleIdRef = useRef(0);
  const [camPickerOpen, setCamPickerOpen] = useState(false);

  const activeCam = cams[camIdx] ?? null;
  const is360 = activeCam?.type === "360";

  useEffect(() => {
    api.getWatchToken().then((res) => {
      if (res.ok) setCams(res.data.cams);
    });
  }, []);

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
          label:
            l.height >= 1080
              ? "1080p"
              : l.height >= 720
                ? "720p"
                : `${l.height}p`,
        }));
        setQualityLevels(levels);
        video.play().catch(() => {});
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeCam?.hlsUrl]);

  useEffect(() => {
    if (hlsRef.current) hlsRef.current.currentLevel = qualityIdx;
  }, [qualityIdx]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume / 100;
    const syncPlay = () => setPaused(v.paused);
    v.addEventListener("play", syncPlay);
    v.addEventListener("pause", syncPlay);
    return () => {
      v.removeEventListener("play", syncPlay);
      v.removeEventListener("pause", syncPlay);
    };
  }, [muted, volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!is360 || !canvas || !video) return;

    const scene = new THREE.Scene();
    const cam3 = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.1,
      1000,
    );
    cam3.position.set(0, 0, 0.01);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.SphereGeometry(5, 64, 40);
    geometry.scale(-1, 1, 1);
    const sphere = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    scene.add(sphere);

    let isDragging = false;
    let prevX = 0,
      prevY = 0;
    let rotX = 0,
      rotY = 0;

    const applyRot = () => {
      cam3.rotation.order = "YXZ";
      cam3.rotation.y = THREE.MathUtils.degToRad(rotY);
      cam3.rotation.x = THREE.MathUtils.degToRad(rotX);
    };

    const onDown = (x: number, y: number) => {
      isDragging = true;
      prevX = x;
      prevY = y;
    };
    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      rotY += (x - prevX) * 0.25;
      rotX = Math.max(-85, Math.min(85, rotX + (y - prevY) * 0.25));
      prevX = x;
      prevY = y;
      applyRot();
    };
    const onUp = () => {
      isDragging = false;
    };

    const onMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onUp);

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
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, [is360]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleStageFs = useCallback(async () => {
    const stage = stageRef.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;

    if (inFs || pseudoFs) {
      if (inFs) {
        try {
          await (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
        } catch {}
      }
      if (pseudoFs) setPseudoFs(false);
      return;
    }

    if (stage) {
      const requestFs =
        stage.requestFullscreen?.bind(stage) ||
        stage.webkitRequestFullscreen?.bind(stage);
      if (requestFs) {
        try {
          await requestFs();
          if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
        } catch {}
      }
    }

    setPseudoFs(true);
  }, [pseudoFs]);

  const exitFsAndClose = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const inFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (inFs) {
      try {
        await (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
      } catch {}
    }
    if (pseudoFs) setPseudoFs(false);
    onClose();
  }, [pseudoFs, onClose]);

  useEffect(() => {
    window.history.pushState({ cs360Viewer: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  useEffect(() => {
    const onFs = () => {
      const doc = document as FullscreenDocument;
      const active =
        (doc.fullscreenElement || doc.webkitFullscreenElement) ===
        stageRef.current;
      setIsFs(active);

      if (!active) setPseudoFs(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    if (!isFs && !pseudoFs) {
      setIdle(false);
      return;
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const stage = stageRef.current;
    if (!stage) return;
    const onActivity = () => {
      setIdle(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => setIdle(true), 3500);
    };
    const onLeave = () => setIdle(false);
    stage.addEventListener("mousemove", onActivity);
    stage.addEventListener("mouseleave", onLeave);
    stage.addEventListener("touchstart", onActivity, { passive: true });
    stage.addEventListener("touchmove", onActivity, { passive: true });
    onActivity();
    return () => {
      if (t) clearTimeout(t);
      stage.removeEventListener("mousemove", onActivity);
      stage.removeEventListener("mouseleave", onLeave);
      stage.removeEventListener("touchstart", onActivity);
      stage.removeEventListener("touchmove", onActivity);
    };
  }, [isFs, pseudoFs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA"))
        return;
      if (e.key === "Escape") {
        if (pseudoFs) {
          setPseudoFs(false);
          return;
        }
        onClose();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleStageFs();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, toggleStageFs, pseudoFs]);

  useEffect(() => {
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat]);

  useEffect(() => {
    if (!CHAT_WS_URL) return;
    let cancelled = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(CHAT_WS_URL);
      } catch {
        scheduleRetry();
        return;
      }
      chatSocketRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        retry = 0;
        setChatConnected(true);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data));
          if (data?.type !== "msg") return;
          const msg: ChatMessage = {
            id: String(data.id ?? Math.random().toString(36).slice(2, 11)),
            name: String(data.name ?? "Зочин"),
            color: String(data.color ?? "#4451DC"),
            text: String(data.text ?? ""),
            clientId: String(data.clientId ?? ""),
          };
          if (!msg.text) return;
          setChat((prev) => {
            const next = [...prev, msg];
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
        } catch {}
      };
      ws.onclose = () => {
        setChatConnected(false);
        if (chatSocketRef.current === ws) chatSocketRef.current = null;
        scheduleRetry();
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      retry = Math.min(retry + 1, 6);
      const delay = Math.min(500 * 2 ** (retry - 1), 8000);
      retryTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      const ws = chatSocketRef.current;
      chatSocketRef.current = null;
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const jumpToLive = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const hls = hlsRef.current as (Hls & { liveSyncPosition?: number }) | null;
    let target = NaN;
    if (hls && typeof hls.liveSyncPosition === "number") {
      target = hls.liveSyncPosition;
    } else if (v.seekable.length > 0) {
      target = v.seekable.end(v.seekable.length - 1);
    }
    if (Number.isFinite(target) && target > 0) {
      v.currentTime = target;
    }
    v.play().catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const hls = hlsRef.current as
        | (Hls & { liveSyncPosition?: number })
        | null;
      let livePos = NaN;
      if (hls && typeof hls.liveSyncPosition === "number") {
        livePos = hls.liveSyncPosition;
      } else if (v.seekable.length > 0) {
        livePos = v.seekable.end(v.seekable.length - 1);
      }
      if (!Number.isFinite(livePos)) return;
      setIsAtLive(livePos - v.currentTime < 5);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleMute = () =>
    setMuted((m) => {
      const next = !m;
      if (!next && volume === 0) setVolume(60);
      return next;
    });
  const onVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    setMuted(v === 0);
  };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      else if (videoRef.current?.requestPictureInPicture)
        await videoRef.current.requestPictureInPicture();
    } catch {}
  };

  const emitReact = (emoji: string) => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const id = ++bubbleIdRef.current;
        const left = 15 + Math.random() * 70 + "%";
        const duration = 1.6 + Math.random() * 0.8 + "s";
        setBubbles((prev) => [...prev, { id, emoji, left, duration }]);
        setTimeout(
          () => setBubbles((prev) => prev.filter((b) => b.id !== id)),
          2500,
        );
      }, i * 80);
    }
  };

  const onChatSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const name = session.fullname || session.identifier || "Та";
    const ws = chatSocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          name,
          color: "#4451DC",
          text,
          clientId: clientIdRef.current,
        }),
      );
      setChatInput("");
    }
  };

  const qualityLabel =
    qualityIdx === -1
      ? "Auto"
      : (qualityLevels.find((l) => l.index === qualityIdx)?.label ?? "Auto");
  const subLabel = activeCam ? `${activeCam.sub} · ${qualityLabel}` : "";

  return (
    <div
      className={VIEWER_CLS}
      role="dialog"
      aria-modal="true"
      aria-label="Шууд дамжуулал"
    >
      <header className={VIEWER_HEADER_CLS}>
        <button
          type="button"
          className={VIEWER_CLOSE_CLS}
          aria-label="Хаах"
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
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
          <button
            type="button"
            className={VIEWER_ICON_BTN_CLS}
            onClick={togglePip}
            aria-label="Жижиг цонх (PiP)"
            title="Жижиг цонх"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <rect
                x="13"
                y="11"
                width="6"
                height="5"
                rx="1"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className={VIEWER_ICON_BTN_CLS}
            onClick={toggleStageFs}
            aria-label="Бүтэн дэлгэц"
            title="Бүтэн дэлгэц"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </header>

      <div className={VIEWER_BODY_CLS}>
        <aside className={VIEWER_ANGLES_CLS} aria-label="Камерын өнцөг">
          {cams.map((cam, i) => (
            <button
              key={cam.id}
              type="button"
              className={`${VIEWER_ANGLE_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
              onClick={() => setCamIdx(i)}
            >
              <span
                className={VIEWER_ANGLE_THUMB_CLS}
                style={{ background: "#0b1929", position: "relative" }}
              >
                {featuredEvent.image && (
                  <img
                    src={featuredEvent.image}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: camIdx === i ? 0.5 : 0.35,
                    }}
                  />
                )}
                <span className={VIEWER_ANGLE_LIVE_CLS}></span>
                {cam.type === "360" && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      background: "rgba(0,0,0,0.7)",
                      color: "#60a5fa",
                      padding: "1px 4px",
                      borderRadius: 3,
                      letterSpacing: "0.06em",
                    }}
                  >
                    360°
                  </span>
                )}
              </span>
              <span className={VIEWER_ANGLE_LABEL_CLS}>
                <strong>{cam.label}</strong>
                <small>{cam.sub}</small>
              </span>
            </button>
          ))}
        </aside>

        <section
          className={`${VIEWER_STAGE_CLS}${isFs || pseudoFs ? " is-fs" : ""}${idle ? " is-idle" : ""}`}
          ref={stageRef}
          style={
            pseudoFs
              ? {
                  position: "fixed",
                  inset: 0,
                  width: "100dvw",
                  height: "100dvh",
                  padding: 0,
                  gap: 0,
                  zIndex: 2000,
                  background: "#000",
                }
              : undefined
          }
        >
          <div
            className={VIEWER_STAGE_SHELL_CLS}
            style={
              isFs || pseudoFs
                ? {
                    background: "#000",
                    flex: "1 1 0%",
                    width: "100%",
                    height: "100%",
                    maxHeight: "none",
                    borderRadius: 0,
                    boxShadow: "none",
                  }
                : { background: "#000" }
            }
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={muted}
              style={{
                width: "100%",
                height: "100%",
                objectFit: isFs || pseudoFs ? "cover" : "contain",
                display: is360 ? "none" : "block",
              }}
              poster={featuredEvent.image}
              onDoubleClick={toggleStageFs}
            />
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                display: is360 ? "block" : "none",
                cursor: "grab",
                touchAction: "none",
              }}
              onDoubleClick={toggleStageFs}
            />
            {!activeCam?.hlsUrl && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: "rgba(255,255,255,0.4)",
                  pointerEvents: "none",
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Урсгал тохируулагдаагүй байна
                </span>
              </div>
            )}
          </div>

          {(isFs || pseudoFs) && (
            <button
              type="button"
              onClick={exitFsAndClose}
              aria-label="Буцах"
              title="Буцах"
              className="absolute top-4 left-4 z-[3] w-[44px] h-[44px] rounded-full text-white grid place-items-center cursor-pointer bg-[rgba(11,15,26,0.7)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)] border border-solid border-[rgba(255,255,255,0.14)] [transition:background_.15s_ease,opacity_.25s_ease] hover:bg-[rgba(11,15,26,0.9)] [.is-idle_&]:opacity-0 [.is-idle_&]:pointer-events-none [&_svg]:w-5 [&_svg]:h-5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

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
              <button
                type="button"
                className={`${VIEWER_ICON_BTN_CLS}${paused ? " is-paused" : ""}`}
                onClick={togglePlay}
                aria-label="Тоглуулах/Зогсоох"
              >
                <svg
                  className="block [.is-paused_&]:hidden"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                <svg
                  className="hidden [.is-paused_&]:block"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button
                type="button"
                className={`${VIEWER_ICON_BTN_CLS}${muted || volume === 0 ? " is-muted" : ""}`}
                onClick={toggleMute}
                aria-label="Дуу/Дуугүй"
              >
                <svg
                  className="block [.is-muted_&]:hidden"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                <svg
                  className="hidden [.is-muted_&]:block"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              </button>
              <input
                className={VIEWER_VOL_CLS}
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={onVolume}
                aria-label="Дуу"
              />
              <button
                type="button"
                onClick={jumpToLive}
                aria-label="Шууд дамжуулалт руу шилжих"
                title={
                  isAtLive ? "Шууд дамжуулалт" : "Шууд дамжуулалт руу шилжих"
                }
                className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[11px] font-extrabold tracking-[.12em] cursor-pointer border border-solid [transition:background_.15s_ease,color_.15s_ease,border-color_.15s_ease] ${
                  isAtLive
                    ? "bg-[#E53935] border-[#E53935] text-white cursor-default"
                    : "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.18)] text-[rgba(255,255,255,0.85)] hover:bg-[#E53935] hover:border-[#E53935] hover:text-white"
                }`}
              >
                <span
                  className={`w-[7px] h-[7px] rounded-full ${
                    isAtLive
                      ? "bg-white [animation:live-pulse_1.4s_ease-in-out_infinite]"
                      : "bg-[#E53935]"
                  }`}
                  aria-hidden="true"
                />
                LIVE
              </button>
            </div>

            <div
              className={VIEWER_REACTIONS_CLS}
              role="group"
              aria-label="Реакц"
            >
              {["❤️", "🔥", "👏", "🎉"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={VIEWER_REACT_CLS}
                  aria-label="Реакц"
                  onClick={() => emitReact(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className={VIEWER_CONTROLS_RIGHT_CLS}>
              <label className={VIEWER_QUALITY_CLS}>
                <span>Чанар</span>
                <select
                  value={qualityIdx}
                  onChange={(e) => setQualityIdx(Number(e.target.value))}
                >
                  <option value={-1}>Auto</option>
                  {qualityLevels
                    .filter((l) => l.height === 1080 || l.height === 720)
                    .map((l) => (
                      <option key={l.index} value={l.index}>
                        {l.label}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className={`${VIEWER_ICON_BTN_CLS}${cc ? " " + VIEWER_ICON_BTN_ON_CLS : ""}`}
                onClick={() => setCc((c) => !c)}
                aria-label="Хадмал"
                title="Хадмал"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M7 13a2 2 0 1 0 0-2" />
                  <path d="M14 13a2 2 0 1 0 0-2" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        <aside className={VIEWER_CHAT_CLS} aria-label="Шууд чат">
          <header className={VIEWER_CHAT_HEAD_CLS}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Шууд чат
            <span
              aria-hidden="true"
              title={chatConnected ? "Холбогдсон" : "Холбогдож байна…"}
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                marginLeft: 6,
                borderRadius: "50%",
                background: chatConnected ? "#22c55e" : "#f59e0b",
                boxShadow: chatConnected
                  ? "0 0 0 2px rgba(34,197,94,0.18)"
                  : "none",
                transition: "background 200ms",
              }}
            />
            <span className={VIEWER_CHAT_COUNT_CLS}>{chat.length}</span>
          </header>
          <div
            className={VIEWER_CHAT_LIST_CLS}
            ref={chatListRef}
            aria-live="polite"
          >
            {chat.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 13,
                }}
              >
                Одоогоор мессеж алга.
                <br />
                Та мессеж бичиж эхлэх боломжтой.
              </div>
            )}
            {chat.map((m) => {
              const mine = m.clientId === clientIdRef.current;
              return (
                <div
                  key={m.id}
                  className={`${VIEWER_MSG_CLS}${mine ? " " + VIEWER_MSG_MINE_CLS : ""}`}
                >
                  <span
                    className={VIEWER_MSG_NAME_CLS}
                    style={{ color: m.color }}
                  >
                    {m.name}
                  </span>
                  <span>{m.text}</span>
                </div>
              );
            })}
          </div>
          <form
            className={VIEWER_CHAT_FORM_CLS}
            onSubmit={onChatSubmit}
            autoComplete="off"
          >
            <input
              type="text"
              placeholder={chatConnected ? "Мессеж бичих…" : "Холбогдож байна…"}
              maxLength={140}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!chatConnected}
            />
            <button
              type="submit"
              className={VIEWER_CHAT_SEND_CLS}
              aria-label="Илгээх"
              disabled={!chatConnected || !chatInput.trim()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </aside>

        <button
          type="button"
          className={VIEWER_CAM_PICKER_BTN_CLS}
          onClick={() => setCamPickerOpen(true)}
          aria-label="Камер сонгох"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {activeCam ? `Камер: ${activeCam.label}` : "Камер сонгох"}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ marginLeft: "auto" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {camPickerOpen && (
        <>
          <div
            className={VIEWER_CAM_SHEET_BACKDROP_CLS}
            onClick={() => setCamPickerOpen(false)}
          />
          <div
            className={VIEWER_CAM_SHEET_CLS}
            role="dialog"
            aria-modal="true"
            aria-label="Камер сонгох"
          >
            <header className={VIEWER_CAM_SHEET_HEAD_CLS}>
              <h4 className={VIEWER_CAM_SHEET_TITLE_CLS}>Камерын өнцөг</h4>
              <button
                type="button"
                className={VIEWER_CAM_SHEET_CLOSE_CLS}
                onClick={() => setCamPickerOpen(false)}
                aria-label="Хаах"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>
            <div className={VIEWER_CAM_SHEET_LIST_CLS}>
              {cams.map((cam, i) => (
                <button
                  key={cam.id}
                  type="button"
                  className={`${VIEWER_ANGLE_CLS}${camIdx === i ? " " + VIEWER_ANGLE_ACTIVE_CLS : ""}`}
                  onClick={() => {
                    setCamIdx(i);
                    setCamPickerOpen(false);
                  }}
                >
                  <span
                    className={VIEWER_ANGLE_THUMB_CLS}
                    style={{ background: "#0b1929", position: "relative" }}
                  >
                    {featuredEvent.image && (
                      <img
                        src={featuredEvent.image}
                        alt=""
                        aria-hidden="true"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: camIdx === i ? 0.5 : 0.35,
                        }}
                      />
                    )}
                    <span className={VIEWER_ANGLE_LIVE_CLS}></span>
                    {cam.type === "360" && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          background: "rgba(0,0,0,0.7)",
                          color: "#60a5fa",
                          padding: "1px 4px",
                          borderRadius: 3,
                          letterSpacing: "0.06em",
                        }}
                      >
                        360°
                      </span>
                    )}
                  </span>
                  <span className={VIEWER_ANGLE_LABEL_CLS}>
                    <strong>{cam.label}</strong>
                    <small>{cam.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function fmtElapsed(s: number): string {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

type TicketModalProps = {
  event: TicketModalEvent;
  session: Session;
  onClose: () => void;
  onPurchased: (order: OrderRecord) => void;
  onWatchSuccess: () => void;
};

function TicketModal({
  event,
  session,
  onClose,
  onPurchased,
  onWatchSuccess,
}: TicketModalProps) {
  const { t } = useTranslation();
  const [tier, setTier] = useState<TierValue>("standard");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState("");
  const [checkoutLabel, setCheckoutLabel] = useState<string>(
    t("ticket_purchase"),
  );
  const [success, setSuccess] = useState<OrderRecord | null>(null);

  const selectedTier = TICKET_TIERS.find((tt) => tt.value === tier);

  const total = event.base * (selectedTier?.mult || 1) * qty;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const checkout = () => {
    setAlert("");
    setBusy(true);
    setCheckoutLabel(t("ticket_redirecting"));

    setTimeout(() => {
      if (Math.random() < 0.05) {
        setBusy(false);
        setCheckoutLabel(t("ticket_retry"));
        setAlert(t("ticket_error"));
        return;
      }
      const order: OrderRecord = {
        code: "TS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        user: session.identifier || "",
        eventId: event.id,
        title: event.title,
        date: event.date,
        image: event.image,
        tier,
        tierName: t("ticket_standard"),
        qty,
        unitPrice: event.base * (selectedTier?.mult ?? 1),
        total,
        payment: "qpay",
        paymentName: "QPay",
        purchasedAt: new Date().toISOString(),
        status: "paid",
      };
      onPurchased(order);
      setSuccess(order);
    }, 1100);
  };

  const onBackdrop = (e: ReactMouseEvent<HTMLDivElement>) => {
    const tgt = e.target as HTMLElement;
    if (tgt.dataset?.close !== undefined || tgt.closest("[data-close]"))
      onClose();
  };

  return (
    <div
      className={TICKET_MODAL_CLS}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticketModalTitle"
      onClick={onBackdrop}
    >
      <div className={TICKET_MODAL_BACKDROP_CLS} data-close=""></div>
      <div
        className={TICKET_MODAL_CARD_CLS}
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={TICKET_MODAL_CLOSE_CLS}
          aria-label={t("ticket_close")}
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {!success ? (
          <div className={TICKET_MODAL_BODY_CLS}>
            <div className={TICKET_MODAL_COVER_CLS}>
              <img src={event.image} alt={event.title} />
              <div className={TICKET_MODAL_COVER_META_CLS}>
                <span className={TICKET_MODAL_DATE_CLS}>{event.date}</span>
                <h2 id="ticketModalTitle" className={TICKET_MODAL_TITLE_CLS}>
                  {event.title}
                </h2>
                <span className={TICKET_MODAL_VENUE_CLS}>
                  📡 {t("watch_online_stream")}
                </span>
              </div>
            </div>

            <div className={TICKET_MODAL_FORM_CLS}>
              <div className={TICKET_SECTION_CLS}>
                <span className={TICKET_SECTION_LABEL_CLS}>
                  {t("ticket_package")}
                </span>
                <div className={TICKET_RADIO_GROUP_CLS} role="radiogroup">
                  {TICKET_TIERS.map((tt) => (
                    <label key={tt.value} className={TICKET_RADIO_LABEL_CLS}>
                      <input
                        className={TICKET_RADIO_INPUT_CLS}
                        type="radio"
                        name="tier"
                        value={tt.value}
                        checked={tier === tt.value}
                        onChange={() => setTier(tt.value)}
                      />
                      <span className={TICKET_RADIO_CARD_CLS}>
                        <span className={TICKET_TIER_NAME_CLS}>
                          {t("ticket_standard")}
                        </span>
                        <span className={TICKET_TIER_DESC_CLS}>
                          {t("ticket_standard_desc")}
                        </span>
                        <span className={TICKET_TIER_PRICE_CLS}>
                          {money(event.base * tt.mult)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${TICKET_SECTION_CLS} ${TICKET_ROW_CLS}`}>
                <div>
                  <span className={TICKET_SECTION_LABEL_CLS}>
                    {t("ticket_device_count")}
                  </span>
                  <div className={TICKET_QTY_CLS}>
                    <button
                      type="button"
                      className={TICKET_QTY_BTN_CLS}
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="−"
                    >
                      −
                    </button>
                    <span className={TICKET_QTY_VAL_CLS}>{qty}</span>
                    <button
                      type="button"
                      className={TICKET_QTY_BTN_CLS}
                      onClick={() => setQty((q) => Math.min(10, q + 1))}
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className={TICKET_TOTAL_WRAP_CLS}>
                  <span className={TICKET_SECTION_LABEL_CLS}>
                    {t("ticket_total_pay")}
                  </span>
                  <span className={TICKET_TOTAL_CLS}>{money(total)}</span>
                </div>
              </div>

              <div
                className={TICKET_SECTION_CLS}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  className={TICKET_SECTION_LABEL_CLS}
                  style={{ marginBottom: 0 }}
                >
                  {t("ticket_payment")}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {t("ticket_qpay_label")}
                </span>
              </div>

              <div className={TICKET_ALERT_CLS} hidden={!alert}>
                {alert}
              </div>

              <button
                type="button"
                className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS} ${TICKET_CHECKOUT_CLS}`}
                onClick={checkout}
                disabled={busy}
              >
                <span>{checkoutLabel}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <p className={TICKET_FINEPRINT_CLS}>{t("ticket_fineprint")}</p>
            </div>
          </div>
        ) : (
          <div className={TICKET_MODAL_SUCCESS_CLS}>
            <div className={TICKET_SUCCESS_ICON_CLS} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className={TICKET_SUCCESS_TITLE_CLS}>
              {t("ticket_success_title")}
            </h3>
            <p className={TICKET_SUCCESS_DESC_CLS}>
              <strong>{success.title}</strong>
              <br />
              {success.tierName} · {success.qty} {t("watch_devices")} ·{" "}
              {money(success.total)}
              <br />
              <small>{t("ticket_success_hint")}</small>
            </p>
            <div className={TICKET_SUCCESS_CODE_CLS}>
              {t("ticket_order_code")}
              <br />
              <strong>{success.code}</strong>
            </div>
            <div className={TICKET_SUCCESS_ACTIONS_CLS}>
              <button
                type="button"
                className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS}`}
                onClick={onClose}
              >
                {t("ticket_close")}
              </button>
              <button
                type="button"
                className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
                onClick={onWatchSuccess}
              >
                {t("watch_my_tickets")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
