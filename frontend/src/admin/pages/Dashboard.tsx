import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  listEvents,
  listOrders,
  listUsers,
  ordersStats,
} from "../../data/store";
import type {
  EventRecord,
  OrderRecord,
  OrdersStats,
  UserRecord,
} from "../../data/store";
import {
  ADMIN_BADGE_CLS,
  ADMIN_BTN_CLS,
  ADMIN_CARD_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_LINK_CLS,
  ADMIN_TABLE_CLS,
} from "../_adminStyles";

const MONTHS_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function money(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M₮";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k₮";
  return n.toLocaleString("en-US") + "₮";
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
    ),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

type PeriodKey = "week" | "month" | "year";

export default function Dashboard() {
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("month");
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    Promise.all([ordersStats(), listOrders(), listUsers(), listEvents()]).then(
      ([s, o, u, ev]) => {
        if (!alive) return;
        setStats(s);
        setOrders(o);
        setUsers(u);
        setEvents(ev);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();
  const pm = cm === 0 ? 11 : cm - 1;
  const py = cm === 0 ? cy - 1 : cy;

  const chartOrders = useMemo(
    () =>
      selectedEventId === "all"
        ? orders
        : orders.filter((o) => o.eventId === selectedEventId),
    [orders, selectedEventId],
  );

  const derived = useMemo(() => {
    const inMonth = (iso: string, m: number, y: number) => {
      const d = new Date(iso);
      return d.getMonth() === m && d.getFullYear() === y;
    };

    const ordCurr = orders.filter((o) => inMonth(o.purchasedAt, cm, cy));
    const ordPrev = orders.filter((o) => inMonth(o.purchasedAt, pm, py));
    const usrCurr = users.filter((u) => inMonth(u.createdAt || "", cm, cy));
    const usrPrev = users.filter((u) => inMonth(u.createdAt || "", pm, py));

    const revCurr = ordCurr.reduce((s, o) => s + o.total, 0);
    const revPrev = ordPrev.reduce((s, o) => s + o.total, 0);

    const uniqueBuyers = new Set(chartOrders.map((o) => o.user)).size;
    const buyerPct =
      users.length > 0 ? Math.round((uniqueBuyers / users.length) * 100) : 0;
    const viewerCount = stats?.viewerCount ?? 0;
    const watchedCount = Math.min(viewerCount, uniqueBuyers);
    const notWatchedCount = Math.max(0, uniqueBuyers - watchedCount);
    const watchedPct =
      uniqueBuyers > 0 ? Math.round((watchedCount / uniqueBuyers) * 100) : 0;

    const monthlyBars = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(cy, cm - (7 - i), 1);
      const mo = d.getMonth();
      const yr = d.getFullYear();
      const mo_orders = chartOrders.filter((o) =>
        inMonth(o.purchasedAt, mo, yr),
      );
      return {
        label: MONTHS_ABBR[mo],
        month: mo,
        year: yr,
        count: mo_orders.length,
        revenue: mo_orders.reduce((s, o) => s + o.total, 0),
        isCurrent: mo === cm && yr === cy,
      };
    });

    const weeklyBars = Array.from({ length: 8 }, (_, i) => {
      const endD = new Date(now);
      endD.setDate(endD.getDate() - (7 - i - 1) * 7);
      const startD = new Date(endD);
      startD.setDate(startD.getDate() - 6);
      const wk_orders = chartOrders.filter((o) => {
        const d = new Date(o.purchasedAt);
        return d >= startD && d <= endD;
      });
      return {
        label: `${startD.getDate()}/${startD.getMonth() + 1}`,
        count: wk_orders.length,
        revenue: wk_orders.reduce((s, o) => s + o.total, 0),
        isCurrent: i === 7,
      };
    });

    const recentUsers = [...users]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 10);

    const recentOrders = [...orders]
      .sort((a, b) => (b.purchasedAt || "").localeCompare(a.purchasedAt || ""))
      .slice(0, 10);

    return {
      totalUsers: users.length,
      newUsersCurr: usrCurr.length,
      newUsersPct: pct(usrCurr.length, usrPrev.length),
      newOrdersCurr: ordCurr.length,
      newOrdersPct: pct(ordCurr.length, ordPrev.length),
      revCurr,
      revPct: pct(revCurr, revPrev),
      buyerPct,
      uniqueBuyers,
      watchedCount,
      notWatchedCount,
      watchedPct,
      totalRevenue: stats?.revenue ?? 0,
      totalOrders: stats?.count ?? 0,
      monthlyBars,
      weeklyBars,
      recentUsers,
      recentOrders,
    };
  }, [orders, users, stats, chartOrders, cm, cy, pm, py, now]);

  const selectableEvents = useMemo(() => {
    const nowMs = Date.now();
    const runtimeStatus = (e: EventRecord): EventRecord["status"] => {
      const start = e.start_time ? new Date(e.start_time).getTime() : NaN;
      if (!Number.isNaN(start) && nowMs < start) return "upcoming";
      let endMs: number | null = null;
      if (e.live_end_at) {
        const t = new Date(e.live_end_at).getTime();
        if (!Number.isNaN(t)) endMs = t;
      }
      if (endMs === null && !Number.isNaN(start)) {
        endMs = start + 3 * 60 * 60 * 1000;
      }
      if (endMs !== null && nowMs < endMs) return "live";
      if (e.replay_available_until) {
        const until = new Date(e.replay_available_until).getTime();
        if (!Number.isNaN(until) && nowMs > until) return "expired";
      }
      return e.status === "archived" ? "archived" : "ended";
    };

    const enriched = events.map((e) => ({ ...e, runtime: runtimeStatus(e) }));
    const eligible = enriched.filter(
      (e) =>
        e.runtime === "live" ||
        e.runtime === "ended" ||
        e.runtime === "expired" ||
        e.runtime === "archived",
    );
    const orderCountByEvent = new Map<string, number>();
    const revenueByEvent = new Map<string, number>();
    for (const o of orders) {
      orderCountByEvent.set(
        o.eventId,
        (orderCountByEvent.get(o.eventId) ?? 0) + 1,
      );
      revenueByEvent.set(
        o.eventId,
        (revenueByEvent.get(o.eventId) ?? 0) + o.total,
      );
    }
    return eligible
      .map((e) => ({
        ...e,
        ticketCount: orderCountByEvent.get(e.id) ?? 0,
        revenue: revenueByEvent.get(e.id) ?? 0,
      }))
      .sort((a, b) => {
        if (a.runtime === "live" && b.runtime !== "live") return -1;
        if (b.runtime === "live" && a.runtime !== "live") return 1;
        return (b.start_time || "").localeCompare(a.start_time || "");
      });
  }, [events, orders]);

  const selectedEvent = useMemo(
    () => selectableEvents.find((e) => e.id === selectedEventId) ?? null,
    [selectableEvents, selectedEventId],
  );

  const selectedSummary = useMemo(
    () => ({
      ticketCount: chartOrders.length,
      revenue: chartOrders.reduce((s, o) => s + o.total, 0),
      buyerCount: new Set(chartOrders.map((o) => o.user)).size,
    }),
    [chartOrders],
  );

  const bars =
    chartPeriod === "month" ? derived.monthlyBars : derived.weeklyBars;
  const maxBar = Math.max(1, ...bars.map((b) => b.revenue));

  const onExport = () => {
    exportCSV(
      users.map((u) => ({
        id: u.id,
        name: u.fullname,
        identifier: u.identifier,
        role: u.role,
        registered: (u.createdAt || "").slice(0, 10),
      })),
      "users-export.csv",
    );
  };

  if (!stats)
    return (
      <div className={ADMIN_EMPTY_CLS} style={{ marginTop: 32 }}>
        Уншиж байна…
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#111",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Нийт бүртгэлтэй хэрэглэгчдийн тоо
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#71717a" }}>
            Орлого, захиалга, шинэ хэрэглэгчдийн товч хураангуй.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <PeriodDropdown value={period} onChange={setPeriod} />
          <button
            type="button"
            className={ADMIN_BTN_CLS}
            onClick={onExport}
            style={{ gap: 6 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV татах
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <StatCard
          label="Нийт хэрэглэгч"
          value={derived.totalUsers.toLocaleString()}
          badge={null}
          blue
          icon={<IconUsers />}
        />
        <StatCard
          label="Энэ сарын шинэ хэрэглэгч"
          value={derived.newUsersCurr.toString()}
          badge={derived.newUsersPct}
          icon={<IconUserPlus />}
        />
        <StatCard
          label="Энэ сарын захиалга"
          value={derived.newOrdersCurr.toString()}
          badge={derived.newOrdersPct}
          icon={<IconTicket />}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div className={ADMIN_CARD_CLS} style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                Ticket борлуулалт
              </div>
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                {selectedEvent
                  ? selectedEvent.title
                  : "Бүх тоглолтын нийт борлуулалт"}
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                padding: 3,
                borderRadius: 8,
                background: "#f4f4f5",
                gap: 2,
              }}
            >
              {(["month", "week"] as const).map((p) => {
                const active = chartPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChartPeriod(p)}
                    style={{
                      height: 26,
                      padding: "0 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: "inherit",
                      background: active ? "#fff" : "transparent",
                      color: active ? "#111" : "#71717a",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      transition: "all .15s ease",
                    }}
                  >
                    {p === "month" ? "Сараар" : "Долоо хоногоор"}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #f4f4f5",
              paddingTop: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#71717a",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Тоглолтоор шүүх
              </div>
              {selectedEventId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedEventId("all")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2230C6",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                >
                  Цэвэрлэх
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              <EventChip
                label="Бүгд"
                active={selectedEventId === "all"}
                onClick={() => setSelectedEventId("all")}
              />
              {selectableEvents.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    padding: "6px 10px",
                  }}
                >
                  Шууд / дууссан тоглолт байхгүй
                </div>
              ) : (
                selectableEvents.map((e) => (
                  <EventChip
                    key={e.id}
                    label={e.title}
                    badge={e.runtime === "live" ? "ШУУД" : null}
                    active={selectedEventId === e.id}
                    onClick={() => setSelectedEventId(e.id)}
                  />
                ))
              )}
            </div>
          </div>

          {selectedEventId !== "all" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 14,
                padding: "12px 14px",
                background: "#fafafa",
                borderRadius: 10,
                border: "1px solid #f4f4f5",
              }}
            >
              <SummaryStat
                label="Зарагдсан ticket"
                value={selectedSummary.ticketCount.toLocaleString()}
              />
              <SummaryStat
                label="Орлого"
                value={money(selectedSummary.revenue)}
              />
              <SummaryStat
                label="Худалдан авсан"
                value={selectedSummary.buyerCount.toLocaleString()}
              />
            </div>
          )}

          <BarChart bars={bars} maxVal={maxBar} />
        </div>

        <div
          className={ADMIN_CARD_CLS}
          style={{
            padding: "22px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#0f172a",
                  letterSpacing: "-0.005em",
                }}
              >
                Тасалбар үзсэн хэрэглэгч
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#71717a",
                  marginTop: 3,
                  lineHeight: 1.45,
                }}
              >
                Худалдан авагчдын дунд үзсэн / үзээгүй хувь
              </div>
            </div>
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 32,
                height: 32,
                borderRadius: 10,
                background:
                  "linear-gradient(135deg,rgba(34,48,198,0.10),rgba(68,81,220,0.04))",
                color: "#2230C6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "4px 0 2px",
            }}
          >
            <DonutChart
              percent={derived.watchedPct}
              watched={derived.watchedCount}
              total={derived.uniqueBuyers}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <DonutLegendRow
              color="#2230C6"
              label="Үзсэн"
              value={derived.watchedCount}
              total={derived.uniqueBuyers}
            />
            <DonutLegendRow
              color="#d4d4d8"
              label="Үзээгүй"
              value={derived.notWatchedCount}
              total={derived.uniqueBuyers}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 2,
            }}
          >
            <div
              style={{
                borderRadius: 12,
                background: "#fafafa",
                border: "1px solid #f1f1f4",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#71717a",
                  marginBottom: 4,
                  letterSpacing: "0.02em",
                }}
              >
                Худалдан авсан
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {derived.uniqueBuyers.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                borderRadius: 12,
                background: "#fafafa",
                border: "1px solid #f1f1f4",
                padding: "10px 12px",
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#71717a",
                  marginBottom: 4,
                  letterSpacing: "0.02em",
                }}
              >
                Үзсэн
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {derived.watchedPct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={ADMIN_CARD_CLS}
        style={{ padding: 0, overflow: "hidden" }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f4f4f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
            Сүүлд бүртгүүлсэн хэрэглэгчид
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: "#71717a",
                fontWeight: 400,
              }}
            >
              (сүүлийн 10)
            </span>
          </div>
          <Link
            to="/admin/users"
            style={{
              fontSize: 12,
              color: "#2230C6",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Бүгдийг харах →
          </Link>
        </div>
        {derived.recentUsers.length === 0 ? (
          <div
            className={ADMIN_EMPTY_CLS}
            style={{ border: "none", borderRadius: 0 }}
          >
            Хэрэглэгч алга
          </div>
        ) : (
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Хэрэглэгч</th>
                <th>Хаяг</th>
                <th>Эрх</th>
                <th>Бүртгүүлсэн</th>
              </tr>
            </thead>
            <tbody>
              {derived.recentUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 9 }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg,#2230C6,#4451DC)",
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {(u.fullname || u.identifier || "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className={ADMIN_LINK_CLS}
                      >
                        {u.fullname || "—"}
                      </Link>
                    </div>
                  </td>
                  <td style={{ color: "#71717a" }}>{u.identifier}</td>
                  <td>
                    <span
                      className={`${ADMIN_BADGE_CLS} ${u.role === "admin" ? "!bg-violet-50 !text-violet-700" : ""}`}
                    >
                      {u.role || "user"}
                    </span>
                  </td>
                  <td style={{ color: "#71717a" }}>
                    {(u.createdAt || "").slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  badge,
  blue = false,
  icon,
}: {
  label: string;
  value: string;
  badge: number | null;
  blue?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: blue ? "linear-gradient(135deg,#2230C6,#4451DC)" : "#fff",
        border: blue ? "none" : "1px solid #ececef",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: blue ? "rgba(255,255,255,.7)" : "#71717a",
          }}
        >
          {label}
        </span>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: blue ? "rgba(255,255,255,.18)" : "#f4f4f5",
            display: "grid",
            placeItems: "center",
            color: blue ? "#fff" : "#71717a",
          }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: blue ? "#fff" : "#111",
        }}
      >
        {value}
      </div>
      {badge !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 20,
              background: badge >= 0 ? "#dcfce7" : "#fee2e2",
              color: badge >= 0 ? "#15803d" : "#b91c1c",
            }}
          >
            {badge >= 0 ? "+" : ""}
            {badge}%
          </span>
          <span style={{ fontSize: 11, color: "#71717a" }}>Өмнөх сараас</span>
        </div>
      )}
    </div>
  );
}

type BarDatum = {
  label: string;
  revenue: number;
  count: number;
  isCurrent: boolean;
};

function BarChart({ bars, maxVal }: { bars: BarDatum[]; maxVal: number }) {
  const [tooltip, setTooltip] = useState<{
    i: number;
    x: number;
    y: number;
  } | null>(null);
  const H = 160;
  const BAR_W = 28;
  const GAP = 12;
  const PL = 36;
  const PR = 8;
  const totalW = PL + bars.length * (BAR_W + GAP) - GAP + PR;
  const MAX_H = H - 24;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${totalW} ${H + 24}`}
        style={{ width: "100%", height: H + 24, display: "block" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = 4 + MAX_H - f * MAX_H;
          return (
            <g key={f}>
              <line
                x1={PL - 4}
                y1={y}
                x2={totalW - PR}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
              <text
                x={PL - 6}
                y={y + 4}
                fontSize="8"
                fill="#aaa"
                textAnchor="end"
              >
                {maxVal > 0 ? Math.round((f * maxVal) / 1000) + "k" : "0"}
              </text>
            </g>
          );
        })}

        {bars.map((b, i) => {
          const barH = maxVal > 0 ? (b.revenue / maxVal) * MAX_H : 0;
          const x = PL + i * (BAR_W + GAP);
          const y = 4 + MAX_H - barH;
          const isHovered = tooltip?.i === i;
          return (
            <g
              key={i}
              onMouseEnter={(e) => {
                const svg = (e.target as SVGElement).closest("svg")!;
                const rect = svg.getBoundingClientRect();
                const px = rect.left + (x + BAR_W / 2) * (rect.width / totalW);
                const py = rect.top + y * (rect.height / (H + 24));
                setTooltip({ i, x: px, y: py });
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={4}
                width={BAR_W}
                height={MAX_H}
                rx={5}
                fill="#f4f4f5"
              />

              {barH > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  rx={5}
                  fill={b.isCurrent || isHovered ? "url(#barGrad)" : "#e0e3fa"}
                  opacity={isHovered ? 1 : 0.9}
                />
              )}

              <text
                x={x + BAR_W / 2}
                y={H + 18}
                fontSize="9"
                fill="#aaa"
                textAnchor="middle"
              >
                {b.label}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4451DC" />
            <stop offset="100%" stopColor="#2230C6" />
          </linearGradient>
        </defs>
      </svg>

      {tooltip !== null &&
        (() => {
          const b = bars[tooltip.i];
          return (
            <div
              style={{
                position: "fixed",
                left: tooltip.x,
                top: tooltip.y - 8,
                transform: "translate(-50%, -100%)",
                background: "#111",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                zIndex: 999,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(0,0,0,.25)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.label}</div>
              <div style={{ color: "#aaa" }}>
                Борлуулалт: <b style={{ color: "#fff" }}>{b.count}</b>
              </div>
              <div style={{ color: "#aaa" }}>
                Орлого: <b style={{ color: "#fff" }}>{money(b.revenue)}</b>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function DonutChart({
  percent,
  watched,
  total,
}: {
  percent: number;
  watched: number;
  total: number;
}) {
  const r = 66;
  const cx = 90;
  const cy = 90;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(percent, 100)) / 100;
  const watchedLen = c * p;
  const gradId = "donut-watched-gradient";

  return (
    <svg viewBox="0 0 180 180" style={{ width: 184, height: 184 }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2230C6" />
          <stop offset="100%" stopColor="#4451DC" />
        </linearGradient>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#eef0f4"
        strokeWidth="20"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#d4d4d8"
        strokeWidth="20"
        strokeDasharray={`${c - watchedLen} ${watchedLen}`}
        strokeDashoffset={-watchedLen}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray .6s ease" }}
      />
      {p > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="20"
          strokeDasharray={`${watchedLen} ${c - watchedLen}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      )}

      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="28"
        fontWeight="800"
        fill="#0f172a"
        style={{ letterSpacing: "-0.02em" }}
      >
        {percent}%
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="500"
        fill="#71717a"
        style={{ letterSpacing: "0.02em" }}
      >
        {watched.toLocaleString()} / {total.toLocaleString()}
      </text>
    </svg>
  );
}

function DonutLegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        background: "#fafafa",
        border: "1px solid #f1f1f4",
        fontSize: 12.5,
        color: "#52525b",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 0 3px ${color}1f`,
          display: "inline-block",
          flex: "none",
        }}
      />
      <span style={{ flex: 1, fontWeight: 500, color: "#3f3f46" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "#a1a1aa",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pct}%
      </span>
      <strong
        style={{
          color: "#0f172a",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          minWidth: 24,
          textAlign: "right",
        }}
      >
        {value.toLocaleString()}
      </strong>
    </div>
  );
}

const PERIOD_OPTIONS: { value: PeriodKey; label: string; hint: string }[] = [
  { value: "week", label: "Сүүлийн 7 хоног", hint: "Долоо хоногоор" },
  { value: "month", label: "Энэ сар", hint: "Сараар" },
  { value: "year", label: "Энэ жил", hint: "Жилээр" },
];

function PeriodDropdown({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = PERIOD_OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 12px",
          borderRadius: 8,
          border: open ? "1px solid #2230C6" : "1px solid #e4e4e7",
          background: "#fff",
          color: "#111",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "inherit",
          cursor: "pointer",
          boxShadow: open
            ? "0 0 0 3px rgba(34,48,198,0.1)"
            : "0 1px 2px rgba(0,0,0,0.02)",
          transition: "all .15s ease",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#71717a" }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{current?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: "#71717a",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .15s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            padding: 4,
            background: "#fff",
            border: "1px solid #ececef",
            borderRadius: 10,
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
            zIndex: 50,
          }}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#f4f4f5";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 7,
                  background: active ? "#eef0fc" : "transparent",
                  color: active ? "#2230C6" : "#111",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background .12s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span>{opt.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: active ? "#4451DC" : "#a1a1aa",
                      marginTop: 1,
                    }}
                  >
                    {opt.hint}
                  </span>
                </div>
                {active && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventChip({
  label,
  active,
  onClick,
  badge = null,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 12px",
        borderRadius: 999,
        border: active ? "1px solid #2230C6" : "1px solid #e4e4e7",
        background: active ? "#2230C6" : "#fff",
        color: active ? "#fff" : "#52525b",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        cursor: "pointer",
        transition: "all .15s ease",
        flexShrink: 0,
        maxWidth: 220,
      }}
    >
      {badge && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: active ? "#fff" : "#dc2626",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: active ? "#fff" : "#dc2626",
              display: "inline-block",
            }}
          />
          {badge}
        </span>
      )}
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 180,
        }}
      >
        {label}
      </span>
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#71717a",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#111",
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function IconUsers() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
    </svg>
  );
}
function IconRevenue() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
    </svg>
  );
}
