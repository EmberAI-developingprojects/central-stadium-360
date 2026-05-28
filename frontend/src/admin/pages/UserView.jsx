import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteUser, getUser, listOrders, setUserDisabled, setUserRole } from '../../data/store.js';

const money = (n) => (n || 0).toLocaleString('en-US') + '₮';

export default function UserView() {
  const { identifier } = useParams();
  const decoded = decodeURIComponent(identifier);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);

  const load = () => {
    Promise.all([getUser(decoded), listOrders({ user: decoded })]).then(([u, o]) => {
      setUser(u);
      setOrders(o);
    });
  };

  useEffect(() => { load(); }, [decoded]);

  if (user === null) return <div className="admin-empty">Уншиж байна…</div>;
  if (!user) {
    return (
      <>
        <div className="admin-page-header">
          <div><h2>Хэрэглэгч олдсонгүй</h2></div>
          <Link to="/admin/users" className="btn">← Жагсаалт руу</Link>
        </div>
      </>
    );
  }

  const toggleRole = async () => {
    const next = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Эрхийг «${next}» болгох уу?`)) return;
    await setUserRole(user.identifier, next);
    load();
  };

  const toggleDisabled = async () => {
    await setUserDisabled(user.identifier, !user.disabled);
    load();
  };

  const onDelete = async () => {
    if (!window.confirm(`«${user.fullname || user.identifier}»-ийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    await deleteUser(user.identifier);
    navigate('/admin/users');
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>{user.fullname || user.identifier}</h2>
          <p>{user.identifier}</p>
        </div>
        <Link to="/admin/users" className="btn btn-ghost">← Жагсаалт руу</Link>
      </div>

      <div className="admin-grid admin-grid-2" style={{ marginBottom: 18 }}>
        <div className="admin-card">
          <h3>Профайл</h3>
          <table className="admin-table">
            <tbody>
              <tr><th>Бүтэн нэр</th><td>{user.fullname || '—'}</td></tr>
              <tr><th>Контакт</th><td>{user.identifier}</td></tr>
              <tr><th>Эрх</th><td><span className={user.role === 'admin' ? 'badge badge-admin' : 'badge'}>{user.role || 'user'}</span></td></tr>
              <tr><th>Төлөв</th><td>{user.disabled ? <span className="badge badge-disabled">Disabled</span> : <span className="badge badge-paid">Active</span>}</td></tr>
              <tr><th>Бүртгүүлсэн</th><td>{(user.createdAt || '').slice(0, 10) || '—'}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <h3>Үйлдэл</h3>
          <div className="admin-actions" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={toggleRole}>
              {user.role === 'admin' ? 'Эрх хасах (Demote)' : 'Админ болгох (Promote)'}
            </button>
            <button type="button" className="btn" onClick={toggleDisabled}>
              {user.disabled ? 'Дахин идэвхжүүлэх' : 'Хандалт хязгаарлах'}
            </button>
            {user.identifier !== 'admin' && (
              <button type="button" className="btn btn-danger" onClick={onDelete}>Хэрэглэгчийг устгах</button>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Захиалгууд ({orders.length})</h3>
        {orders.length === 0 ? (
          <div className="admin-empty" style={{ border: 0, padding: 0 }}>
            <strong>Захиалга алга</strong>
            Энэ хэрэглэгч одоогоор тасалбар аваагүй байна.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Код</th><th>Арга хэмжээ</th><th>Багц</th><th style={{ textAlign: 'right' }}>Нийт</th><th>Төлөв</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.code}>
                  <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                  <td>{o.title}</td>
                  <td>{o.tierName || o.tier}</td>
                  <td style={{ textAlign: 'right' }}>{money(o.total)}</td>
                  <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                  <td><Link to={`/admin/orders/${o.code}`} className="btn btn-sm">Үзэх</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
