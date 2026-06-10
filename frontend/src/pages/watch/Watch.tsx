import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { ViewerOverlay } from "./sections/ViewerOverlay";
import { TicketModal } from "./sections/TicketModal";

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

        <UpcomingSection events={events} myTickets={myTickets} />

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
