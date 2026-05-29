import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteUser, getUser, listOrders, setUserDisabled, setUserRole } from '../../data/store';
import type { OrderRecord, UserRecord, UserRole } from '../../data/store';
import { ADMIN_ACTIONS_CLS, ADMIN_BADGE_CLS, ADMIN_BADGE_DISABLED_CLS, ADMIN_BADGE_PAID_CLS, ADMIN_BTN_CLS, ADMIN_BTN_DANGER_CLS, ADMIN_BTN_GHOST_CLS, ADMIN_BTN_PRIMARY_CLS, ADMIN_BTN_SM_CLS, ADMIN_CARD_CLS, ADMIN_EMPTY_CLS, ADMIN_GRID_2_CLS, ADMIN_GRID_CLS, ADMIN_PAGE_HEADER_CLS, ADMIN_TABLE_CLS } from '../_adminStyles';

const money = (n: number | undefined): string => (n || 0).toLocaleString('en-US') + '₮';

type LoadState = UserRecord | null | undefined;

export default function UserView() {
  const { identifier } = useParams<{ identifier: string }>();
  const decoded = decodeURIComponent(identifier ?? '');
  const navigate = useNavigate();
  const [user, setUser] = useState<LoadState>(undefined);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const load = () => {
    Promise.all([getUser(decoded), listOrders({ user: decoded })]).then(([u, o]) => {
      setUser(u);
      setOrders(o);
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [decoded]);

  if (user === undefined) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;
  if (!user) {
    return (
      <>
        <div className={ADMIN_PAGE_HEADER_CLS}>
          <div><h2>Хэрэглэгч олдсонгүй</h2></div>
          <Link to="/admin/users" className="btn">← Жагсаалт руу</Link>
        </div>
      </>
    );
  }

  const toggleRole = async () => {
    const next: UserRole = user.role === 'admin' ? 'user' : 'admin';
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
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{user.fullname || user.identifier}</h2>
          <p>{user.identifier}</p>
        </div>
        <Link to="/admin/users" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}>← Жагсаалт руу</Link>
      </div>

      <div className={`${ADMIN_GRID_CLS} ${ADMIN_GRID_2_CLS}`} style={{ marginBottom: 18 }}>
        <div className={ADMIN_CARD_CLS}>
          <h3>Профайл</h3>
          <table className={ADMIN_TABLE_CLS}>
            <tbody>
              <tr><th>Бүтэн нэр</th><td>{user.fullname || '—'}</td></tr>
              <tr><th>Контакт</th><td>{user.identifier}</td></tr>
              <tr><th>Эрх</th><td><span className={user.role === 'admin' ? 'badge badge-admin' : 'badge'}>{user.role || 'user'}</span></td></tr>
              <tr><th>Төлөв</th><td>{user.disabled ? <span className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_DISABLED_CLS}`}>Disabled</span> : <span className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_PAID_CLS}`}>Active</span>}</td></tr>
              <tr><th>Бүртгүүлсэн</th><td>{(user.createdAt || '').slice(0, 10) || '—'}</td></tr>
            </tbody>
          </table>
        </div>

        <div className={ADMIN_CARD_CLS}>
          <h3>Үйлдэл</h3>
          <div className={ADMIN_ACTIONS_CLS} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`} onClick={toggleRole}>
              {user.role === 'admin' ? 'Эрх хасах (Demote)' : 'Админ болгох (Promote)'}
            </button>
            <button type="button" className="btn" onClick={toggleDisabled}>
              {user.disabled ? 'Дахин идэвхжүүлэх' : 'Хандалт хязгаарлах'}
            </button>
            {user.identifier !== 'admin' && (
              <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`} onClick={onDelete}>Хэрэглэгчийг устгах</button>
            )}
          </div>
        </div>
      </div>

      <div className={ADMIN_CARD_CLS}>
        <h3>Захиалгууд ({orders.length})</h3>
        {orders.length === 0 ? (
          <div className={ADMIN_EMPTY_CLS} style={{ border: 0, padding: 0 }}>
            <strong>Захиалга алга</strong>
            Энэ хэрэглэгч одоогоор тасалбар аваагүй байна.
          </div>
        ) : (
          <table className={ADMIN_TABLE_CLS}>
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
                  <td><Link to={`/admin/orders/${o.code}`} className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}>Үзэх</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
