import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listOrders, listUsers, ordersStats } from "../../data/store";
import type { OrderRecord, OrdersStats, UserRecord } from "../../data/store";
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
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("month");

  useEffect(() => {
    let alive = true;
    Promise.all([ordersStats(), listOrders(), listUsers()]).then(
      ([s, o, u]) => {
        if (!alive) return;
        setStats(s);
        setOrders(o);
        setUsers(u);
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

    const uniqueBuyers = new Set(orders.map((o) => o.user)).size;
    const buyerPct =
      users.length > 0 ? Math.round((uniqueBuyers / users.length) * 100) : 0;

    const monthlyBars = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(cy, cm - (7 - i), 1);
      const mo = d.getMonth();
      const yr = d.getFullYear();
      const mo_orders = orders.filter((o) => inMonth(o.purchasedAt, mo, yr));
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
      const wk_orders = orders.filter((o) => {
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
      totalRevenue: stats?.revenue ?? 0,
      totalOrders: stats?.count ?? 0,
      monthlyBars,
      weeklyBars,
      recentUsers,
      recentOrders,
    };
  }, [orders, users, stats]);

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
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            style={{
              height: 36,
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #e4e4e7",
              fontSize: 13,
              background: "#fff",
              color: "#111",
              fontFamily: "inherit",
            }}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
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
            Export CSV
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
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
        <StatCard
          label="Ticket авсан хүмүүсийн хувь"
          value={money(derived.totalRevenue)}
          badge={derived.revPct}
          icon={<IconRevenue />}
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
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                Ticket борлуулалт
              </div>
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                Сар / 7 хоногоор шүүж харна
              </div>
            </div>
            <select
              value={chartPeriod}
              onChange={(e) =>
                setChartPeriod(e.target.value as "week" | "month")
              }
              style={{
                height: 32,
                padding: "0 8px",
                borderRadius: 7,
                border: "1px solid #e4e4e7",
                fontSize: 12,
                background: "#fff",
                color: "#111",
                fontFamily: "inherit",
              }}
            >
              <option value="month">By Month</option>
              <option value="week">By Week</option>
            </select>
          </div>
          <BarChart bars={bars} maxVal={maxBar} />
        </div>

        <div
          className={ADMIN_CARD_CLS}
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
              Ticket авсан хэрэглэгч
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
              Нийт хэрэглэгчийн хувь
            </div>
          </div>
          <DonutChart percent={derived.buyerPct} />
          <div
            style={{
              width: "100%",
              marginTop: 16,
              borderTop: "1px solid #f4f4f5",
              paddingTop: 14,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 3 }}>
                Борлуулалт
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>
                {derived.uniqueBuyers.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 3 }}>
                Нийт орлого
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>
                {money(derived.totalRevenue)}
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
                <th>Контакт</th>
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

function DonutChart({ percent }: { percent: number }) {
  const r = 66;
  const cx = 90;
  const cy = 90;
  const c = 2 * Math.PI * r;
  const p = Math.min(percent, 100) / 100;
  const segments = [
    { frac: p * 0.45, color: "#2230C6" },
    { frac: p * 0.3, color: "#4451DC" },
    { frac: p * 0.25, color: "#8891f0" },
  ];

  let offset = 0;
  return (
    <svg viewBox="0 0 180 180" style={{ width: 170, height: 170 }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f4f4f5"
        strokeWidth="22"
      />

      {segments.map((seg, i) => {
        const dash = seg.frac * c;
        const gap = c - dash;
        const rotation = -90 + offset * 360;
        offset += seg.frac;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="22"
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray .6s ease" }}
          />
        );
      })}

      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill="#111"
      >
        {percent}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#71717a">
        Ticket авсан
      </text>
    </svg>
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
