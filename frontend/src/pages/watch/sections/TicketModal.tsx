import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import type { TicketCreateResponse } from "@cs360/shared";
import type { Session } from "../../../auth";
import { api } from "../../../lib/api";
import type { OrderRecord } from "../../../data/store";
import { formatRemaining, money } from "../utils";
import type { TicketModalEvent } from "../types";
import {
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
  TICKET_ROW_CLS,
  TICKET_SECTION_CLS,
  TICKET_SECTION_LABEL_CLS,
  TICKET_SUCCESS_ACTIONS_CLS,
  TICKET_SUCCESS_CODE_CLS,
  TICKET_SUCCESS_DESC_CLS,
  TICKET_SUCCESS_ICON_CLS,
  TICKET_SUCCESS_TITLE_CLS,
  TICKET_TOTAL_CLS,
  TICKET_TOTAL_WRAP_CLS,
  WATCH_BTN_CLS,
  WATCH_BTN_GHOST_CLS,
  WATCH_BTN_PRIMARY_CLS,
} from "../../_watchStyles";

type TicketModalProps = {
  event: TicketModalEvent;
  session: Session;
  onClose: () => void;
  onPurchased: () => void;
  onWatchSuccess: () => void;
};

export function TicketModal({
  event,
  session,
  onClose,
  onPurchased,
  onWatchSuccess,
}: TicketModalProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState("");
  const [checkoutLabel, setCheckoutLabel] = useState<string>(
    t("ticket_purchase"),
  );
  const [step, setStep] = useState<"form" | "qr" | "success">("form");
  const [invoice, setInvoice] = useState<TicketCreateResponse | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [success, setSuccess] = useState<OrderRecord | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false,
  );

  const total = event.base;
  const QR_TTL_MS = 10 * 60 * 1000;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const issueInvoice = useCallback(async (): Promise<boolean> => {
    const res = await api.createTicket({ event_id: event.id });
    if (!res.ok) {
      console.error("[checkout] createTicket failed", res);
      setAlert(`${t("ticket_error")} (${res.error})`);
      return false;
    }
    setInvoice(res.data);
    setQrExpiresAt(Date.now() + QR_TTL_MS);
    return true;
  }, [event.id, t, QR_TTL_MS]);

  const checkout = async () => {
    setAlert("");
    setBusy(true);
    setCheckoutLabel(t("ticket_redirecting"));
    const ok = await issueInvoice();
    if (!ok) {
      setBusy(false);
      setCheckoutLabel(t("ticket_retry"));
      return;
    }
    setStep("qr");
    setBusy(false);
    setCheckoutLabel(t("ticket_purchase"));
  };

  const checkPayment = useCallback(async (): Promise<boolean> => {
    if (!invoice) return false;
    const r = await api.getPaymentStatus(invoice.invoice_id);
    if (r.ok && r.data.status === "paid") {
      const order: OrderRecord = {
        code: invoice.ticket_id.slice(0, 8).toUpperCase(),
        user: session.identifier || "",
        eventId: event.id,
        title: event.title,
        date: event.date,
        image: event.image,
        tier: "standard",
        tierName: "",
        qty: 1,
        unitPrice: invoice.price,
        total: invoice.price,
        payment: "qpay",
        paymentName: "QPay",
        purchasedAt: r.data.paid_at ?? new Date().toISOString(),
        status: "paid",
      };
      onPurchased();
      setSuccess(order);
      setStep("success");
      return true;
    }
    return false;
  }, [invoice, event, session, onPurchased]);

  useEffect(() => {
    if (step !== "qr" || !invoice) return;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await checkPayment();
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [step, invoice, checkPayment]);

  useEffect(() => {
    if (step !== "qr") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "qr" || !qrExpiresAt) return;
    if (now < qrExpiresAt) return;
    void issueInvoice();
  }, [now, qrExpiresAt, step, issueInvoice]);

  const onBackdrop = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (step === "qr") return;
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

        {step === "form" ? (
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
              <div className={`${TICKET_SECTION_CLS} ${TICKET_ROW_CLS}`}>
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
        ) : step === "qr" && invoice ? (
          <div className={TICKET_MODAL_SUCCESS_CLS}>
            <h3 className={TICKET_SUCCESS_TITLE_CLS}>{t("ticket_qr_title")}</h3>
            <p className={TICKET_SUCCESS_DESC_CLS}>
              <strong>{event.title}</strong>
              <br />
              {money(invoice.price)}
            </p>
            {invoice.qr_image && (
              <img
                src={
                  invoice.qr_image.startsWith("data:")
                    ? invoice.qr_image
                    : `data:image/png;base64,${invoice.qr_image}`
                }
                alt="QPay QR"
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 12,
                  background: "#fff",
                  padding: 8,
                  margin: "8px auto",
                  display: "block",
                }}
              />
            )}
            {isMobile && (
              <p className={TICKET_SUCCESS_DESC_CLS}>
                <small>{t("ticket_qr_hint")}</small>
              </p>
            )}
            <div
              style={{
                display: isMobile ? "flex" : "none",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              {invoice.urls.map((u) => (
                <a
                  key={u.link}
                  href={u.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS}`}
                  style={{ minWidth: "auto" }}
                >
                  {u.logo && (
                    <img
                      src={u.logo}
                      alt=""
                      style={{ width: 18, height: 18, marginRight: 6 }}
                    />
                  )}
                  {u.name}
                </a>
              ))}
            </div>
            <p className={TICKET_SUCCESS_DESC_CLS} style={{ marginTop: 12 }}>
              <small>
                ⏳ {t("ticket_qr_waiting")}
                {qrExpiresAt &&
                  ` · ${formatRemaining(Math.max(0, qrExpiresAt - now))} ${t("ticket_qr_expires_in")}`}
              </small>
            </p>
            <div className={TICKET_SUCCESS_ACTIONS_CLS}>
              <button
                type="button"
                className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
                onClick={() => {
                  void checkPayment();
                }}
              >
                {t("ticket_qr_check_now")}
              </button>
            </div>
          </div>
        ) : success ? (
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
        ) : null}
      </div>
    </div>
  );
}
