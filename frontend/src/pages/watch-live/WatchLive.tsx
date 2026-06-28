import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const { eventId } = useParams<{ eventId: string }>();
  const session = useRequireAuth();
  const [events, setEvents] = useState<EventRecord[] | null>(null);

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

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

  if (!session || !event) return null;

  return (
    <ViewerOverlay
      session={session}
      featuredEvent={event}
      onClose={() => navigate("/watch")}
    />
  );
}
