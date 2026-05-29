import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEvents, listOrders, listUsers, ordersStats } from '../../data/store';
import type { OrderRecord, OrdersStats, UserRecord } from '../../data/store';
import { ADMIN_CARD_CLS, ADMIN_EMPTY_CLS, ADMIN_GRID_2_CLS, ADMIN_GRID_4_CLS, ADMIN_GRID_CLS, ADMIN_LINK_CLS, ADMIN_PAGE_HEADER_CLS, ADMIN_SPARKLINE_CLS, ADMIN_STAT_CARD_CLS, ADMIN_TABLE_CLS } from '../_adminStyles';

const money = (n: number | undefined): string => (n || 0).toLocaleString('en-US') + '₮';

export default function Dashboard() {
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserRecord[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([ordersStats(), listOrders(), listUsers(), listEvents()]).then(
      ([s, orders, users, events]) => {
        if (!alive) return;
        setStats(s);
        setRecentOrders(orders.slice(0, 8));
        setUserCount(users.length);
        setRecentUsers(
          users
            .filter((u) => u.identifier !== 'admin')
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
            .slice(0, 5),
        );
        setUpcomingCount(events.length);
      },
    );
    return () => { alive = false; };
  }, []);

  if (!stats) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Хяналтын самбар</h2>
          <p>Орлого, захиалга, шинэ хэрэглэгчдийн товч хураангуй.</p>
        </div>
      </div>

      <div className={`${ADMIN_GRID_CLS} ${ADMIN_GRID_4_CLS}`} style={{ marginBottom: 18 }}>
        <div className={`${ADMIN_STAT_CARD_CLS} stat-card`}>
          <div className="stat-label">Нийт орлого</div>
          <div className="stat-value">{money(stats.revenue)}</div>
          <div className="stat-sub">Төлбөртэй захиалгаас</div>
        </div>
        <div className={`${ADMIN_STAT_CARD_CLS} stat-card`}>
          <div className="stat-label">Захиалга</div>
          <div className="stat-value">{stats.count.toLocaleString('en-US')}</div>
          <div className="stat-sub">{stats.paidCount} төлбөртэй</div>
        </div>
        <div className={`${ADMIN_STAT_CARD_CLS} stat-card`}>
          <div className="stat-label">Бүртгэлтэй хэрэглэгч</div>
          <div className="stat-value">{userCount.toLocaleString('en-US')}</div>
          <div className="stat-sub">Бүх дансны тоо</div>
        </div>
        <div className={`${ADMIN_STAT_CARD_CLS} stat-card`}>
          <div className="stat-label">Арга хэмжээ</div>
          <div className="stat-value">{upcomingCount}</div>
          <div className="stat-sub">Идэвхтэй жагсаалт</div>
        </div>
      </div>

      <div className={ADMIN_CARD_CLS} style={{ marginBottom: 18 }}>
        <h3>Сүүлийн 30 хоногийн орлого</h3>
        <Sparkline series={stats.last30d} />
      </div>

      <div className={`${ADMIN_GRID_CLS} ${ADMIN_GRID_2_CLS}`}>
        <div className={ADMIN_CARD_CLS}>
          <h3>Сүүлийн захиалга</h3>
          {recentOrders.length === 0 ? (
            <div className={ADMIN_EMPTY_CLS}><strong>Захиалга алга</strong>Эхний борлуулалт энд гарч ирнэ.</div>
          ) : (
            <table className={ADMIN_TABLE_CLS}>
              <thead>
                <tr><th>Код</th><th>Арга хэмжээ</th><th>Хэрэглэгч</th><th style={{ textAlign: 'right' }}>Дүн</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.code}>
                    <td><Link className={ADMIN_LINK_CLS} to={`/admin/orders/${o.code}`}>{o.code}</Link></td>
                    <td>{o.title}</td>
                    <td>{o.user || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={ADMIN_CARD_CLS}>
          <h3>Сүүлд бүртгүүлсэн</h3>
          {recentUsers.length === 0 ? (
            <div className={ADMIN_EMPTY_CLS}><strong>Шинэ хэрэглэгч алга</strong>Бүртгэлүүд энд гарч ирнэ.</div>
          ) : (
            <table className={ADMIN_TABLE_CLS}>
              <thead>
                <tr><th>Нэр</th><th>Контакт</th><th>Огноо</th></tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.identifier}>
                    <td><Link className={ADMIN_LINK_CLS} to={`/admin/users/${encodeURIComponent(u.identifier)}`}>{u.fullname || '—'}</Link></td>
                    <td>{u.identifier}</td>
                    <td>{(u.createdAt || '').slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

type SparkSeries = OrdersStats['last30d'];

function Sparkline({ series }: { series: SparkSeries }) {
  if (!series || series.length === 0) return null;
  const W = 800, H = 140, P = 8;
  const max = Math.max(1, ...series.map((d) => d.total));
  const step = (W - P * 2) / (series.length - 1 || 1);
  const points: [number, number][] = series.map((d, i) => {
    const x = P + i * step;
    const y = H - P - (d.total / max) * (H - P * 2);
    return [x, y];
  });
  const path = points.map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`)).join(' ');
  const fill = `${path} L ${points[points.length - 1][0]},${H - P} L ${P},${H - P} Z`;
  return (
    <svg className={ADMIN_SPARKLINE_CLS} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={fill} fill="rgba(34,48,198,0.10)" />
      <path d={path} stroke="#2230C6" strokeWidth="2" fill="none" />
      {points.map(([x, y], i) =>
        series[i].total > 0 ? <circle key={i} cx={x} cy={y} r="2.5" fill="#2230C6" /> : null,
      )}
    </svg>
  );
}
