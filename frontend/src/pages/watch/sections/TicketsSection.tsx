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
  TICKET_STUB_TITLE_CLS,
  TICKETS_EMPTY_CLS,
  TICKETS_EMPTY_ICON_CLS,
  TICKETS_LIST_CLS,
  WATCH_BTN_CLS,
  WATCH_BTN_GHOST_CLS,
  WATCH_BTN_PRIMARY_CLS,
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
  replayAvailableUntil: string | null | undefined;
  onWatch: () => void;
};

const LIVE_FALLBACK_MS = 3 * 60 * 60 * 1000;
const REPLAY_FALLBACK_DAYS = 30;
type TicketKind = "live" | "replay" | "expired";

function resolveKind(
  startTime: string | undefined,
  liveEndAt: string | null | undefined,
  replayUntil: string | null | undefined,
): TicketKind {
  const now = Date.now();
  const startMs = startTime ? new Date(startTime).getTime() : NaN;

  let endMs = NaN;
  if (liveEndAt) {
    const v = new Date(liveEndAt).getTime();
    if (!Number.isNaN(v)) endMs = v;
  }
  if (Number.isNaN(endMs) && !Number.isNaN(startMs)) {
    endMs = startMs + LIVE_FALLBACK_MS;
  }

  if (Number.isNaN(endMs) || now < endMs) return "live";

  let replayUntilMs = NaN;
  if (replayUntil) {
    const v = new Date(replayUntil).getTime();
    if (!Number.isNaN(v)) replayUntilMs = v;
  }
  if (Number.isNaN(replayUntilMs)) {
    replayUntilMs = endMs + REPLAY_FALLBACK_DAYS * 24 * 60 * 60 * 1000;
  }

  if (now <= replayUntilMs) return "replay";
  return "expired";
}

function fmtDateMn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function TicketCard({
  ticket: tk,
  startTime,
  liveEndAt,
  replayAvailableUntil,
  onWatch,
}: TicketCardProps) {
  const { t } = useTranslation();
  const { isLive, hasTime, days, hours, minutes, seconds } =
    useCountdown(startTime);
  const kind = resolveKind(startTime, liveEndAt, replayAvailableUntil);
  const inLiveWindow = isLive && kind === "live";
  const { streamLive, streamChecked } = useStreamLive(inLiveWindow);
  return (
    <article className={TICKET_STUB_CLS} data-code={tk.code}>
      <div className={TICKET_STUB_COVER_CLS}>
        {tk.image ? (
          <img
            src={tk.image}
            alt={tk.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 [background:radial-gradient(120%_120%_at_30%_20%,rgba(34,48,198,0.35)_0%,rgba(15,18,40,0.85)_55%,#0b0f1a_100%)] flex items-center justify-center text-white/25"
          >
            <svg
              viewBox="0 0 24 24"
              width="44"
              height="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
              <line x1="13" y1="5" x2="13" y2="7" />
              <line x1="13" y1="11" x2="13" y2="13" />
              <line x1="13" y1="17" x2="13" y2="19" />
            </svg>
          </div>
        )}
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
          {tk.accessExpiresAt && (
            <div>
              <dt className={TICKET_STUB_META_DT_CLS}>
                {t("ticket_card_access_label")}
              </dt>
              <dd
                className={TICKET_STUB_META_DD_CLS}
                style={
                  new Date(tk.accessExpiresAt).getTime() <= Date.now()
                    ? { color: "rgba(255,255,255,0.45)" }
                    : undefined
                }
              >
                {new Date(tk.accessExpiresAt).getTime() <= Date.now()
                  ? t("ticket_card_access_expired", {
                      date: fmtDateMn(tk.accessExpiresAt),
                    })
                  : t("ticket_card_access_until", {
                      date: fmtDateMn(tk.accessExpiresAt),
                    })}
              </dd>
            </div>
          )}
        </dl>
        <div className={TICKET_STUB_BARCODE_CLS} aria-hidden="true"></div>
        <div className={TICKET_STUB_ACTIONS_CLS}>
          <Link
            to={`/orders/${tk.code}`}
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
          {kind === "replay" && (
            <Link
              to={`/watch/${tk.eventId}/vod`}
              className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS} ${TICKET_STUB_BTN_CLS}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-white flex-none"
                aria-hidden="true"
              />
              {t("ticket_card_watch_replay")}
            </Link>
          )}
          {kind === "expired" && (
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
                className="w-1.5 h-1.5 rounded-full bg-white/30 flex-none"
                aria-hidden="true"
              />
              {t("watch_replay_expired")}
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
    <section className="w-full" id="tickets">
      <div className={WATCH_SECTION_HEAD_CLS}>
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
                replayAvailableUntil={ev?.replay_available_until}
                onWatch={onWatch}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
