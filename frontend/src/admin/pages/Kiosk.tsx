import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AdminVenueOrderDetail,
  AdminVenueOrderRow,
  AdminVenueStats,
  KioskEbarimt,
  KioskEvent,
  KioskTicketOut,
  KioskZone,
  PaymentMethod,
  TicketStatus,
} from "@cs360/shared";
import { api } from "../../lib/api";
import { useToast } from "../components/Toast";
import {
  ADMIN_BADGE_CANCELLED_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BADGE_REFUNDED_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
  ADMIN_TABS_CLS,
} from "../_adminStyles";

type TabId = "sell" | "sales";

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

function qrSrc(qr?: string): string {
  if (!qr) return "";
  return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
}

function formatDateTime(iso: string | null | undefined): {
  primary: string;
  secondary: string;
} {
  if (!iso) return { primary: "—", secondary: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { primary: iso.slice(0, 10), secondary: "" };
  return {
    primary: d.toLocaleDateString("mn-MN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
    secondary: d.toLocaleTimeString("mn-MN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export default function Kiosk() {
  const [tab, setTab] = useState<TabId>("sell");
  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Касс — биечлэн тасалбар</h2>
          <p>
            Ажилтан газар дээр нь тасалбар зарж, QR/дижитал тасалбар үүсгэнэ.
            Борлуулалтын түүхийг доороос харна.
          </p>
        </div>
      </div>

      <div className={ADMIN_TABS_CLS}>
        <button
          type="button"
          className={tab === "sell" ? "is-active" : undefined}
          onClick={() => setTab("sell")}
        >
          Тасалбар зарах
        </button>
        <button
          type="button"
          className={tab === "sales" ? "is-active" : undefined}
          onClick={() => setTab("sales")}
        >
          Борлуулалт
        </button>
      </div>

      {tab === "sell" ? <SellPanel /> : <SalesPanel />}
    </>
  );
}

// ===========================================================================
// SELL — point of sale
// ===========================================================================

type Checkout = {
  orderId: string;
  method: PaymentMethod;
  qrImage?: string;
  total: number;
  eventTitle: string;
};

function SellPanel() {
  const toast = useToast();
  const [events, setEvents] = useState<KioskEvent[] | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("qpay");
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  const loadEvents = useCallback(() => {
    api.admin.kiosk.listEvents().then((res) => {
      const list = res.ok && Array.isArray(res.data) ? res.data : [];
      setEvents(list);
      setEventId((cur) => cur || list[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const event = useMemo(
    () => events?.find((e) => e.id === eventId) ?? null,
    [events, eventId],
  );

  // Reset quantities when switching events.
  useEffect(() => {
    setQty({});
  }, [eventId]);

  const setZoneQty = (zone: KioskZone, next: number) => {
    const clamped = Math.max(0, Math.min(next, Math.min(zone.available, 20)));
    setQty((q) => ({ ...q, [zone.id]: clamped }));
  };

  const items = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, n]) => n > 0)
        .map(([zone_id, n]) => ({ zone_id, qty: n })),
    [qty],
  );

  const total = useMemo(() => {
    if (!event) return 0;
    return event.zones.reduce(
      (s, z) => s + (qty[z.id] || 0) * z.price,
      0,
    );
  }, [event, qty]);

  const ticketCount = items.reduce((s, i) => s + i.qty, 0);

  const sell = async () => {
    if (!event || items.length === 0) return;
    setSubmitting(true);
    const res = await api.admin.kiosk.createOrder({
      event_id: event.id,
      items,
      method,
      buyer_phone: phone.trim() || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(`Захиалга үүсгэж чадсангүй: ${res.error}`);
      return;
    }
    setCheckout({
      orderId: res.data.order_id,
      method,
      qrImage: res.data.qr_image,
      total: res.data.total,
      eventTitle: event.title,
    });
  };

  const onSettled = () => {
    // Refresh availability so the next sale sees updated counts.
    loadEvents();
  };

  const closeCheckout = (sold: boolean) => {
    setCheckout(null);
    if (sold) {
      setQty({});
      setPhone("");
    }
  };

  if (events === null) {
    return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;
  }

  if (events.length === 0) {
    return (
      <div className={ADMIN_EMPTY_CLS}>
        <strong>Зарах арга хэмжээ алга</strong>
        Зөвхөн удахгүй болох эсвэл шууд эфирт байгаа, бүс (zone) тохируулсан арга
        хэмжээ кассад харагдана. Арга хэмжээний засварлах хуудаснаас бүс нэмнэ үү.
      </div>
    );
  }

  return (
    <div className="grid gap-5 [grid-template-columns:1fr_360px] max-[1100px]:[grid-template-columns:1fr]">
      {/* Left: event + zones */}
      <div className="flex flex-col gap-4">
        <div className={ADMIN_FIELD_CLS}>
          <label>Арга хэмжээ</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
                {e.status === "live" ? " — Шууд" : ""}
              </option>
            ))}
          </select>
        </div>

        {event && event.zones.length === 0 && (
          <div className={ADMIN_EMPTY_CLS}>
            <strong>Бүс тохируулаагүй</strong>
            Энэ арга хэмжээнд биечлэн зарах бүс алга. «Арга хэмжээ» →
            засварлах хуудаснаас бүс нэмнэ үү.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {event?.zones.map((z) => {
            const n = qty[z.id] || 0;
            const soldOut = z.available <= 0;
            return (
              <div
                key={z.id}
                className="flex items-center gap-3 rounded-xl border border-[#ececef] bg-white p-3.5"
              >
                <span
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{ background: z.color || "#2230C6" }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-900 truncate">
                    {z.name_mn}
                  </div>
                  <div className="text-[12px] text-zinc-500 mt-0.5 tabular-nums">
                    {money(z.price)} ·{" "}
                    {soldOut ? (
                      <span className="text-red-600">Дууссан</span>
                    ) : (
                      `${z.available} үлдсэн`
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stepper
                    value={n}
                    disabled={soldOut}
                    onDec={() => setZoneQty(z, n - 1)}
                    onInc={() => setZoneQty(z, n + 1)}
                  />
                </div>
                <div className="w-[92px] text-right tabular-nums font-semibold text-zinc-900">
                  {money(n * z.price)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: cart summary */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-[84px] self-start w-full">
        <div className="rounded-xl border border-[#ececef] bg-white p-5 flex flex-col gap-4">
          <h3 className="m-0 text-[13.5px] font-semibold text-zinc-900">
            Захиалга
          </h3>

          <div className="flex flex-col gap-2 text-[13px]">
            {items.length === 0 ? (
              <p className="text-zinc-500 m-0">
                Бүсээс тоо ширхэг сонгоно уу.
              </p>
            ) : (
              event?.zones
                .filter((z) => (qty[z.id] || 0) > 0)
                .map((z) => (
                  <div key={z.id} className="flex justify-between gap-2">
                    <span className="text-zinc-600 truncate">
                      {z.name_mn} × {qty[z.id]}
                    </span>
                    <span className="tabular-nums text-zinc-900 shrink-0">
                      {money((qty[z.id] || 0) * z.price)}
                    </span>
                  </div>
                ))
            )}
          </div>

          <div className="flex justify-between items-baseline border-t border-[#f4f4f5] pt-3">
            <span className="text-[12.5px] text-zinc-500">
              Нийт{ticketCount > 0 ? ` · ${ticketCount} тасалбар` : ""}
            </span>
            <span className="text-[20px] font-semibold tabular-nums text-zinc-900">
              {money(total)}
            </span>
          </div>

          <div className={ADMIN_FIELD_CLS}>
            <label>Утас (и-баримт — заавал биш)</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9911xxxx"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] text-zinc-700 font-medium">
              Төлбөрийн хэлбэр
            </span>
            <div className="inline-flex bg-white border border-[#e4e4e7] rounded-md p-0.5 gap-0.5">
              {(
                [
                  ["qpay", "QPay (QR)"],
                  ["card", "Карт / Бэлэн"],
                ] as Array<[PaymentMethod, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`flex-1 px-3 h-9 rounded text-[12.5px] font-medium transition-colors ${
                    method === key
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS} w-full !h-11`}
            disabled={submitting || items.length === 0}
            onClick={sell}
          >
            {submitting
              ? "Үүсгэж байна…"
              : method === "qpay"
                ? `QR гаргах · ${money(total)}`
                : `Төлбөр авах · ${money(total)}`}
          </button>
        </div>
      </aside>

      {checkout && (
        <CheckoutModal
          checkout={checkout}
          onSettled={onSettled}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}

function Stepper({
  value,
  disabled,
  onDec,
  onInc,
}: {
  value: number;
  disabled?: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  return (
    <div className="inline-flex items-center gap-1.5">
      <button type="button" className={btn} onClick={onDec} disabled={value <= 0} aria-label="Хасах">
        −
      </button>
      <span className="w-7 text-center tabular-nums font-semibold text-zinc-900">
        {value}
      </span>
      <button type="button" className={btn} onClick={onInc} disabled={disabled} aria-label="Нэмэх">
        +
      </button>
    </div>
  );
}

type CheckoutStep = "qr" | "processing" | "done" | "error";

function CheckoutModal({
  checkout,
  onSettled,
  onClose,
}: {
  checkout: Checkout;
  onSettled: () => void;
  onClose: (sold: boolean) => void;
}) {
  const { orderId, method, qrImage, total, eventTitle } = checkout;
  const [step, setStep] = useState<CheckoutStep>(
    method === "card" ? "processing" : "qr",
  );
  const [tickets, setTickets] = useState<KioskTicketOut[]>([]);
  const [ebarimt, setEbarimt] = useState<KioskEbarimt | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const settle = useCallback(
    (data: { tickets: KioskTicketOut[]; ebarimt: KioskEbarimt | null }) => {
      setTickets(data.tickets);
      setEbarimt(data.ebarimt);
      setStep("done");
      onSettled();
    },
    [onSettled],
  );

  // Card / cash: settle immediately at the counter.
  useEffect(() => {
    if (method !== "card") return;
    let alive = true;
    api.admin.kiosk.cardResult(orderId, { approved: true }).then((res) => {
      if (!alive) return;
      if (res.ok && res.data.status === "paid") {
        settle(res.data);
      } else {
        setError(res.ok ? "Төлбөр баталгаажсангүй." : res.error);
        setStep("error");
      }
    });
    return () => {
      alive = false;
    };
  }, [method, orderId, settle]);

  // QPay: poll for payment.
  useEffect(() => {
    if (method !== "qpay" || step !== "qr") return;
    let alive = true;
    const tick = async () => {
      const res = await api.admin.kiosk.orderStatus(orderId);
      if (!alive || !res.ok) return;
      if (res.data.status === "paid") {
        settle(res.data);
      } else if (res.data.status === "cancelled") {
        setError("Захиалга цуцлагдсан.");
        setStep("error");
      }
    };
    const iv = window.setInterval(tick, 3000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [method, step, orderId, settle]);

  const checkNow = async () => {
    setChecking(true);
    const res = await api.admin.kiosk.orderStatus(orderId);
    setChecking(false);
    if (res.ok && res.data.status === "paid") settle(res.data);
  };

  const sold = step === "done";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => onClose(sold)}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#f4f4f5]">
          <div className="min-w-0">
            <h3 className="m-0 text-[15px] font-semibold text-zinc-900 truncate">
              {step === "done" ? "Тасалбар бэлэн" : "Төлбөр"}
            </h3>
            <p className="m-0 mt-0.5 text-[12.5px] text-zinc-500 truncate">
              {eventTitle} · {money(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(sold)}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Хаах"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {step === "qr" && (
            <div className="flex flex-col items-center text-center gap-3">
              {qrImage ? (
                <img
                  src={qrSrc(qrImage)}
                  alt="QPay QR"
                  className="w-[220px] h-[220px] rounded-lg border border-[#ececef]"
                />
              ) : (
                <div className="w-[220px] h-[220px] grid place-items-center rounded-lg border border-dashed border-[#e4e4e7] text-[13px] text-zinc-500">
                  QR алга
                </div>
              )}
              <p className="text-[13px] text-zinc-600 m-0">
                Худалдан авагч QPay-р уншуулж төлнө. Төлбөр хийгдмэгц тасалбар
                автоматаар үүснэ.
              </p>
              <div className="flex items-center gap-2 text-[12.5px] text-zinc-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Төлбөр хүлээж байна…
              </div>
              <button
                type="button"
                className={`${ADMIN_BTN_CLS} w-full`}
                onClick={checkNow}
                disabled={checking}
              >
                {checking ? "Шалгаж байна…" : "Төлбөр шалгах"}
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="py-8 text-center text-[13.5px] text-zinc-500">
              Төлбөр баталгаажуулж байна…
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col gap-3">
              <div className="py-3 px-4 rounded-md border border-red-200 bg-red-50 text-red-800 text-[13px]">
                {error || "Алдаа гарлаа."}
              </div>
              <button
                type="button"
                className={`${ADMIN_BTN_CLS} w-full`}
                onClick={() => onClose(false)}
              >
                Хаах
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-emerald-700 text-[13.5px] font-medium">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                  ✓
                </span>
                Төлбөр амжилттай — {tickets.length} тасалбар үүслээ
              </div>
              <div className="flex flex-col gap-2">
                {tickets.map((t) => (
                  <div
                    key={t.code}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#ececef] bg-[#fafafa] px-3.5 py-2.5"
                  >
                    <span className="text-[12px] text-zinc-500">
                      {t.zone_name_mn}
                    </span>
                    <span className="font-mono text-[13px] font-semibold tracking-tight text-zinc-900">
                      {t.code}
                    </span>
                  </div>
                ))}
              </div>
              {ebarimt && (
                <div className="text-[12px] text-zinc-500">
                  И-баримт: сугалаа{" "}
                  <span className="font-mono text-zinc-700">
                    {ebarimt.lottery || "—"}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${ADMIN_BTN_CLS} flex-1`}
                  onClick={() => window.print()}
                >
                  Хэвлэх
                </button>
                <button
                  type="button"
                  className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS} flex-1`}
                  onClick={() => onClose(true)}
                >
                  Дуусгах
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// SALES — report
// ===========================================================================

const STATUS_LABEL: Record<string, string> = {
  paid: "Төлөгдсөн",
  pending: "Хүлээгдэж буй",
  cancelled: "Цуцлагдсан",
  refunded: "Буцаагдсан",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const cls =
    status === "paid"
      ? ADMIN_BADGE_PAID_CLS
      : status === "refunded"
        ? ADMIN_BADGE_REFUNDED_CLS
        : status === "cancelled"
          ? ADMIN_BADGE_REFUNDED_CLS
          : ADMIN_BADGE_CANCELLED_CLS;
  return (
    <span className={`${ADMIN_BADGE_CLS} ${cls}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

type StatusFilter = TicketStatus | "all";

function SalesPanel() {
  const [orders, setOrders] = useState<AdminVenueOrderRow[] | null>(null);
  const [stats, setStats] = useState<AdminVenueStats | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin.kiosk
      .listOrders({ status: status === "all" ? undefined : status })
      .then((res) =>
        setOrders(res.ok && Array.isArray(res.data) ? res.data : []),
      );
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.admin.kiosk.stats().then((res) => {
      if (res.ok && res.data) setStats(res.data);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((o) =>
      [o.reference, o.event_title, o.buyer_phone, o.kiosk_id]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [orders, q]);

  return (
    <>
      {stats && (
        <div className="grid gap-3 mb-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]">
          <StatCard label="Орлого" value={money(stats.revenue)} sub={`${stats.paidCount} төлөгдсөн захиалга`} />
          <StatCard label="Нийт захиалга" value={String(stats.orderCount)} sub="бүх төлөв" />
          <StatCard label="Зарагдсан тасалбар" value={String(stats.ticketCount)} sub="биечлэн" />
        </div>
      )}

      <div className={ADMIN_FILTERS_CLS}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Лавлах дугаар, арга хэмжээ, утсаар хайх…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="!pl-9 !min-w-[300px]"
          />
        </div>
        <div className="inline-flex bg-white border border-[#e4e4e7] rounded-md p-0.5 gap-0.5">
          {(
            [
              ["all", "Бүгд"],
              ["paid", "Төлөгдсөн"],
              ["pending", "Хүлээгдэж буй"],
              ["cancelled", "Цуцлагдсан"],
            ] as Array<[StatusFilter, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`px-3 h-8 rounded text-[12.5px] font-medium transition-colors ${
                status === key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {filtered && (
          <span className="text-[12px] text-zinc-500 ml-auto">
            Нийт{" "}
            <strong className="font-semibold text-zinc-900">
              {filtered.length}
            </strong>
          </span>
        )}
      </div>

      {!filtered ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : filtered.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Захиалга алга</strong>
          {q || status !== "all"
            ? "Хайлтад таарсан захиалга алга байна."
            : "Одоогоор биечлэн борлуулалт бүртгэгдээгүй байна."}
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Лавлах</th>
                <th>Арга хэмжээ</th>
                <th>Бүс</th>
                <th>Худалдан авагч</th>
                <th style={{ textAlign: "center" }}>Тоо</th>
                <th style={{ textAlign: "right" }}>Дүн</th>
                <th>Төлбөр</th>
                <th>Огноо</th>
                <th>Төлөв</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const dt = formatDateTime(o.created_at);
                const qtyTotal = o.items.reduce((s, it) => s + it.qty, 0);
                const zones = o.items
                  .map((it) => `${it.zone_name_mn} × ${it.qty}`)
                  .join(", ");
                return (
                  <tr
                    key={o.id}
                    className="group cursor-pointer"
                    onClick={() => setDetailId(o.id)}
                  >
                    <td>
                      <span className="font-mono text-[12px] font-semibold tracking-tight text-zinc-900">
                        {o.reference.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="text-zinc-900 font-medium">
                        {o.event_title || "—"}
                      </span>
                    </td>
                    <td className="text-zinc-600 max-w-[220px] truncate" title={zones}>
                      {zones || "—"}
                    </td>
                    <td className="text-zinc-600">{o.buyer_phone || "—"}</td>
                    <td className="tabular-nums text-center">{qtyTotal}</td>
                    <td
                      className="tabular-nums text-zinc-900 font-semibold"
                      style={{ textAlign: "right" }}
                    >
                      {money(o.total)}
                    </td>
                    <td className="text-zinc-600 uppercase text-[12px]">
                      {o.payment_method || "—"}
                    </td>
                    <td>
                      <div className="text-zinc-900 tabular-nums">{dt.primary}</div>
                      {dt.secondary && (
                        <div className="text-[11.5px] text-zinc-500 mt-0.5 tabular-nums">
                          {dt.secondary}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-zinc-600 group-hover:bg-zinc-50 group-hover:text-zinc-900 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailId && (
        <OrderDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-[#ececef] rounded-xl p-4">
      <span className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium">
        {label}
      </span>
      <div className="text-[22px] font-semibold tracking-[-0.02em] leading-none mt-2 text-zinc-900">
        {value}
      </div>
      <div className="text-[11.5px] text-zinc-500 mt-2">{sub}</div>
    </div>
  );
}

function OrderDetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<AdminVenueOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.admin.kiosk.getOrder(id).then((res) => {
      if (!alive) return;
      if (res.ok) setOrder(res.data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const dt = order ? formatDateTime(order.created_at) : null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#f4f4f5] sticky top-0 bg-white">
          <div className="min-w-0">
            <h3 className="m-0 text-[15px] font-semibold text-zinc-900 truncate">
              {order?.event_title || "Захиалга"}
            </h3>
            {order && (
              <p className="m-0 mt-0.5 text-[12.5px] text-zinc-500 font-mono truncate">
                {order.reference}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Хаах"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {loading ? (
            <div className="py-6 text-center text-[13.5px] text-zinc-500">
              Уншиж байна…
            </div>
          ) : !order ? (
            <div className="py-6 text-center text-[13.5px] text-zinc-500">
              Захиалга олдсонгүй.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <Meta label="Төлөв" value={<StatusBadge status={order.status} />} />
                <Meta label="Төлбөр" value={(order.payment_method || "—").toUpperCase()} />
                <Meta label="Огноо" value={`${dt?.primary ?? ""} ${dt?.secondary ?? ""}`} />
                <Meta label="Утас" value={order.buyer_phone || "—"} />
              </div>

              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium mb-2">
                  Захиалсан бүс
                </div>
                <div className="flex flex-col gap-1.5">
                  {order.items.map((it, i) => (
                    <div
                      key={`${it.zone_id}-${i}`}
                      className="flex justify-between gap-2 text-[13px]"
                    >
                      <span className="text-zinc-600">
                        {it.zone_name_mn} × {it.qty}
                      </span>
                      <span className="tabular-nums text-zinc-900">
                        {money(it.qty * it.unit_price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2 border-t border-[#f4f4f5] pt-2 mt-1 font-semibold text-zinc-900">
                    <span>Нийт</span>
                    <span className="tabular-nums">{money(order.total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium mb-2">
                  Тасалбар ({order.tickets.length})
                </div>
                {order.tickets.length === 0 ? (
                  <p className="text-[13px] text-zinc-500 m-0">
                    Төлбөр төлөгдсөний дараа тасалбар үүснэ.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {order.tickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[#ececef] bg-[#fafafa] px-3.5 py-2.5"
                      >
                        <span className="font-mono text-[13px] font-semibold tracking-tight text-zinc-900">
                          {t.code}
                        </span>
                        <span className="text-[11px] text-zinc-500 uppercase">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {order.ebarimt_lottery && (
                <div className="text-[12px] text-zinc-500">
                  И-баримт сугалаа:{" "}
                  <span className="font-mono text-zinc-700">
                    {order.ebarimt_lottery}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium mb-1">
        {label}
      </div>
      <div className="text-zinc-900">{value}</div>
    </div>
  );
}
