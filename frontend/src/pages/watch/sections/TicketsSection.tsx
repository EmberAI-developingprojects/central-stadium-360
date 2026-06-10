import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { EventRecord, OrderRecord } from "../../../data/store";
import { useCountdown } from "../hooks/useCountdown";
import { useStreamLive } from "../hooks/useStreamLive";
import { money, pad2 } from "../utils";
import {
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
  TICKETS_EMPTY_CLS,
  TICKETS_EMPTY_ICON_CLS,
  TICKETS_LIST_CLS,
  WATCH_BTN_CLS,
  WATCH_BTN_GHOST_CLS,
  WATCH_BTN_PRIMARY_CLS,
  WATCH_EYEBROW_CLS,
  WATCH_SECTION_CLS,
  WATCH_SECTION_HEAD_CLS,
  WATCH_TITLE_CLS,
} from "../../_watchStyles";

type TicketsSectionProps = {
  tickets: OrderRecord[];
  events: EventRecord[];
  onWatch: () => void;
};

type TicketCardProps = {
  ticket: OrderRecord;
  startTime: string | undefined;
  liveEndAt: string | null | undefined;
  onWatch: () => void;
};

function TicketCard({ ticket: tk, startTime, liveEndAt, onWatch }: TicketCardProps) {
  const { t } = useTranslation();
  const { isLive, hasTime, days, hours, minutes, seconds } =
    useCountdown(startTime);
  const inLiveWindow = (() => {
    if (!isLive) return false;
    if (!liveEndAt) return true;
    const end = new Date(liveEndAt).getTime();
    if (Number.isNaN(end)) return true;
    return Date.now() < end;
  })();
  const { streamLive, streamChecked } = useStreamLive(inLiveWindow);
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
          {inLiveWindow && streamLive && (
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
          {inLiveWindow && streamChecked && !streamLive && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.4)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-live-blink flex-none"
                aria-hidden="true"
              />
              {t("watch_waiting_stream")}
            </span>
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
                {days > 0 ? `${days} ${t("watch_day_short")} ` : ""}
                {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function TicketsSection({
  tickets,
  events,
  onWatch,
}: TicketsSectionProps) {
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
                liveEndAt={ev?.live_end_at}
                onWatch={onWatch}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
