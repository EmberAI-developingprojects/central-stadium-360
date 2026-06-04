import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createUser,
  listOrders,
  listUsers,
  setUserDisabled,
  setUserRole,
} from "../../data/store";
import type { UserRecord, UserRole } from "../../data/store";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_LINK_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

type RoleFilter = "all" | "admin" | "user" | "disabled";

export default function UsersList() {
  const confirm = useConfirm();
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
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

  const stats = useMemo(() => {
    const list = users || [];
    const admins = list.filter((u) => u.role === "admin").length;
    const disabled = list.filter((u) => u.disabled).length;
    const active = list.filter((u) => !u.disabled).length;
    return { total: list.length, admins, disabled, active };
  }, [users]);

  const onToggleRole = async (u: UserRecord) => {
    const next: UserRole = u.role === "admin" ? "user" : "admin";
    const who = u.fullname || u.identifier;
    const nextLabel = next === "admin" ? "Админ" : "Хэрэглэгч";
    const ok = await confirm({
      title: next === "admin" ? "Хэрэглэгчийг админ болгох уу?" : "Админ эрхийг хасах уу?",
      message: (
        <>
          <strong className="font-semibold text-zinc-900">«{who}»</strong>
          {" "}-ийн эрхийг <strong className="font-semibold text-zinc-900">«{nextLabel}»</strong> болгоно.
        </>
      ),
      confirmLabel: next === "admin" ? "Админ болгох" : "Эрх хасах",
      cancelLabel: "Болих",
      variant: next === "admin" ? "default" : "warning",
    });
    if (!ok) return;
    try {
      await setUserRole(u.id, next);
      toast.success(
        next === "admin"
          ? `«${who}» админ болсон.`
          : `«${who}»-ийн админ эрхийг хассан.`,
      );
      load();
    } catch (e) {
      toast.error((e as Error).message || "Эрх солих боломжгүй.");
    }
  };

  const onToggleDisabled = async (u: UserRecord) => {
    const next = !u.disabled;
    const who = u.fullname || u.identifier;
    if (next) {
      const ok = await confirm({
        title: "Хандалтыг хязгаарлах уу?",
        message: (
          <>
            <strong className="font-semibold text-zinc-900">«{who}»</strong>
            {" "}хэрэглэгч системд нэвтэрч чадахгүй болно. Та дараа нь буцааж нээж болно.
          </>
        ),
        confirmLabel: "Хязгаарлах",
        cancelLabel: "Болих",
        variant: "danger",
      });
      if (!ok) return;
    }
    try {
      await setUserDisabled(u.id, next);
      toast.success(
        next
          ? `«${who}»-ийн хандалтыг хязгаарласан.`
          : `«${who}»-ийг дахин идэвхжүүлсэн.`,
      );
      load();
    } catch (e) {
      toast.error((e as Error).message || "Үйлдэл амжилтгүй.");
    }
  };

  const filtered = (users || []).filter((u) => {
    if (filter === "admin" && u.role !== "admin") return false;
    if (filter === "user" && u.role === "admin") return false;
    if (filter === "disabled" && !u.disabled) return false;
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

      {users && users.length > 0 && (
        <div className="grid gap-3 mb-5 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <StatCard
            label="Нийт хэрэглэгч"
            value={stats.total.toString()}
            sub={`${stats.active} идэвхтэй`}
          />
          <StatCard
            label="Идэвхтэй"
            value={stats.active.toString()}
            sub={
              stats.active > 0
                ? "системд хандах эрхтэй"
                : "идэвхтэй хэрэглэгч алга"
            }
            accent="active"
          />
          <StatCard
            label="Админ"
            value={stats.admins.toString()}
            sub={stats.admins > 0 ? "өндөр эрхтэй" : "админ хэрэглэгч алга"}
            accent={stats.admins > 0 ? "admin" : undefined}
          />
          <StatCard
            label="Хязгаарлагдсан"
            value={stats.disabled.toString()}
            sub={
              stats.disabled > 0
                ? "нэвтрэх боломжгүй"
                : "бүгд идэвхтэй"
            }
            accent={stats.disabled > 0 ? "disabled" : undefined}
          />
        </div>
      )}

      <div className={ADMIN_FILTERS_CLS}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Нэр / контактаар хайх…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="!pl-9"
          />
        </div>
        <div className="inline-flex bg-white border border-[#e4e4e7] rounded-md p-0.5 gap-0.5">
          {(
            [
              ["all", "Бүгд"],
              ["admin", "Админ"],
              ["user", "Хэрэглэгч"],
              ["disabled", "Хязгаарлагдсан"],
            ] as Array<[RoleFilter, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 h-8 rounded text-[12.5px] font-medium transition-colors ${
                filter === key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {users && users.length > 0 && (
          <span className="text-[12px] text-zinc-500 ml-auto">
            Нийт <strong className="font-semibold text-zinc-900">{filtered.length}</strong>
            {(q || filter !== "all") && ` / ${users.length}`}
          </span>
        )}
      </div>

      {!users ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : filtered.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Хэрэглэгч олдсонгүй</strong>
          {q || filter !== "all"
            ? "Хайлт болон шүүлтүүрээ тохируулна уу."
            : "Эхний хэрэглэгчээ нэмэхийн тулд «Шинэ хэрэглэгч» товч дээр дарна уу."}
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Хэрэглэгч</th>
                <th>Эрх</th>
                <th style={{ textAlign: "center" }}>Захиалга</th>
                <th>Бүртгүүлсэн</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const display = u.fullname || u.identifier;
                const initial = (u.fullname || u.identifier || "?")
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                const isAdmin = u.role === "admin";
                const orderCount = orderCounts[u.identifier] || 0;
                return (
                  <tr key={u.id} className="group">
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ring-1 ring-inset ${
                            isAdmin
                              ? "bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700 ring-violet-200"
                              : "bg-gradient-to-br from-zinc-200 to-zinc-100 text-zinc-700 ring-zinc-200"
                          }`}
                          aria-hidden="true"
                        >
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              to={`/admin/users/${u.id}`}
                              className={`${ADMIN_LINK_CLS} truncate`}
                            >
                              {display}
                            </Link>
                            {u.disabled && (
                              <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10.5px] font-semibold px-1.5 py-0.5 leading-none">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                                ХЯЗГААРЛАГДСАН
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-zinc-500 mt-0.5 truncate">
                            {u.identifier}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-semibold px-2 py-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2l3 7h7l-5.5 4 2 8L12 17l-6.5 4 2-8L2 9h7z" />
                          </svg>
                          Админ
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[11px] font-medium px-2 py-0.5">
                          Хэрэглэгч
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums text-center">
                      {orderCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-zinc-100 text-zinc-900 text-[12px] font-semibold px-2">
                          {orderCount}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>
                    <td className="text-zinc-500 tabular-nums">
                      {(u.createdAt || "").slice(0, 10) || "—"}
                    </td>
                    <td>
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleRole(u)}
                          title={isAdmin ? "Админ эрхийг хасах" : "Админ болгох"}
                          aria-label={isAdmin ? "Админ эрхийг хасах" : "Админ болгох"}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                            isAdmin
                              ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                              : "border-[#e4e4e7] bg-white text-zinc-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200"
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2l3 7h7l-5.5 4 2 8L12 17l-6.5 4 2-8L2 9h7z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleDisabled(u)}
                          title={u.disabled ? "Дахин идэвхжүүлэх" : "Хязгаарлах"}
                          aria-label={u.disabled ? "Дахин идэвхжүүлэх" : "Хязгаарлах"}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                            u.disabled
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-[#e4e4e7] bg-white text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          }`}
                        >
                          {u.disabled ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onCreated={(name) => {
            setShowModal(false);
            toast.success(`«${name}» хэрэглэгч амжилттай нэмэгдлээ.`);
            load();
          }}
        />
      )}
    </>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await createUser({ email, password, full_name: fullName, role });
      onCreated(fullName || email);
    } catch (ex) {
      setErr((ex as Error).message || "Алдаа гарлаа");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4 animate-admin-fade-in" role="dialog" aria-modal="true" aria-labelledby="add-user-title">
      <div
        onClick={saving ? undefined : onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[440px] rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-6 animate-admin-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h3 id="add-user-title" className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
            Шинэ хэрэглэгч нэмэх
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1 -m-1 text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
            aria-label="Хаах"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
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
              <option value="user">Хэрэглэгч</option>
              <option value="admin">Админ</option>
            </select>
          </div>

          {err && (
            <div className="py-2.5 px-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[13px] leading-[1.5]">
              {err}
            </div>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <button type="button" className={ADMIN_BTN_CLS} onClick={onClose} disabled={saving}>
              Болих
            </button>
            <button type="submit" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`} disabled={saving}>
              {saving ? "Нэмж байна…" : "Нэмэх"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "active" | "admin" | "disabled";
}) {
  const valueColor =
    accent === "active"
      ? "text-emerald-700"
      : accent === "admin"
        ? "text-violet-700"
        : accent === "disabled"
          ? "text-red-600"
          : "text-zinc-900";
  return (
    <div className="bg-white border border-[#ececef] rounded-xl p-4">
      <span className="text-[11px] text-zinc-500 uppercase tracking-[.06em] font-medium">
        {label}
      </span>
      <div className={`text-[22px] font-semibold tracking-[-0.02em] leading-none mt-2 ${valueColor}`}>
        {value}
      </div>
      <div className="text-[11.5px] text-zinc-500 mt-2">{sub}</div>
    </div>
  );
}
