import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TicketCreateResponse } from "@cs360/shared";
import { useAuth } from "../auth";
import { api, type VODEventDetail } from "../lib/api";
import {
  WATCH_BTN_CLS,
  WATCH_BTN_PRIMARY_CLS,
} from "../pages/_watchStyles";

const dateFmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const moneyFmt = (n: number) =>
  new Intl.NumberFormat("mn-MN").format(Math.round(n)) + "₮";

type ReplayPaywallProps = {
  event: VODEventDetail;
  onPaid: () => void;
};

export default function ReplayPaywall({ event, onPaid }: ReplayPaywallProps) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const [invoice, setInvoice] = useState<TicketCreateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const startCheckout = useCallback(async () => {
    if (!session) {
      const next = encodeURIComponent(`/watch/${event.id}/vod`);
      window.location.href = `/login?next=${next}`;
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api.buyReplay(event.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInvoice(res.data);
  }, [event.id, session]);

  useEffect(() => {
    if (!invoice || paid) return;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      const res = await api.getPaymentStatus(invoice.invoice_id);
      if (!alive) return;
      if (res.ok && res.data.status === "paid") {
        setPaid(true);
        onPaidRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [invoice, paid]);

  return (
    <div className="max-w-[760px] mx-auto px-4 pt-6 pb-16">
      <div className="rounded-3xl overflow-hidden bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="relative w-full aspect-[16/9] bg-[#0b1929]">
          {event.thumbnail_url ? (
            <img
              src={event.thumbnail_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(11,15,26,0.85)_100%)]"
          />
          <div className="absolute left-5 right-5 bottom-5">
            <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[rgba(34,48,198,0.85)] text-white text-[10.5px] font-bold uppercase tracking-[.14em]">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              VOD
            </span>
            <h1 className="text-white text-[26px] font-extrabold leading-[1.15] m-0 mt-2 max-[540px]:text-[20px]">
              {event.name}
            </h1>
            <p className="text-[rgba(255,255,255,0.7)] text-[13px] m-0 mt-1 font-semibold">
              {dateFmt(event.date)}
            </p>
          </div>
        </div>

        <div className="p-6 max-[540px]:p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-white text-[20px] font-bold m-0 leading-[1.25]">
              {t("vod_buy_title")}
            </h2>
            <p className="mt-2 text-[rgba(255,255,255,0.65)] text-[14px] leading-[1.55] m-0">
              {t("vod_buy_desc")}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 py-3 border-y border-solid border-[rgba(255,255,255,0.08)]">
            <span className="text-[rgba(255,255,255,0.55)] text-[12.5px] font-bold uppercase tracking-[.14em]">
              {t("vod_buy_title")}
            </span>
            <span className="text-white text-[22px] font-extrabold tabular-nums">
              {moneyFmt(event.replay_price)}
            </span>
          </div>

          {error && (
            <div className="rounded-[10px] bg-[rgba(229,57,53,0.12)] border border-solid border-[rgba(229,57,53,0.45)] text-[#fecaca] text-[13px] py-2.5 px-3.5">
              {error}
            </div>
          )}

          {!invoice && !paid && (
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy}
              className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS} justify-center w-full text-[14.5px] py-3.5`}
            >
              {busy ? t("vod_qr_waiting") : t("vod_buy_cta")}
            </button>
          )}

          {invoice && !paid && (
            <div className="flex flex-col items-center gap-4 pt-2">
              {invoice.qr_image && (
                <img
                  src={
                    invoice.qr_image.startsWith("data:")
                      ? invoice.qr_image
                      : `data:image/png;base64,${invoice.qr_image}`
                  }
                  alt="QPay QR"
                  className="w-[200px] h-[200px] rounded-[14px] bg-white p-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
                />
              )}
              <p className="text-[rgba(255,255,255,0.6)] text-[13px] m-0 text-center max-w-[360px] leading-[1.5]">
                {t("vod_qr_help")}
              </p>
              <div className="flex items-center gap-2 text-[rgba(255,255,255,0.5)] text-[12px] font-semibold">
                <span
                  className="inline-block w-2 h-2 rounded-full bg-amber-400"
                  style={{
                    boxShadow: "0 0 0 4px rgba(245,158,11,0.18)",
                    animation: "vod-pulse 1.5s ease-in-out infinite",
                  }}
                  aria-hidden="true"
                />
                {t("vod_qr_waiting")}
              </div>
              {invoice.urls.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  {invoice.urls.map((u) => (
                    <a
                      key={u.link}
                      href={u.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 py-2 px-3 rounded-[10px] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.12)] text-white text-[12.5px] font-semibold no-underline hover:bg-[rgba(255,255,255,0.12)]"
                    >
                      {u.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {paid && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="w-14 h-14 rounded-full bg-[rgba(34,197,94,0.18)] grid place-items-center text-emerald-400"
                aria-hidden="true"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-white text-[15px] font-bold m-0 text-center">
                {t("vod_purchase_success")}
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes vod-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>
      <span className="sr-only">{i18n.language}</span>
    </div>
  );
}
