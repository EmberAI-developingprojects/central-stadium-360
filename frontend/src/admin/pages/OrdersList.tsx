import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listOrders } from "../../data/store";
import type { OrderRecord, OrderStatus } from "../../data/store";
import {
  ADMIN_EMPTY_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

type StatusFilter = OrderStatus | "all";

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Төлбөгдсөн",
  refunded: "Буцаагдсан",
};

function formatPurchasedAt(iso: string | undefined): {
  primary: string;
  secondary: string;
} {
  if (!iso) return { primary: "—", secondary: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()))
    return { primary: iso.slice(0, 10), secondary: "" };
  const primary = d.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { primary, secondary: time };
}

export default function OrdersList() {
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [allOrders, setAllOrders] = useState<OrderRecord[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    listOrders().then(setAllOrders);
  }, []);

  useEffect(() => {
    listOrders({ q, status }).then(setOrders);
  }, [q, status]);

  const stats = useMemo(() => {
    const list = allOrders || [];
    const total = list.length;
    const paid = list.filter((o) => o.status === "paid");
    const refunded = list.filter((o) => o.status === "refunded");
    const revenue = paid.reduce((s, o) => s + (o.total || 0), 0);
    const refundedAmt = refunded.reduce((s, o) => s + (o.total || 0), 0);
    return {
      total,
      paid: paid.length,
      refunded: refunded.length,
      revenue,
      refundedAmt,
    };
  }, [allOrders]);

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Захиалга</h2>
          <p>Бүх тасалбарын борлуулалт. Шууд буцаалт хийх боломжтой.</p>
        </div>
      </div>

      {allOrders && allOrders.length > 0 && (
        <div className="grid gap-3 mb-5 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <StatCard
            label="Нийт захиалга"
            value={stats.total.toString()}
            sub={`${stats.paid} төлбөртэй · ${stats.refunded} буцаалттай`}
          />
          <StatCard
            label="Орлого"
            value={money(stats.revenue)}
            sub="төлбөр төлсөн нийт дүн"
            accent="paid"
          />
          <StatCard
            label="Буцаалт"
            value={money(stats.refundedAmt)}
            sub={
              stats.refunded > 0 ? `${stats.refunded} захиалга` : "буцаалт алга"
            }
            accent={stats.refunded > 0 ? "refunded" : undefined}
          />
          <StatCard
            label="Дундаж захиалга"
            value={money(
              stats.paid > 0 ? Math.round(stats.revenue / stats.paid) : 0,
            )}
            sub="1 захиалгад"
          />
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
            placeholder="Код, хэрэглэгч, арга хэмжээгээр хайх…"
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
              ["refunded", "Буцаагдсан"],
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
        {orders && (
          <span className="text-[12px] text-zinc-500 ml-auto">
            Нийт{" "}
            <strong className="font-semibold text-zinc-900">
              {orders.length}
            </strong>
            {(q || status !== "all") && allOrders && ` / ${allOrders.length}`}
          </span>
        )}
      </div>

      {!orders ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : orders.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Захиалга алга</strong>
          {q || status !== "all"
            ? "Хайлтын үр дүнд таарсан захиалга алга байна."
            : "Одоогоор захиалга бүртгэгдээгүй байна."}
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Захиалга</th>
                <th>Арга хэмжээ</th>
                <th>Хэрэглэгч</th>
                <th style={{ textAlign: "center" }}>Тоо</th>
                <th style={{ textAlign: "right" }}>Дүн</th>
                <th>Төлбөр</th>
                <th>Огноо</th>
                <th>Төлөв</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const userInitial = (o.user || "?")
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                const purchasedAt = formatPurchasedAt(o.purchasedAt);
                return (
                  <tr key={o.code} className="group">
                    <td>
                      <Link
                        to={`/admin/orders/${o.code}`}
                        className="inline-flex items-center gap-1.5 font-mono text-[12px] text-zinc-900 no-underline group-hover:text-zinc-700"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-zinc-100 text-zinc-500">
                          #
                        </span>
                        <span className="font-semibold tracking-tight">
                          {o.code}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {o.image ? (
                          <span
                            className="shrink-0 inline-block w-9 h-9 rounded-md bg-zinc-100 bg-center bg-cover ring-1 ring-inset ring-[#ececef]"
                            style={{ backgroundImage: `url('${o.image}')` }}
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 ring-1 ring-inset ring-[#ececef]">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-zinc-900 font-medium truncate">
                            {o.title || "—"}
                          </div>
                          <div className="text-[11.5px] text-zinc-500 mt-0.5 truncate">
                            {o.tierName || o.tier || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-100 text-zinc-700 text-[11px] font-semibold ring-1 ring-inset ring-zinc-200"
                          aria-hidden="true"
                        >
                          {userInitial}
                        </span>
                        <span className="text-zinc-700 truncate">
                          {o.user || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="tabular-nums text-center">{o.qty || 1}</td>
                    <td
                      className="tabular-nums text-zinc-900 font-semibold"
                      style={{ textAlign: "right" }}
                    >
                      {money(o.total)}
                    </td>
                    <td className="text-zinc-600">
                      {o.paymentName || o.payment || "—"}
                    </td>
                    <td>
                      <div className="text-zinc-900 tabular-nums">
                        {purchasedAt.primary}
                      </div>
                      {purchasedAt.secondary && (
                        <div className="text-[11.5px] text-zinc-500 mt-0.5 tabular-nums">
                          {purchasedAt.secondary}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <Link
                        to={`/admin/orders/${o.code}`}
                        title="Үзэх"
                        aria-label={`«${o.code}» захиалгыг үзэх`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4e4e7] bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "paid" | "refunded";
}) {
  const valueColor =
    accent === "paid"
      ? "text-emerald-700"
      : accent === "refunded"
        ? "text-red-600"
        : "text-zinc-900";
  return (
    <div className="bg-white border border-[#ececef] rounded-xl p-4">
      <span className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium">
        {label}
      </span>
      <div
        className={`text-[22px] font-semibold tracking-[-0.02em] leading-none mt-2 ${valueColor}`}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-zinc-500 mt-2">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {STATUS_LABEL.paid}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-2 py-0.5">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      {STATUS_LABEL.refunded}
    </span>
  );
}
