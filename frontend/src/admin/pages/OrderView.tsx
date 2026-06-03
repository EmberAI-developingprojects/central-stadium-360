import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cancelOrder, getOrder, refundOrder } from "../../data/store";
import type { OrderRecord } from "../../data/store";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  ADMIN_ACTIONS_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_CARD_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_GRID_2_CLS,
  ADMIN_GRID_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
} from "../_adminStyles";

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

type LoadState = OrderRecord | null | undefined;

export default function OrderView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [order, setOrder] = useState<LoadState>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    getOrder(code).then((o) => setOrder(o));
  }, [code]);

  if (order === undefined)
    return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;
  if (!order) {
    return (
      <>
        <div className={ADMIN_PAGE_HEADER_CLS}>
          <div>
            <h2>Захиалга олдсонгүй</h2>
          </div>
          <Link to="/admin/orders" className={ADMIN_BTN_CLS}>
            ← Жагсаалт руу
          </Link>
        </div>
      </>
    );
  }

  const onRefund = async () => {
    const ok = await confirm({
      title: "Захиалгыг буцаах уу?",
      message: (
        <>
          Захиалгын код:{" "}
          <strong className="font-semibold text-zinc-900">«{order.code}»</strong>.
          Төлбөрийг буцааж, тасалбарын эрхийг хүчингүй болгоно.
        </>
      ),
      confirmLabel: "Буцаалт хийх",
      cancelLabel: "Болих",
      variant: "warning",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const next = await refundOrder(order.code);
      setOrder(next);
      toast.success(`«${order.code}» захиалгын төлбөрийг буцаалаа.`);
    } catch (e) {
      toast.error((e as Error).message || "Буцаах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    const ok = await confirm({
      title: "Захиалгыг бүрмөсөн устгах уу?",
      message: (
        <>
          Захиалгын код:{" "}
          <strong className="font-semibold text-zinc-900">«{order.code}»</strong>.
          Энэ үйлдлийг буцаах боломжгүй.
        </>
      ),
      confirmLabel: "Бүрмөсөн устгах",
      cancelLabel: "Болих",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await cancelOrder(order.code);
      toast.success(`«${order.code}» захиалга устгагдлаа.`);
      navigate("/admin/orders");
    } catch (e) {
      toast.error((e as Error).message || "Устгах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{order.title}</h2>
          <p>
            Код: <code>{order.code}</code>
          </p>
        </div>
        <Link
          to="/admin/orders"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Жагсаалт руу
        </Link>
      </div>

      <div className={`${ADMIN_GRID_CLS} ${ADMIN_GRID_2_CLS}`}>
        <div className={ADMIN_CARD_CLS}>
          <h3>Дэлгэрэнгүй</h3>
          <table className={ADMIN_TABLE_CLS}>
            <tbody>
              <tr>
                <th>Хэрэглэгч</th>
                <td>{order.user || "—"}</td>
              </tr>
              <tr>
                <th>Багц</th>
                <td>{order.tierName || order.tier}</td>
              </tr>
              <tr>
                <th>Тоо</th>
                <td>{order.qty}</td>
              </tr>
              <tr>
                <th>Нэгжийн үнэ</th>
                <td>{money(order.unitPrice)}</td>
              </tr>
              <tr>
                <th>Нийт</th>
                <td>
                  <strong>{money(order.total)}</strong>
                </td>
              </tr>
              <tr>
                <th>Төлбөрийн хэрэгсэл</th>
                <td>{order.paymentName || order.payment}</td>
              </tr>
              <tr>
                <th>Худалдан авсан огноо</th>
                <td>
                  {(order.purchasedAt || "").replace("T", " ").slice(0, 19)}
                </td>
              </tr>
              <tr>
                <th>Төлөв</th>
                <td>{order.status}</td>
              </tr>
              {order.refundedAt && (
                <tr>
                  <th>Буцаагдсан</th>
                  <td>{order.refundedAt.replace("T", " ").slice(0, 19)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={ADMIN_CARD_CLS}>
          <h3>Үйлдэл</h3>
          {order.status === "refunded" ? (
            <p style={{ color: "#64748b" }}>
              Энэ захиалгыг аль хэдийн буцаасан байна.
            </p>
          ) : (
            <p style={{ color: "#64748b" }}>
              Буцаалт хийвэл захиалгын төлөв «refunded» болж, бүртгэлээс
              хасагдахгүй. Бүрмөсөн устгахыг сонговол захиалга мэдээллийн санд
              үлдэхгүй.
            </p>
          )}
          <div className={ADMIN_ACTIONS_CLS} style={{ marginTop: 14 }}>
            {order.status !== "refunded" && (
              <button
                type="button"
                className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
                onClick={onRefund}
                disabled={busy}
              >
                Буцаалт хийх
              </button>
            )}
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS}`}
              onClick={onCancel}
              disabled={busy}
            >
              Бүрмөсөн устгах
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
