import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders } from '../../data/store.js';

const money = (n) => (n || 0).toLocaleString('en-US') + '₮';

const STATUS_BADGE = {
  paid: 'badge badge-paid',
  refunded: 'badge badge-refunded',
  cancelled: 'badge badge-cancelled',
};

export default function OrdersList() {
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    listOrders({ q, status }).then(setOrders);
  }, [q, status]);

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>Захиалга</h2>
          <p>Бүх тасалбарын борлуулалт. Шууд буцаалт хийх боломжтой.</p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Код, хэрэглэгч, арга хэмжээгээр хайх…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Бүх төлөв</option>
          <option value="paid">Төлбөртэй</option>
          <option value="refunded">Буцаагдсан</option>
        </select>
      </div>

      {!orders ? <div className="admin-empty">Уншиж байна…</div>
        : orders.length === 0 ? (
          <div className="admin-empty">
            <strong>Захиалга алга</strong>
            Хайлтын үр дүнд таарсан захиалга алга байна.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Арга хэмжээ</th>
                  <th>Хэрэглэгч</th>
                  <th>Багц</th>
                  <th>Тоо</th>
                  <th style={{ textAlign: 'right' }}>Нийт</th>
                  <th>Төлбөр</th>
                  <th>Огноо</th>
                  <th>Төлөв</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.code}>
                    <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                    <td>{o.title}</td>
                    <td>{o.user || '—'}</td>
                    <td>{o.tierName || o.tier}</td>
                    <td>{o.qty}</td>
                    <td style={{ textAlign: 'right' }}>{money(o.total)}</td>
                    <td>{o.paymentName || o.payment}</td>
                    <td>{(o.purchasedAt || '').slice(0, 10)}</td>
                    <td>
                      <span className={STATUS_BADGE[o.status] || 'badge'}>
                        {o.status === 'paid' ? 'Төлбөртэй'
                          : o.status === 'refunded' ? 'Буцаагдсан'
                          : o.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/orders/${o.code}`} className="btn btn-sm">Үзэх</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}
