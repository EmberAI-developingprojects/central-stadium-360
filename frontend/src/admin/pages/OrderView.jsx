import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelOrder, getOrder, refundOrder } from '../../data/store.js';

const money = (n) => (n || 0).toLocaleString('en-US') + '₮';

export default function OrderView() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getOrder(code).then(setOrder); }, [code]);

  if (order === null) return <div className="admin-empty">Уншиж байна…</div>;
  if (!order) {
    return (
      <>
        <div className="admin-page-header">
          <div><h2>Захиалга олдсонгүй</h2></div>
          <Link to="/admin/orders" className="btn">← Жагсаалт руу</Link>
        </div>
      </>
    );
  }

  const onRefund = async () => {
    if (!window.confirm(`«${order.code}» захиалгыг буцаах уу?`)) return;
    setBusy(true);
    try {
      const next = await refundOrder(order.code);
      setOrder(next);
    } finally { setBusy(false); }
  };

  const onCancel = async () => {
    if (!window.confirm(`«${order.code}» захиалгыг бүрмөсөн устгах уу?`)) return;
    setBusy(true);
    try {
      await cancelOrder(order.code);
      navigate('/admin/orders');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>{order.title}</h2>
          <p>Код: <code>{order.code}</code></p>
        </div>
        <Link to="/admin/orders" className="btn btn-ghost">← Жагсаалт руу</Link>
      </div>

      <div className="admin-grid admin-grid-2">
        <div className="admin-card">
          <h3>Дэлгэрэнгүй</h3>
          <table className="admin-table">
            <tbody>
              <tr><th>Хэрэглэгч</th><td>{order.user || '—'}</td></tr>
              <tr><th>Багц</th><td>{order.tierName || order.tier}</td></tr>
              <tr><th>Тоо</th><td>{order.qty}</td></tr>
              <tr><th>Нэгжийн үнэ</th><td>{money(order.unitPrice)}</td></tr>
              <tr><th>Нийт</th><td><strong>{money(order.total)}</strong></td></tr>
              <tr><th>Төлбөрийн хэрэгсэл</th><td>{order.paymentName || order.payment}</td></tr>
              <tr><th>Худалдан авсан огноо</th><td>{(order.purchasedAt || '').replace('T', ' ').slice(0, 19)}</td></tr>
              <tr><th>Төлөв</th><td>{order.status}</td></tr>
              {order.refundedAt && (
                <tr><th>Буцаагдсан</th><td>{order.refundedAt.replace('T', ' ').slice(0, 19)}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <h3>Үйлдэл</h3>
          {order.status === 'refunded' ? (
            <p style={{ color: 'var(--admin-muted)' }}>
              Энэ захиалгыг аль хэдийн буцаасан байна.
            </p>
          ) : (
            <p style={{ color: 'var(--admin-muted)' }}>
              Буцаалт хийвэл захиалгын төлөв «refunded» болж, бүртгэлээс хасагдахгүй.
              Бүрмөсөн устгахыг сонговол захиалга мэдээллийн санд үлдэхгүй.
            </p>
          )}
          <div className="admin-actions" style={{ marginTop: 14 }}>
            {order.status !== 'refunded' && (
              <button type="button" className="btn btn-primary" onClick={onRefund} disabled={busy}>Буцаалт хийх</button>
            )}
            <button type="button" className="btn btn-danger" onClick={onCancel} disabled={busy}>Бүрмөсөн устгах</button>
          </div>
        </div>
      </div>
    </>
  );
}
