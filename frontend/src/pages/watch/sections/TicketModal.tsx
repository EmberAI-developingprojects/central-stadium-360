import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import type { TicketCreateResponse, TicketTier } from "@cs360/shared";
import { TICKET_TIERS, TICKET_TIER_ORDER, eventTierPrice } from "@cs360/shared";
import type { Session } from "../../../auth";
import { api } from "../../../lib/api";
import { getMyOrder, type OrderRecord } from "../../../data/store";
import { EbarimtQR } from "../../../components/EbarimtQR";
import { formatRemaining, money } from "../utils";
import type { TicketModalEvent } from "../types";
import { pickEventLocale } from "../../../lib/eventLocale";
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
  const { t, i18n } = useTranslation();
  const loc = pickEventLocale(event, i18n.language);
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

  const {
    kind,
    price: total,
    ctaLabel,
  } = useMemo(() => resolveTicketKind(event, t), [event, t]);

  // Tier selection (live purchases only). Replay stays on its legacy flow.
  const [tier, setTier] = useState<TicketTier>("standard");
  // Optional buyer company TIN → B2B e-barimt (empty = personal / B2C).
  const [companyTin, setCompanyTin] = useState("");
  const useTiers = kind === "live";
  // Displayed/charged amount: per-event tier price (falls back to the catalog)
  // for live, legacy price otherwise.
  const payTotal = useTiers ? eventTierPrice(event, tier) : total;
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
    if (kind === "expired") return false;
    const res = await api.createTicket({
      event_id: event.id,
      ...(useTiers ? { tier } : { ticket_type: kind }),
      ...(companyTin.trim() ? { ebarimt_tin: companyTin.trim() } : {}),
    });
    if (!res.ok) {
      setAlert(`${t("ticket_error")} (${res.error})`);
      return false;
    }
    setInvoice(res.data);
    setQrExpiresAt(Date.now() + QR_TTL_MS);
    return true;
  }, [event.id, kind, useTiers, tier, companyTin, t, QR_TTL_MS]);

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
        tier: useTiers ? tier : "standard",
        tierName: useTiers ? t(`ticket_tier_${tier}`) : "",
        qty: useTiers ? TICKET_TIERS[tier].maxDevices : 1,
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
      // The e-barimt is issued best-effort during the paid transition, so it may
      // not be ready the instant the ticket flips to paid. Poll the paid ticket a
      // few times until the receipt (DDTD / lottery / QR) lands, then surface it.
      void (async () => {
        const ticketId = invoice.ticket_id;
        for (let i = 0; i < 8; i++) {
          const full = await getMyOrder(ticketId);
          if (full?.ebarimtId || full?.ebarimtLottery || full?.ebarimtQrData) {
            setSuccess((prev) =>
              prev
                ? {
                    ...prev,
                    ebarimtId: full.ebarimtId,
                    ebarimtLottery: full.ebarimtLottery,
                    ebarimtQrData: full.ebarimtQrData,
                  }
                : prev,
            );
            return;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      })();
      return true;
    }
    return false;
  }, [invoice, event, session, onPurchased, useTiers, tier, t]);

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
              <img src={event.image} alt={loc.title} />
              <div className={TICKET_MODAL_COVER_META_CLS}>
                <span className={TICKET_MODAL_DATE_CLS}>{event.date}</span>
                <h2 id="ticketModalTitle" className={TICKET_MODAL_TITLE_CLS}>
                  {loc.title}
                </h2>
                <span className={TICKET_MODAL_VENUE_CLS}>
                  📡 {t("watch_online_stream")}
                </span>
              </div>
            </div>

            <div className={TICKET_MODAL_FORM_CLS}>
              {kind === "expired" ? (
                <>
                  <div className={`${TICKET_SECTION_CLS}`}>
                    <span
                      className={TICKET_SECTION_LABEL_CLS}
                      style={{ marginBottom: 6 }}
                    >
                      {ctaLabel}
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "rgba(255,255,255,0.65)",
                        margin: 0,
                      }}
                    >
                      {t("ticket_replay_expired_note")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS} ${TICKET_CHECKOUT_CLS}`}
                    onClick={onClose}
                  >
                    <span>{t("ticket_close")}</span>
                  </button>
                </>
              ) : (
                <>
                  {kind === "replay" && (
                    <div
                      style={{
                        background: "rgba(34,48,198,0.10)",
                        border: "1px solid rgba(34,48,198,0.30)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: "rgba(255,255,255,0.78)",
                      }}
                    >
                      {t("vod_replay_modal_blurb")}
                    </div>
                  )}

                  {useTiers && (
                    <div
                      className={TICKET_SECTION_CLS}
                      role="radiogroup"
                      aria-label={t("ticket_tier_choose")}
                      style={{ display: "grid", gap: 8 }}
                    >
                      <span className={TICKET_SECTION_LABEL_CLS}>
                        {t("ticket_tier_choose")}
                      </span>
                      {TICKET_TIER_ORDER.map((tid) => {
                        const spec = TICKET_TIERS[tid];
                        const selected = tier === tid;
                        return (
                          <button
                            key={tid}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setTier(tid)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "12px 14px",
                              borderRadius: 12,
                              cursor: "pointer",
                              textAlign: "left",
                              background: selected
                                ? "rgba(34,48,198,0.16)"
                                : "rgba(255,255,255,0.04)",
                              border: `1px solid ${
                                selected
                                  ? "rgba(34,48,198,0.65)"
                                  : "rgba(255,255,255,0.10)"
                              }`,
                              color: "rgba(255,255,255,0.9)",
                            }}
                          >
                            <span
                              style={{ display: "grid", gap: 2, minWidth: 0 }}
                            >
                              <span style={{ fontWeight: 700, fontSize: 14 }}>
                                {t(`ticket_tier_${tid}`)}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.6)",
                                }}
                              >
                                {t("ticket_tier_devices", {
                                  count: spec.maxDevices,
                                })}
                                {spec.replay
                                  ? ` · ${t("ticket_tier_replay_incl")}`
                                  : ""}
                              </span>
                            </span>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>
                              {money(eventTierPrice(event, tid))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={`${TICKET_SECTION_CLS} ${TICKET_ROW_CLS}`}>
                    <div className={TICKET_TOTAL_WRAP_CLS}>
                      <span className={TICKET_SECTION_LABEL_CLS}>
                        {kind === "replay"
                          ? t("ticket_replay_price_label")
                          : t("ticket_total_pay")}
                      </span>
                      <span className={TICKET_TOTAL_CLS}>{money(payTotal)}</span>
                    </div>
                  </div>

                  <div
                    className={TICKET_SECTION_CLS}
                    style={{ display: "grid", gap: 6 }}
                  >
                    <span className={TICKET_SECTION_LABEL_CLS}>
                      {t("ticket_company_tin_label")}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={companyTin}
                      onChange={(e) =>
                        setCompanyTin(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={14}
                      placeholder={t("ticket_company_tin_placeholder")}
                      aria-label={t("ticket_company_tin_label")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.92)",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
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
                    disabled={busy || payTotal <= 0}
                  >
                    <span>
                      {checkoutLabel === t("ticket_purchase")
                        ? ctaLabel
                        : checkoutLabel}
                    </span>
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
                  <p className={TICKET_FINEPRINT_CLS}>
                    {t("ticket_fineprint")}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : step === "qr" && invoice ? (
          <div className={TICKET_MODAL_SUCCESS_CLS}>
            <h3 className={TICKET_SUCCESS_TITLE_CLS}>{t("ticket_qr_title")}</h3>
            <p className={TICKET_SUCCESS_DESC_CLS}>
              <strong>{loc.title}</strong>
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
            <div className="mx-auto mt-3 w-full max-w-[320px] rounded-xl bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.10)] p-4 text-left">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.55)]">
                {t("order_payment_title")}
              </div>
              <dl className="flex flex-col gap-1.5 m-0 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-3">
                <div>
                  <dt className="text-[rgba(255,255,255,0.6)]">
                    {t("order_vat")}
                  </dt>
                  <dd className="m-0 font-semibold text-[rgba(255,255,255,0.9)] tabular-nums">
                    {money(Math.round(success.total / 11))}
                  </dd>
                </div>
                <div>
                  <dt className="text-white font-bold">
                    {t("order_total_paid")}
                  </dt>
                  <dd className="m-0 font-bold text-white tabular-nums">
                    {money(success.total)}
                  </dd>
                </div>
                {success.ebarimtId && (
                  <div className="mt-1 pt-2 border-t border-dashed border-[rgba(255,255,255,0.10)]">
                    <dt className="text-[rgba(255,255,255,0.6)] shrink-0">
                      {t("order_ebarimt_ddtd")}
                    </dt>
                    <dd className="m-0 font-mono text-[11px] font-semibold text-[rgba(255,255,255,0.85)] break-all text-right">
                      {success.ebarimtId}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            {success.ebarimtQrData ? (
              <div className="mt-3 flex justify-center">
                <EbarimtQR
                  value={success.ebarimtQrData}
                  lottery={success.ebarimtLottery}
                />
              </div>
            ) : (
              <p className={TICKET_SUCCESS_DESC_CLS} style={{ marginTop: 10 }}>
                <small>⏳ {t("ticket_ebarimt_issuing")}</small>
              </p>
            )}
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

type TicketKind = "live" | "replay" | "expired";

const REPLAY_FALLBACK_DAYS = 30;
const LIVE_FALLBACK_MS = 3 * 60 * 60 * 1000;

function resolveTicketKind(
  event: TicketModalEvent,
  t: (k: string) => string,
): { kind: TicketKind; price: number; ctaLabel: string } {
  const now = Date.now();
  const startMs = event.start_time ? new Date(event.start_time).getTime() : NaN;

  let endMs = NaN;
  if (event.live_end_at) {
    const v = new Date(event.live_end_at).getTime();
    if (!Number.isNaN(v)) endMs = v;
  }
  if (Number.isNaN(endMs) && !Number.isNaN(startMs)) {
    endMs = startMs + LIVE_FALLBACK_MS;
  }

  let replayUntilMs = NaN;
  if (event.replay_available_until) {
    const v = new Date(event.replay_available_until).getTime();
    if (!Number.isNaN(v)) replayUntilMs = v;
  }
  if (Number.isNaN(replayUntilMs) && !Number.isNaN(endMs)) {
    replayUntilMs = endMs + REPLAY_FALLBACK_DAYS * 24 * 60 * 60 * 1000;
  }

  const liveActive = Number.isNaN(endMs) ? true : now < endMs;

  if (liveActive) {
    const price = Number(event.live_price ?? 0) || event.base || 0;
    return { kind: "live", price, ctaLabel: t("ticket_purchase") };
  }

  if (!Number.isNaN(replayUntilMs) && now <= replayUntilMs) {
    const price = Number(event.replay_price ?? 0);
    return {
      kind: "replay",
      price,
      ctaLabel: t("watch_replay_buy_cta"),
    };
  }

  return {
    kind: "expired",
    price: 0,
    ctaLabel: t("watch_replay_expired"),
  };
}
