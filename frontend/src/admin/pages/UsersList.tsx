import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders, listUsers, setUserDisabled, setUserRole } from '../../data/store';
import type { UserRecord, UserRole } from '../../data/store';

export default function UsersList() {
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');

  const load = () => {
    Promise.all([listUsers(), listOrders()]).then(([all, orders]) => {
      setUsers(all);
      const counts: Record<string, number> = {};
      orders.forEach((o) => { counts[o.user] = (counts[o.user] || 0) + 1; });
      setOrderCounts(counts);
    });
  };

  useEffect(() => { load(); }, []);

  const onToggleRole = async (u: UserRecord) => {
    const next: UserRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`«${u.fullname || u.identifier}»-ийн эрхийг «${next}» болгох уу?`)) return;
    await setUserRole(u.identifier, next);
    load();
  };

  const onToggleDisabled = async (u: UserRecord) => {
    const next = !u.disabled;
    if (next && !window.confirm(`«${u.fullname || u.identifier}»-ийн хандалтыг хязгаарлах уу?`)) return;
    await setUserDisabled(u.identifier, next);
    load();
  };

  const filtered = (users || []).filter((u) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      (u.identifier || '').toLowerCase().includes(needle) ||
      (u.fullname || '').toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h2>Хэрэглэгч</h2>
          <p>Бүртгэлтэй хэрэглэгчид. Эрх олгох, хандалт хязгаарлах.</p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Нэр / контактаар хайх…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!users ? <div className="admin-empty">Уншиж байна…</div>
        : filtered.length === 0 ? (
          <div className="admin-empty"><strong>Хэрэглэгч алга</strong></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Нэр</th>
                  <th>Контакт</th>
                  <th>Эрх</th>
                  <th>Захиалга</th>
                  <th>Бүртгүүлсэн</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.identifier}>
                    <td>
                      <Link to={`/admin/users/${encodeURIComponent(u.identifier)}`} className="admin-link">
                        {u.fullname || '—'}
                      </Link>
                      {u.disabled && <> <span className="badge badge-disabled">Disabled</span></>}
                    </td>
                    <td>{u.identifier}</td>
                    <td>
                      <span className={u.role === 'admin' ? 'badge badge-admin' : 'badge'}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td>{orderCounts[u.identifier] || 0}</td>
                    <td>{(u.createdAt || '').slice(0, 10)}</td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" className="btn btn-sm" onClick={() => onToggleRole(u)}>
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => onToggleDisabled(u)}>
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                      </div>
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
