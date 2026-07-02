import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "../../auth";
import { listEvents } from "../../data/store";
import type { EventRecord } from "../../data/store";
import { ViewerOverlay } from "../watch/sections/ViewerOverlay";
import { FEATURED_FALLBACK } from "../watch/constants";
import type { TicketModalEvent } from "../watch/types";

function toTicketEvent(ev: EventRecord): TicketModalEvent {
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
}

export default function WatchLive() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const session = useRequireAuth();
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    listEvents()
      .then((evts) => {
        if (alive) setEvents(evts);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [retryKey]);

  const event = useMemo<TicketModalEvent | null>(() => {
    if (!events) return null;
    if (eventId) {
      const found = events.find((e) => e.id === eventId);
      if (found) return toTicketEvent(found);
    }
    return FEATURED_FALLBACK;
  }, [events, eventId]);

  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    const prevOverflow = document.body.style.overflow;
    document.body.style.backgroundColor = "#05080F";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.backgroundColor = prevBg;
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (loadFailed) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#05080F] px-5">
        <div className="text-center max-w-[420px]">
          <p className="text-[rgba(255,255,255,0.6)] text-[14px] leading-[1.6] m-0 mb-5">
            {t("watch_load_error")}
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((n) => n + 1)}
            className="inline-flex items-center gap-2 py-[10px] px-4 rounded-[10px] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.12)] text-white text-[13px] font-bold cursor-pointer hover:bg-[rgba(255,255,255,0.12)]"
          >
            {t("ticket_retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!session || !event) return null;

  return (
    <ViewerOverlay
      session={session}
      featuredEvent={event}
      onClose={() => navigate("/watch")}
    />
  );
}
