import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AdminReconciliationReport,
  AdminSellThroughEvent,
  AdminSellThroughReport,
  AdminVenueOrderDetail,
  AdminVenueOrderRow,
  AdminVenueStats,
  EventStatus,
  ReconRange,
  SellThroughScope,
  TicketStatus,
} from "@cs360/shared";
import { api } from "../../lib/api";
import {
  ADMIN_BADGE_CANCELLED_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BADGE_REFUNDED_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
  ADMIN_TABS_CLS,
} from "../_adminStyles";

type TabId = "overview" | "recon" | "sales";

const pctText = (p: number): string => `${Math.round(p * 100)}%`;

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

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
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Касс — борлуулалтын тайлан</h2>
          <p>
            Арга хэмжээний дүүргэлт, орлого, кассын тооцоо, борлуулалтын түүх.
            Тасалбар зарах үйлдэл нь касс дээр өөр дээр нь хийгдэнэ.
          </p>
        </div>
      </div>

      <div className={ADMIN_TABS_CLS}>
        <button
          type="button"
          className={tab === "overview" ? "is-active" : undefined}
          onClick={() => setTab("overview")}
        >
          Тойм
        </button>
        <button
          type="button"
          className={tab === "recon" ? "is-active" : undefined}
          onClick={() => setTab("recon")}
        >
          Тооцоо
        </button>
        <button
          type="button"
          className={tab === "sales" ? "is-active" : undefined}
          onClick={() => setTab("sales")}
        >
          Борлуулалт
        </button>
      </div>

      {tab === "overview" ? (
        <SellThroughPanel />
      ) : tab === "recon" ? (
        <ReconciliationPanel />
      ) : (
        <SalesPanel />
      )}
    </>
  );
}

// ===========================================================================
// OVERVIEW — sell-through (per-event / per-zone fill + revenue)
// ===========================================================================

const EVENT_STATUS: Record<string, { label: string; cls: string }> = {
  live: { label: "Шууд", cls: ADMIN_BADGE_PAID_CLS },
  upcoming: { label: "Удахгүй", cls: "" },
  expired: { label: "Дууссан", cls: ADMIN_BADGE_CANCELLED_CLS },
};

function EventStatusBadge({ status }: { status: EventStatus }) {
  const s = EVENT_STATUS[status] ?? { label: status, cls: "" };
  return <span className={`${ADMIN_BADGE_CLS} ${s.cls}`}>{s.label}</span>;
}

function FillBar({ pct, color }: { pct: number; color?: string | null }) {
  return (
    <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-[width]"
        style={{
          width: `${Math.min(100, Math.round(pct * 100))}%`,
          background: color || "#2230C6",
        }}
      />
    </div>
  );
}

function SellThroughPanel() {
  const [scope, setScope] = useState<SellThroughScope>("onsale");
  const [report, setReport] = useState<AdminSellThroughReport | null>(null);

  useEffect(() => {
    let alive = true;
    setReport(null);
    api.admin.kiosk.sellThrough(scope).then((res) => {
      if (!alive) return;
      setReport(
        res.ok && res.data
          ? res.data
          : { totals: { capacity: 0, sold: 0, revenue: 0, events: 0 }, events: [] },
      );
    });
    return () => {
      alive = false;
    };
  }, [scope]);

  return (
    <>
      <div className={ADMIN_FILTERS_CLS}>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            ["onsale", "Зарж буй"],
            ["all", "Бүгд"],
          ]}
        />
        {report && (
          <span className="text-[12px] text-zinc-500 ml-auto">
            Нийт{" "}
            <strong className="font-semibold text-zinc-900">
              {report.totals.events}
            </strong>{" "}
            арга хэмжээ
          </span>
        )}
      </div>

      {!report ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : report.events.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Арга хэмжээ алга</strong>
          Бүс тохируулсан, зарж буй арга хэмжээ одоогоор алга байна.
        </div>
      ) : (
        <>
          <div className="grid gap-3 mb-5 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
            <StatCard label="Нийт багтаамж" value={report.totals.capacity.toLocaleString("en-US")} sub="суудал / бүс" />
            <StatCard label="Зарагдсан" value={report.totals.sold.toLocaleString("en-US")} sub="төлөгдсөн тасалбар" />
            <StatCard label="Орлого" value={money(report.totals.revenue)} sub="биечлэн борлуулалт" />
            <StatCard
              label="Дүүргэлт"
              value={pctText(report.totals.capacity > 0 ? report.totals.sold / report.totals.capacity : 0)}
              sub="нийт дундаж"
            />
          </div>

          <div className="flex flex-col gap-4">
            {report.events.map((e) => (
              <SellThroughEventCard key={e.event_id} event={e} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SellThroughEventCard({ event }: { event: AdminSellThroughEvent }) {
  const dt = formatDateTime(event.start_time);
  return (
    <div className="bg-white border border-[#ececef] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f4f4f5]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-[14.5px] font-semibold text-zinc-900 truncate">
              {event.title}
            </h3>
            <EventStatusBadge status={event.status} />
          </div>
          <div className="text-[12px] text-zinc-500 mt-0.5 tabular-nums">
            {dt.primary}
            {dt.secondary ? ` · ${dt.secondary}` : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-semibold tabular-nums text-zinc-900">
            {money(event.revenue)}
          </div>
          <div className="text-[12px] text-zinc-500 tabular-nums">
            {event.sold}/{event.capacity} · {pctText(event.pct)}
          </div>
        </div>
      </div>

      {event.zones.length === 0 ? (
        <div className="px-5 py-4 text-[13px] text-zinc-500">
          Бүс тохируулаагүй.
        </div>
      ) : (
        <table className={ADMIN_TABLE_CLS}>
          <thead>
            <tr>
              <th>Бүс</th>
              <th style={{ width: "34%" }}>Дүүргэлт</th>
              <th style={{ textAlign: "right" }}>Үнэ</th>
              <th style={{ textAlign: "center" }}>Зарагдсан</th>
              <th style={{ textAlign: "right" }}>Орлого</th>
            </tr>
          </thead>
          <tbody>
            {event.zones.map((z) => (
              <tr key={z.zone_id}>
                <td>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-1.5 rounded-full shrink-0"
                      style={{ background: z.color || "#2230C6" }}
                      aria-hidden="true"
                    />
                    <span className="text-zinc-900 font-medium">{z.name_mn}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <FillBar pct={z.pct} color={z.color} />
                    <span className="text-[12px] tabular-nums text-zinc-500 shrink-0 w-9 text-right">
                      {pctText(z.pct)}
                    </span>
                  </div>
                </td>
                <td className="tabular-nums text-zinc-600" style={{ textAlign: "right" }}>
                  {money(z.price)}
                </td>
                <td className="tabular-nums text-center">
                  {z.sold}/{z.capacity}
                </td>
                <td className="tabular-nums text-zinc-900 font-semibold" style={{ textAlign: "right" }}>
                  {money(z.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ===========================================================================
// RECON — cash-up by kiosk / staff + payment mix
// ===========================================================================

function ReconciliationPanel() {
  const [range, setRange] = useState<ReconRange>("all");
  const [report, setReport] = useState<AdminReconciliationReport | null>(null);

  useEffect(() => {
    let alive = true;
    setReport(null);
    api.admin.kiosk.reconciliation({ range }).then((res) => {
      if (!alive) return;
      if (res.ok && res.data) setReport(res.data);
      else
        setReport({
          totals: { revenue: 0, orders: 0, tickets: 0, byMethod: { qpay: 0, card: 0 }, voided: 0 },
          kiosks: [],
        });
    });
    return () => {
      alive = false;
    };
  }, [range]);

  const mix = report?.totals.byMethod;
  const mixTotal = mix ? mix.qpay + mix.card : 0;
  const qpayPct = mixTotal > 0 ? (mix!.qpay / mixTotal) * 100 : 0;

  return (
    <>
      <div className={ADMIN_FILTERS_CLS}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            ["today", "Өнөөдөр"],
            ["7d", "7 хоног"],
            ["all", "Бүгд"],
          ]}
        />
        {report && report.totals.voided > 0 && (
          <span className="text-[12px] text-zinc-500 ml-auto">
            Цуцлагдсан/буцаалт:{" "}
            <strong className="font-semibold text-zinc-900">
              {report.totals.voided}
            </strong>
          </span>
        )}
      </div>

      {!report ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : (
        <>
          <div className="grid gap-3 mb-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]">
            <StatCard label="Орлого" value={money(report.totals.revenue)} sub={`${report.totals.orders} төлөгдсөн захиалга`} />
            <StatCard label="Тасалбар" value={report.totals.tickets.toLocaleString("en-US")} sub="зарагдсан" />
            <div className="bg-white border border-[#ececef] rounded-xl p-4">
              <span className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium">
                Төлбөрийн хэлбэр
              </span>
              <div className="mt-3 h-2 w-full rounded-full bg-zinc-100 overflow-hidden flex">
                <div className="h-full bg-zinc-900" style={{ width: `${qpayPct}%` }} />
                <div className="h-full bg-zinc-300" style={{ width: `${100 - qpayPct}%` }} />
              </div>
              <div className="flex justify-between text-[12px] text-zinc-500 mt-2 tabular-nums">
                <span>QPay {money(mix?.qpay ?? 0)}</span>
                <span>Карт/Бэлэн {money(mix?.card ?? 0)}</span>
              </div>
            </div>
          </div>

          {report.kiosks.length === 0 ? (
            <div className={ADMIN_EMPTY_CLS}>
              <strong>Тооцоо алга</strong>
              Сонгосон хугацаанд төлөгдсөн борлуулалт бүртгэгдээгүй байна.
            </div>
          ) : (
            <div className={ADMIN_TABLE_WRAP_CLS}>
              <table className={ADMIN_TABLE_CLS}>
                <thead>
                  <tr>
                    <th>Касс / Ажилтан</th>
                    <th style={{ textAlign: "center" }}>Захиалга</th>
                    <th style={{ textAlign: "center" }}>Тасалбар</th>
                    <th style={{ textAlign: "right" }}>QPay</th>
                    <th style={{ textAlign: "right" }}>Карт/Бэлэн</th>
                    <th style={{ textAlign: "right" }}>Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {report.kiosks.map((k) => (
                    <tr key={k.kiosk_id ?? "__none__"}>
                      <td>
                        <span className="text-zinc-900 font-medium">{k.label}</span>
                        {k.staff_id && (
                          <span className="ml-2 text-[11px] text-zinc-400">
                            ажилтан
                          </span>
                        )}
                      </td>
                      <td className="tabular-nums text-center">{k.orders}</td>
                      <td className="tabular-nums text-center">{k.tickets}</td>
                      <td className="tabular-nums text-zinc-600" style={{ textAlign: "right" }}>
                        {money(k.qpay)}
                      </td>
                      <td className="tabular-nums text-zinc-600" style={{ textAlign: "right" }}>
                        {money(k.card)}
                      </td>
                      <td className="tabular-nums text-zinc-900 font-semibold" style={{ textAlign: "right" }}>
                        {money(k.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <div className="inline-flex bg-white border border-[#e4e4e7] rounded-md p-0.5 gap-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 h-8 rounded text-[12.5px] font-medium transition-colors ${
            value === key
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {label}
        </button>
      ))}
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
