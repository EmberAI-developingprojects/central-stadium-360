import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createUser,
  listOrders,
  listUsers,
  setUserDisabled,
  setUserRole,
} from "../../data/store";
import type { UserRecord, UserRole } from "../../data/store";
import {
  ADMIN_ACTIONS_CLS,
  ADMIN_BADGE_ADMIN_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_DISABLED_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_LINK_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

export default function UsersList() {
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    Promise.all([listUsers(), listOrders()]).then(([all, orders]) => {
      setUsers(all);
      const counts: Record<string, number> = {};
      orders.forEach((o) => {
        counts[o.user] = (counts[o.user] || 0) + 1;
      });
      setOrderCounts(counts);
    });
  };

  useEffect(() => { load(); }, []);

  const onToggleRole = async (u: UserRecord) => {
    const next: UserRole = u.role === "admin" ? "user" : "admin";
    if (!window.confirm(`«${u.fullname || u.identifier}»-ийн эрхийг «${next}» болгох уу?`)) return;
    try {
      await setUserRole(u.id, next);
      load();
    } catch (e) {
      window.alert((e as Error).message || "Эрх солих боломжгүй.");
    }
  };

  const onToggleDisabled = async (u: UserRecord) => {
    const next = !u.disabled;
    if (next && !window.confirm(`«${u.fullname || u.identifier}»-ийн хандалтыг хязгаарлах уу?`)) return;
    try {
      await setUserDisabled(u.id, next);
      load();
    } catch (e) {
      window.alert((e as Error).message || "Үйлдэл амжилтгүй.");
    }
  };

  const filtered = (users || []).filter((u) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      (u.identifier || "").toLowerCase().includes(needle) ||
      (u.fullname || "").toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Хэрэглэгч</h2>
          <p>Бүртгэлтэй хэрэглэгчид. Эрх олгох, хандалт хязгаарлах.</p>
        </div>
        <button
          type="button"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
          onClick={() => setShowModal(true)}
          style={{ gap: 6, flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Шинэ хэрэглэгч
        </button>
      </div>

      <div className={ADMIN_FILTERS_CLS}>
        <input
          type="search"
          placeholder="Нэр / контактаар хайх…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!users ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : filtered.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}><strong>Хэрэглэгч алга</strong></div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
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
                <tr key={u.id}>
                  <td>
                    <Link to={`/admin/users/${u.id}`} className={ADMIN_LINK_CLS}>
                      {u.fullname || "—"}
                    </Link>
                    {u.disabled && (
                      <>{" "}<span className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_DISABLED_CLS}`}>Disabled</span></>
                    )}
                  </td>
                  <td>{u.identifier}</td>
                  <td>
                    <span className={u.role === "admin" ? `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_ADMIN_CLS}` : ADMIN_BADGE_CLS}>
                      {u.role || "user"}
                    </span>
                  </td>
                  <td>{orderCounts[u.identifier] || 0}</td>
                  <td>{(u.createdAt || "").slice(0, 10)}</td>
                  <td>
                    <div className={ADMIN_ACTIONS_CLS}>
                      <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`} onClick={() => onToggleRole(u)}>
                        {u.role === "admin" ? "Demote" : "Promote"}
                      </button>
                      <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`} onClick={() => onToggleDisabled(u)}>
                        {u.disabled ? "Enable" : "Disable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </>
  );
}

/* ── Add User Modal ── */
function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await createUser({ email, password, full_name: fullName, role });
      onCreated();
    } catch (ex) {
      setErr((ex as Error).message || "Алдаа гарлаа");
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
          backdropFilter: "blur(3px)", zIndex: 400,
        }}
      />
      {/* Dialog */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 16, padding: "28px 32px",
        width: 420, maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,.18)",
        zIndex: 401,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111" }}>
            Шинэ хэрэглэгч нэмэх
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className={ADMIN_FIELD_CLS}>
            <label>И-мэйл *</label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Нууц үг * (6+ тэмдэгт)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Бүтэн нэр</label>
            <input
              type="text"
              placeholder="Овог Нэр"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label>Эрх</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {err && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13 }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className={ADMIN_BTN_CLS} onClick={onClose} disabled={saving}>
              Болих
            </button>
            <button type="submit" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`} disabled={saving}>
              {saving ? "Нэмж байна…" : "Нэмэх"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
