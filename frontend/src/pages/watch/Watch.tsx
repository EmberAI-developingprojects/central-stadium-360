import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "../../auth";
import UserMenu from "../../components/UserMenu";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { listEvents, listMyOrders } from "../../data/store";
import type { EventRecord, OrderRecord } from "../../data/store";
import {
  WATCH_HEADER_CLS,
  WATCH_LOGO_CLS,
  WATCH_MAIN_CLS,
  WATCH_PAGE_BG,
  WATCH_PAGE_CLS,
  WATCH_TAB_ACTIVE_CLS,
  WATCH_TAB_CLS,
  WATCH_TAB_COUNT_CLS,
  WATCH_TABS_CLS,
  WATCH_USER_CLS,
} from "../_watchStyles";
import { FEATURED_FALLBACK } from "./constants";
import { isTabId } from "./utils";
import type { TabId, TicketModalEvent } from "./types";
import { LiveSection } from "./sections/LiveSection";
import { UpcomingSection } from "./sections/UpcomingSection";
import { TicketsSection } from "./sections/TicketsSection";
import { TicketModal } from "./sections/TicketModal";

export default function Watch() {
  const { t } = useTranslation();
  const session = useRequireAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const hashId = location.hash.slice(1);
  const initialTab: TabId = isTabId(hashId) ? hashId : "live";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [tickets, setTickets] = useState<OrderRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [modalEvent, setModalEvent] = useState<TicketModalEvent | null>(null);

  const refreshTickets = useCallback(() => {
    listMyOrders().then((all) =>
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
    const startMs = (e: EventRecord) =>
      new Date(e.live_start_at ?? e.start_time).getTime();
    const endMs = (e: EventRecord) =>
      e.live_end_at ? new Date(e.live_end_at).getTime() : null;

    const live = events
      .filter((e) => {
        const en = endMs(e);
        if (en === null) return false;
        const s = startMs(e);
        return s <= now && en >= now;
      })
      .sort((a, b) => startMs(b) - startMs(a));
    const upcoming = events
      .filter((e) => startMs(e) > now)
      .sort((a, b) => startMs(a) - startMs(b));
    const past = events
      .filter((e) => startMs(e) <= now)
      .sort((a, b) => startMs(b) - startMs(a));

    const ev = live[0] ?? upcoming[0] ?? past[0];
    if (!ev) return FEATURED_FALLBACK;
    return {
      id: ev.id,
      title: ev.title,
      titleEn: ev.titleEn,
      descEn: ev.descEn,
      date: ev.date,
      image: ev.image,
      base: ev.base,
      start_time: ev.start_time,
      desc: ev.desc,
      live_price: ev.live_price,
      replay_price: ev.replay_price,
      live_end_at: ev.live_end_at,
      replay_available_until: ev.replay_available_until,
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

  const openViewer = useCallback(
    (id?: string) => {
      const targetId = id ?? featuredEvent.id;
      navigate(`/watch/live/${targetId}`);
    },
    [navigate, featuredEvent.id],
  );

  const goSection = useCallback((id: TabId) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalEvent ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalEvent]);

  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#0B0F1A";
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

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

        <UpcomingSection events={events} myTickets={myTickets} />

        <TicketsSection
          tickets={myTickets}
          events={events}
          onWatch={openViewer}
        />
      </main>

      {modalEvent && (
        <TicketModal
          event={modalEvent}
          session={session}
          onClose={closeTicketModal}
          onPurchased={async () => {
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
