import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrders } from "../../data/store";
import type { OrderRecord, OrderStatus } from "../../data/store";
import {
  ADMIN_BADGE_CANCELLED_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BADGE_REFUNDED_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FILTERS_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

const STATUS_BADGE: Record<string, string> = {
  paid: `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_PAID_CLS}`,
  refunded: `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_REFUNDED_CLS}`,
  cancelled: `${ADMIN_BADGE_CLS} ${ADMIN_BADGE_CANCELLED_CLS}`,
};

type StatusFilter = OrderStatus | "all";

export default function OrdersList() {
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    listOrders({ q, status }).then(setOrders);
  }, [q, status]);

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Захиалга</h2>
          <p>Бүх тасалбарын борлуулалт. Шууд буцаалт хийх боломжтой.</p>
        </div>
      </div>

      <div className={ADMIN_FILTERS_CLS}>
        <input
          type="search"
          placeholder="Код, хэрэглэгч, арга хэмжээгээр хайх…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="all">Бүх төлөв</option>
          <option value="paid">Төлбөртэй</option>
          <option value="refunded">Буцаагдсан</option>
        </select>
      </div>

      {!orders ? (
        <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>
      ) : orders.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>
          <strong>Захиалга алга</strong>
          Хайлтын үр дүнд таарсан захиалга алга байна.
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Код</th>
                <th>Арга хэмжээ</th>
                <th>Хэрэглэгч</th>
                <th>Багц</th>
                <th>Тоо</th>
                <th style={{ textAlign: "right" }}>Нийт</th>
                <th>Төлбөр</th>
                <th>Огноо</th>
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
                  <td>{o.user || "—"}</td>
                  <td>{o.tierName || o.tier}</td>
                  <td>{o.qty}</td>
                  <td style={{ textAlign: "right" }}>{money(o.total)}</td>
                  <td>{o.paymentName || o.payment}</td>
                  <td>{(o.purchasedAt || "").slice(0, 10)}</td>
                  <td>
                    <span className={STATUS_BADGE[o.status] || ADMIN_BADGE_CLS}>
                      {o.status === "paid"
                        ? "Төлбөртэй"
                        : o.status === "refunded"
                          ? "Буцаагдсан"
                          : o.status}
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
        </div>
      )}
    </>
  );
}
