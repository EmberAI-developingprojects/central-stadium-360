import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
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
  ADMIN_BTN_SM_CLS,
  ADMIN_EMPTY_CLS,
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

  useEffect(() => {
    load();
  }, []);

  const onToggleRole = async (u: UserRecord) => {
    const next: UserRole = u.role === "admin" ? "user" : "admin";
    if (
      !window.confirm(
        `«${u.fullname || u.identifier}»-ийн эрхийг «${next}» болгох уу?`,
      )
    )
      return;
    try {
      await setUserRole(u.id, next);
      load();
    } catch (e) {
      window.alert((e as Error).message || "Эрх солих боломжгүй.");
    }
  };

  const onToggleDisabled = async (u: UserRecord) => {
    const next = !u.disabled;
    if (
      next &&
      !window.confirm(
        `«${u.fullname || u.identifier}»-ийн хандалтыг хязгаарлах уу?`,
      )
    )
      return;
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
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Хэрэглэгч алга</strong>
        </div>
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
                    <Link
                      to={`/admin/users/${u.id}`}
                      className={ADMIN_LINK_CLS}
                    >
                      {u.fullname || "—"}
                    </Link>
                    {u.disabled && (
                      <>
                        {" "}
                        <span
                          className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_DISABLED_CLS}`}
                        >
                          Disabled
                        </span>
                      </>
                    )}
                  </td>
                  <td>{u.identifier}</td>
                  <td>
                    <span
                      className={
                        u.role === "admin"
                          ? `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_ADMIN_CLS}`
                          : ADMIN_BADGE_CLS
                      }
                    >
                      {u.role || "user"}
                    </span>
                  </td>
                  <td>{orderCounts[u.identifier] || 0}</td>
                  <td>{(u.createdAt || "").slice(0, 10)}</td>
                  <td>
                    <div className={ADMIN_ACTIONS_CLS}>
                      <button
                        type="button"
                        className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                        onClick={() => onToggleRole(u)}
                      >
                        {u.role === "admin" ? "Demote" : "Promote"}
                      </button>
                      <button
                        type="button"
                        className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
                        onClick={() => onToggleDisabled(u)}
                      >
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
    </>
  );
}
