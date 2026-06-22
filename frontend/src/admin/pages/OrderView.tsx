import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrder } from "../../data/store";
import type { OrderRecord } from "../../data/store";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_CARD_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_GRID_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";

const formatDateTime = (
  iso: string | undefined,
): { date: string; time: string } => {
  if (!iso) return { date: "—", time: "" };
  const cleaned = iso.replace("T", " ").slice(0, 19);
  const [date = "—", time = ""] = cleaned.split(" ");
  return { date, time };
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Төлөгдсөн",
  refunded: "Буцаагдсан",
};

function StatusBadge({ status }: { status: string }) {
  const isPaid = status === "paid";
  const cls = isPaid
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-red-50 text-red-700 border-red-200";
  const dot = isPaid ? "bg-emerald-500" : "bg-red-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border text-[11px] font-semibold px-2 py-0.5 ${cls}`}
    >
      <span className={`inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

type LoadState = OrderRecord | null | undefined;

const DETAIL_TABLE_CLS =
  "w-full border-collapse text-[13px] " +
  "[&_tr]:border-b [&_tr]:border-[#f4f4f5] [&_tr:last-child]:border-b-0 " +
  "[&_th]:w-[180px] [&_th]:text-left [&_th]:align-top [&_th]:font-normal [&_th]:text-zinc-500 [&_th]:text-[12.5px] [&_th]:py-3 [&_th]:pr-4 " +
  "[&_td]:text-left [&_td]:align-top [&_td]:text-zinc-900 [&_td]:py-3";

export default function OrderView() {
  const { code } = useParams<{ code: string }>();
  const [order, setOrder] = useState<LoadState>(undefined);

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

      <div className={ADMIN_GRID_CLS}>
        <div className={ADMIN_CARD_CLS}>
          <h3>Дэлгэрэнгүй</h3>
          <table className={DETAIL_TABLE_CLS}>
            <tbody>
              <tr>
                <th>Хэрэглэгч</th>
                <td className="font-medium break-all">{order.user || "—"}</td>
              </tr>
              <tr>
                <th>Тоо</th>
                <td className="tabular-nums">{order.qty}</td>
              </tr>
              <tr>
                <th>Нэгжийн үнэ</th>
                <td className="tabular-nums">{money(order.unitPrice)}</td>
              </tr>
              <tr className="!bg-zinc-50">
                <th className="!text-zinc-900 !font-semibold">Нийт</th>
                <td className="tabular-nums text-[15px] font-semibold text-zinc-900">
                  {money(order.total)}
                </td>
              </tr>
              <tr>
                <th>Төлбөрийн хэрэгсэл</th>
                <td>{order.paymentName || order.payment}</td>
              </tr>
              <tr>
                <th>Худалдан авсан огноо</th>
                <td className="tabular-nums">
                  {(() => {
                    const { date, time } = formatDateTime(order.purchasedAt);
                    return (
                      <>
                        {date}
                        {time && (
                          <span className="text-zinc-500 ml-1.5">{time}</span>
                        )}
                      </>
                    );
                  })()}
                </td>
              </tr>
              <tr>
                <th>Төлөв</th>
                <td>
                  <StatusBadge status={order.status} />
                </td>
              </tr>
              {order.refundedAt && (
                <tr>
                  <th>Буцаагдсан</th>
                  <td className="tabular-nums">
                    {(() => {
                      const { date, time } = formatDateTime(order.refundedAt);
                      return (
                        <>
                          {date}
                          {time && (
                            <span className="text-zinc-500 ml-1.5">{time}</span>
                          )}
                        </>
                      );
                    })()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
