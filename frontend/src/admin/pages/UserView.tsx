import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteUser,
  getUser,
  listOrders,
  setUserDisabled,
  setUserRole,
} from "../../data/store";
import type { OrderRecord, UserRecord, UserRole } from "../../data/store";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  ADMIN_ACTIONS_CLS,
  ADMIN_BADGE_ADMIN_CLS,
  ADMIN_BADGE_CANCELLED_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_DISABLED_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BADGE_REFUNDED_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_CARD_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_GRID_2_CLS,
  ADMIN_GRID_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
} from "../_adminStyles";

const ORDER_STATUS_BADGE: Record<string, string> = {
  paid: `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_PAID_CLS}`,
  refunded: `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_REFUNDED_CLS}`,
  cancelled: `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_CANCELLED_CLS}`,
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  paid: "Төлсөн",
  refunded: "Буцаагдсан",
  cancelled: "Цуцлагдсан",
};

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

type LoadState = UserRecord | null | undefined;

export default function UserView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [user, setUser] = useState<LoadState>(undefined);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const load = () => {
    if (!id) return;
    getUser(id).then((u) => {
      setUser(u);
      if (u) {
        listOrders({ user: u.identifier }).then(setOrders);
      } else {
        setOrders([]);
      }
    });
  };

  useEffect(() => {
    load();
  }, [id]);

  if (user === undefined)
    return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;
  if (!user) {
    return (
      <>
        <div className={ADMIN_PAGE_HEADER_CLS}>
          <div>
            <h2>Хэрэглэгч олдсонгүй</h2>
          </div>
          <Link to="/admin/users" className={ADMIN_BTN_CLS}>
            ← Жагсаалт руу
          </Link>
        </div>
      </>
    );
  }

  const who = user.fullname || user.identifier;

  const toggleRole = async () => {
    const next: UserRole = user.role === "admin" ? "user" : "admin";
    const nextLabel = next === "admin" ? "Админ" : "Хэрэглэгч";
    const ok = await confirm({
      title:
        next === "admin"
          ? "Хэрэглэгчийг админ болгох уу?"
          : "Админ эрхийг хасах уу?",
      message: (
        <>
          Энэ хэрэглэгчийн эрхийг{" "}
          <strong className="font-semibold text-zinc-900">«{nextLabel}»</strong>{" "}
          болгоно.
        </>
      ),
      confirmLabel: next === "admin" ? "Админ болгох" : "Эрх хасах",
      cancelLabel: "Болих",
      variant: next === "admin" ? "default" : "warning",
    });
    if (!ok) return;
    try {
      await setUserRole(user.id, next);
      toast.success(
        next === "admin"
          ? "Хэрэглэгчийг админ болголоо."
          : "Админ эрхийг хаслаа.",
      );
      load();
    } catch (e) {
      toast.error((e as Error).message || "Эрх солих боломжгүй.");
    }
  };

  const toggleDisabled = async () => {
    const next = !user.disabled;
    if (next) {
      const ok = await confirm({
        title: "Хандалтыг хязгаарлах уу?",
        message:
          "Хэрэглэгч системд нэвтэрч чадахгүй болно. Та дараа нь буцааж нээж болно.",
        confirmLabel: "Хязгаарлах",
        cancelLabel: "Болих",
        variant: "danger",
      });
      if (!ok) return;
    }
    try {
      await setUserDisabled(user.id, next);
      toast.success(
        next ? "Хандалтыг хязгаарласан." : "Хэрэглэгчийг дахин идэвхжүүлсэн.",
      );
      load();
    } catch (e) {
      toast.error((e as Error).message || "Үйлдэл амжилтгүй.");
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Хэрэглэгчийг устгах уу?",
      message: (
        <>
          <strong className="font-semibold text-zinc-900">«{who}»</strong> бүх
          захиалга, өгөгдлийн хамт устгагдана. Энэ үйлдлийг буцаах боломжгүй.
        </>
      ),
      confirmLabel: "Бүрмөсөн устгах",
      cancelLabel: "Болих",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteUser(user.id);
      toast.success(`«${who}» устгалаа.`);
      navigate("/admin/users");
    } catch (e) {
      toast.error((e as Error).message || "Устгах боломжгүй.");
    }
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{user.fullname || user.identifier}</h2>
          <p>{user.identifier}</p>
        </div>
        <Link
          to="/admin/users"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Жагсаалт руу
        </Link>
      </div>

      <div
        className={`${ADMIN_GRID_CLS} ${ADMIN_GRID_2_CLS}`}
        style={{ marginBottom: 18 }}
      >
        <div className={ADMIN_CARD_CLS}>
          <h3>Профайл</h3>
          <table className={ADMIN_TABLE_CLS}>
            <tbody>
              <tr>
                <th>Нэр</th>
                <td>{user.fullname || "—"}</td>
              </tr>
              <tr>
                <th>Бүртгэл</th>
                <td>{user.identifier}</td>
              </tr>
              <tr>
                <th>Эрх</th>
                <td>
                  <span
                    className={
                      user.role === "admin"
                        ? `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_ADMIN_CLS}`
                        : ADMIN_BADGE_CLS
                    }
                  >
                    {user.role === "admin" ? "Админ" : "Хэрэглэгч"}
                  </span>
                </td>
              </tr>
              <tr>
                <th>Төлөв</th>
                <td>
                  {user.disabled ? (
                    <span
                      className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_DISABLED_CLS}`}
                    >
                      Хязгаарлагдсан
                    </span>
                  ) : (
                    <span
                      className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_PAID_CLS}`}
                    >
                      Идэвхтэй
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <th>Бүртгүүлсэн</th>
                <td>{(user.createdAt || "").slice(0, 10) || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={ADMIN_CARD_CLS}>
          <h3>Үйлдэл</h3>
          <div
            className={ADMIN_ACTIONS_CLS}
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
              onClick={toggleRole}
            >
              {user.role === "admin" ? "Эрх хасах" : "Админ болгох"}
            </button>
            <button
              type="button"
              className={ADMIN_BTN_CLS}
              onClick={toggleDisabled}
            >
              {user.disabled ? "Дахин идэвхжүүлэх" : "Хандалт хязгаарлах"}
            </button>
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={onDelete}
            >
              Хэрэглэгчийг устгах
            </button>
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
              <tr>
                <th>Код</th>
                <th>Арга хэмжээ</th>
                <th style={{ textAlign: "right" }}>Нийт</th>
                <th>Төлөв</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.code}>
                  <td>
                    <code style={{ fontSize: 12 }}>{o.code}</code>
                  </td>
                  <td>{o.title}</td>
                  <td style={{ textAlign: "right" }}>{money(o.total)}</td>
                  <td>
                    <span
                      className={
                        ORDER_STATUS_BADGE[o.status] || ADMIN_BADGE_CLS
                      }
                    >
                      {ORDER_STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/admin/orders/${o.code}`}
                      className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                    >
                      Үзэх
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
