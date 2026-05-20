import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth, useRequireAuth } from '../auth.jsx';
import UserMenu from '../components/UserMenu.jsx';

const TICKETS_KEY = 'tsengeldekh_tickets';

const PAY_LABEL = {
  qpay: 'QPay',
  socialpay: 'SocialPay',
  card: 'Карт',
};

function readOrders() {
  try { return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]'); }
  catch { return []; }
}
function writeOrders(all) {
  try { localStorage.setItem(TICKETS_KEY, JSON.stringify(all)); } catch {}
}

const money = (n) => (n || 0).toLocaleString('en-US') + '₮';
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('mn-MN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

export default function OrderDetail() {
  const session = useRequireAuth();
  const { code } = useParams();
  const navigate = useNavigate();
  const { } = useAuth();

  const orders = useMemo(() => readOrders(), []);
  const order = orders.find((t) => t.code === code);
  const owned = order && (!order.user || order.user === session?.identifier);

  if (!session) return null;

  const onCancel = () => {
    if (!order) return;
    if (!confirm('Энэ захиалгыг буцаах уу? Үүнийг сэргээх боломжгүй.')) return;
    writeOrders(readOrders().filter((t) => t.code !== order.code));
    navigate('/watch#tickets', { replace: true });
  };

  const onPrint = () => window.print();

  return (
    <div className="watch-page order-page">

      <header className="watch-header">
        <Link className="watch-logo" to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img src="/assets/images/brand/logo-white.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
        </Link>
        <nav className="watch-tabs" aria-label="Үзэх төрөл">
          <Link className="watch-tab" to="/watch">Шууд</Link>
          <Link className="watch-tab" to="/watch#upcoming">Удахгүй</Link>
          <Link className="watch-tab is-active" to="/watch#tickets">Тасалбар</Link>
        </nav>
        <div className="watch-user">
          <UserMenu />
        </div>
      </header>

      <main className="watch-main order-main">

        <div className="order-back">
          <Link to="/watch#tickets" className="order-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Худалдан авалтын түүх
          </Link>
        </div>

        {!order ? (
          <section className="order-empty">
            <h1>Захиалга олдсонгүй</h1>
            <p>Энэ кодтой захиалга байхгүй эсвэл устгагдсан байна.</p>
            <Link to="/watch#tickets" className="watch-btn watch-btn-primary">Миний тасалбарууд</Link>
          </section>
        ) : !owned ? (
          <section className="order-empty">
            <h1>Хандах эрхгүй</h1>
            <p>Энэ захиалга өөр хэрэглэгчийнх байна.</p>
            <Link to="/watch#tickets" className="watch-btn watch-btn-primary">Миний тасалбарууд</Link>
          </section>
        ) : (
          <article className="order-card">

            <header className="order-hero">
              <img src={order.image} alt={order.title} className="order-hero-img" />
              <div className="order-hero-meta">
                <span className="order-status">
                  <span className="order-status-dot" aria-hidden="true"></span>
                  Идэвхтэй захиалга
                </span>
                <h1 className="order-title">{order.title}</h1>
                <span className="order-event-date">{order.date}</span>
                <span className="order-venue">📡 Онлайн шууд дамжуулал · энэ вэбсайтаас үзнэ</span>
              </div>
            </header>

            <div className="order-grid">

              <section className="order-section">
                <h2 className="order-section-title">Захиалгын мэдээлэл</h2>
                <dl className="order-meta">
                  <div><dt>Захиалгын код</dt><dd className="order-code">{order.code}</dd></div>
                  <div><dt>Худалдаж авсан</dt><dd>{fmtDateTime(order.purchasedAt)}</dd></div>
                  <div><dt>Хэрэглэгч</dt><dd>{session.fullname || session.identifier}</dd></div>
                  <div><dt>Төлөв</dt><dd>Төлбөр төлөгдсөн</dd></div>
                </dl>
              </section>

              <section className="order-section">
                <h2 className="order-section-title">Үзэх багц</h2>
                <dl className="order-meta">
                  <div><dt>Багц</dt><dd>{order.tierName}</dd></div>
                  <div><dt>Үзэх эрх</dt><dd>{order.qty} төхөөрөмж</dd></div>
                  <div><dt>Чанар</dt><dd>{order.tier === 'platinum' ? '4K · 360° + 30 хоног дахин үзэх' : order.tier === 'vip' ? '4K · 360°' : 'HD 1080p'}</dd></div>
                </dl>
              </section>

              <section className="order-section order-section-wide">
                <h2 className="order-section-title">Төлбөр</h2>
                <table className="order-line-items">
                  <thead>
                    <tr>
                      <th>Зүйл</th>
                      <th>Нэгж үнэ</th>
                      <th>Тоо</th>
                      <th>Дүн</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{order.tierName} — {order.title}</td>
                      <td>{money(order.unitPrice)}</td>
                      <td>{order.qty}</td>
                      <td>{money(order.unitPrice * order.qty)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr><th colSpan="3">Дэд дүн</th><td>{money(order.unitPrice * order.qty)}</td></tr>
                    <tr><th colSpan="3">НӨАТ (багтсан)</th><td>{money(Math.round(order.total - order.total / 1.1))}</td></tr>
                    <tr className="order-total-row"><th colSpan="3">Нийт төлсөн</th><td>{money(order.total)}</td></tr>
                  </tfoot>
                </table>
                <p className="order-pay-method">
                  <span>Төлбөрийн хэрэгсэл:</span>
                  <strong>{order.paymentName || PAY_LABEL[order.payment] || order.payment}</strong>
                </p>
              </section>

              <section className="order-section order-qr">
                <h2 className="order-section-title">Нэвтрэх QR</h2>
                <div className="order-qr-box" aria-label="QR код placeholder">
                  <svg viewBox="0 0 64 64" width="160" height="160" aria-hidden="true">
                    <rect width="64" height="64" fill="#fff"/>
                    {Array.from({ length: 36 }).map((_, i) => {
                      const x = (i % 6) * 9 + 5;
                      const y = Math.floor(i / 6) * 9 + 5;
                      const fill = hashFill(order.code, i);
                      return <rect key={i} x={x} y={y} width="8" height="8" fill={fill} />;
                    })}
                  </svg>
                  <span className="order-qr-code">{order.code}</span>
                </div>
                <p className="order-qr-hint">Эфирийн цагт энэ кодыг ашиглан үзэх эрхтэй болно.</p>
              </section>

            </div>

            <footer className="order-actions">
              <Link to="/watch" className="watch-btn watch-btn-primary">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                Шууд үзэх
              </Link>
              <button type="button" className="watch-btn watch-btn-ghost" onClick={onPrint}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Хэвлэх
              </button>
              <button type="button" className="watch-btn order-btn-danger" onClick={onCancel}>
                Захиалга цуцлах
              </button>
            </footer>

          </article>
        )}

      </main>
    </div>
  );
}

// Make the placeholder "QR" deterministic per order so it looks like a real code
// rather than a random pattern that flickers on every render.
function hashFill(seed, i) {
  let h = 0;
  for (let k = 0; k < seed.length; k++) h = (h * 31 + seed.charCodeAt(k)) >>> 0;
  return ((h >>> (i % 31)) & 1) ? '#0B0F1A' : '#fff';
}
