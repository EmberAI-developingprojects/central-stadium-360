import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useRequireAuth } from "../auth";
import UserMenu from "../components/UserMenu";
import { getOrder, type OrderRecord } from "../data/store";
import {
  WATCH_BTN_CLS,
  WATCH_BTN_GHOST_CLS,
  WATCH_BTN_PRIMARY_CLS,
  WATCH_HEADER_CLS,
  WATCH_LOGO_CLS,
  WATCH_MAIN_CLS,
  WATCH_PAGE_BG,
  WATCH_PAGE_CLS,
  WATCH_TAB_ACTIVE_CLS,
  WATCH_TAB_CLS,
  WATCH_TABS_CLS,
  WATCH_USER_CLS,
} from "./_watchStyles";

const PAY_LABEL: Record<string, string> = {
  qpay: "QPay",
  socialpay: "SocialPay",
  card: "Карт",
};

const money = (n: number | undefined): string =>
  (n || 0).toLocaleString("en-US") + "₮";
const fmtDateTime = (iso: string | undefined): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("mn-MN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const MAIN_CLS = "max-w-[980px] print:bg-white print:text-black";
const BACK_CLS = "mb-5 print:hidden";
const BACK_LINK_CLS =
  "inline-flex items-center gap-2 rounded-full text-[13px] font-semibold no-underline py-2 px-[14px] text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.06)] border border-solid border-[rgba(255,255,255,0.10)] [transition:color_.15s_ease,background_.15s_ease] hover:text-white hover:bg-[rgba(255,255,255,0.12)] [&_svg]:w-[14px] [&_svg]:h-[14px]";
const EMPTY_CLS =
  "text-center rounded-[18px] py-20 px-6 bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)]";
const EMPTY_H1_CLS = "text-[22px] m-0 mb-2 text-white";
const EMPTY_P_CLS = "m-0 mb-5 text-[rgba(255,255,255,0.65)]";
const CARD_CLS =
  "rounded-[20px] overflow-hidden bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)] print:bg-white print:text-black print:[border-color:#ccc]";
const HERO_CLS =
  "relative grid gap-0 [grid-template-columns:320px_1fr] [background:linear-gradient(135deg,rgba(34,48,198,0.20),rgba(34,48,198,0))] max-[720px]:[grid-template-columns:1fr] print:bg-white";
const HERO_IMG_CLS = "w-full h-full object-cover block min-h-[220px]";
const HERO_META_CLS = "flex flex-col gap-2.5 justify-center py-7 px-8";
const STATUS_CLS =
  "inline-flex items-center gap-2 rounded-full text-[11px] font-bold uppercase py-1 px-3 w-fit bg-[rgba(16,185,129,0.15)] border border-solid border-[rgba(16,185,129,0.35)] text-[#6EE7B7] tracking-[0.05em]";
const STATUS_DOT_CLS =
  "rounded-full w-[7px] h-[7px] bg-[#34D399] shadow-[0_0_0_4px_rgba(52,211,153,0.20)]";
const TITLE_CLS =
  "m-0 mt-1 text-white text-2xl font-bold leading-[1.2] print:text-black";
const EVENT_DATE_CLS =
  "text-sm font-semibold text-[rgba(255,255,255,0.78)] print:text-black";
const VENUE_CLS = "text-[13px] text-[rgba(255,255,255,0.55)] print:text-black";
const GRID_CLS =
  "grid [grid-template-columns:1fr_1fr] gap-px bg-[rgba(255,255,255,0.06)] border-t border-solid border-[rgba(255,255,255,0.06)] max-[720px]:[grid-template-columns:1fr] print:[background:#ccc]";
const SECTION_CLS = "py-6 px-7 bg-[#0B0F1A] print:bg-white print:text-black";
const SECTION_WIDE_CLS = `${SECTION_CLS} [grid-column:1/-1]`;
const SECTION_TITLE_CLS =
  "m-0 mb-[14px] text-xs font-bold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.55)] print:text-[#555]";
const META_CLS =
  "flex flex-col gap-2.5 m-0 [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:items-baseline";
const META_DT_CLS =
  "text-[13px] shrink-0 text-[rgba(255,255,255,0.55)] print:text-[#555]";
const META_DD_CLS =
  "m-0 text-sm font-semibold text-right text-[rgba(255,255,255,0.92)] break-words print:text-black";
const CODE_CLS =
  "!text-gold-pale [font-family:'SFMono-Regular',Menlo,Consolas,monospace] tracking-[0.04em] m-0 text-sm font-semibold text-right break-words";
const LINE_ITEMS_TABLE_CLS =
  "w-full text-[13.5px] border-collapse [&_th]:text-right [&_th]:py-3 [&_th]:px-2 [&_th]:border-b [&_th]:border-solid [&_th]:border-[rgba(255,255,255,0.06)] [&_th]:text-[rgba(255,255,255,0.88)] [&_td]:text-right [&_td]:py-3 [&_td]:px-2 [&_td]:border-b [&_td]:border-solid [&_td]:border-[rgba(255,255,255,0.06)] [&_td]:text-[rgba(255,255,255,0.88)] [&_th:first-child]:text-left [&_td:first-child]:text-left [&_thead_th]:text-[11px] [&_thead_th]:uppercase [&_thead_th]:font-bold [&_thead_th]:tracking-[0.06em] [&_thead_th]:text-[rgba(255,255,255,0.5)] [&_tfoot_th]:font-semibold [&_tfoot_th]:text-[rgba(255,255,255,0.7)] [&_tfoot_td]:font-semibold print:[&_thead_th]:text-[#555] print:[&_tfoot_th]:text-[#555] print:[&_td]:text-black print:[&_tfoot_td]:text-black";
const TOTAL_ROW_CLS =
  "[&_th]:text-white [&_th]:text-base [&_th]:font-bold [&_th]:pt-4 [&_td]:text-white [&_td]:text-base [&_td]:font-bold [&_td]:pt-4 print:[&_th]:text-black print:[&_td]:text-black";
const PAY_METHOD_CLS =
  "flex justify-between items-baseline gap-3 mt-[14px] pt-[14px] text-[13px] border-t border-dashed border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.65)] print:text-[#555]";
const PAY_METHOD_STRONG_CLS = "text-white text-sm print:text-black";
const ACTIONS_CLS =
  "flex flex-wrap gap-3 items-center justify-end py-[22px] px-7 bg-[rgba(255,255,255,0.02)] border-t border-solid border-[rgba(255,255,255,0.06)] max-[720px]:justify-stretch [&>a]:no-underline [&>button]:no-underline max-[720px]:[&>a]:flex-1 max-[720px]:[&>a]:justify-center max-[720px]:[&>button]:flex-1 max-[720px]:[&>button]:justify-center print:hidden";

export default function OrderDetail() {
  const session = useRequireAuth();
  const { code } = useParams<{ code: string }>();
  const [order, setOrder] = useState<OrderRecord | null | undefined>(undefined);

  useEffect(() => {
    if (!code) return;
    getOrder(code).then((o) => setOrder(o || null));
  }, [code]);

  const owned = !!order && (!order.user || order.user === session?.identifier);

  if (!session) return null;

  const onPrint = () => window.print();

  return (
    <div
      className={`${WATCH_PAGE_CLS} print:bg-white print:text-black`}
      style={{ background: WATCH_PAGE_BG }}
    >
      <header className={`${WATCH_HEADER_CLS} print:hidden`}>
        <Link
          className={WATCH_LOGO_CLS}
          to="/"
          aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
        >
          <img
            src="/assets/images/brand/logo-white.png"
            alt="Төв Цэнгэлдэх Хүрээлэн"
          />
        </Link>
        <nav className={WATCH_TABS_CLS} aria-label="Үзэх төрөл">
          <Link className={WATCH_TAB_CLS} to="/watch">
            Шууд
          </Link>
          <Link className={WATCH_TAB_CLS} to="/watch#upcoming">
            Удахгүй
          </Link>
          <Link
            className={`${WATCH_TAB_CLS} ${WATCH_TAB_ACTIVE_CLS}`}
            to="/watch#tickets"
          >
            Тасалбар
          </Link>
        </nav>
        <div className={WATCH_USER_CLS}>
          <UserMenu />
        </div>
      </header>

      <main className={`${WATCH_MAIN_CLS} ${MAIN_CLS}`}>
        <div className={BACK_CLS}>
          <Link to="/watch#tickets" className={BACK_LINK_CLS}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Худалдан авалтын түүх
          </Link>
        </div>

        {order === undefined ? (
          <section className={EMPTY_CLS}>
            <h1 className={EMPTY_H1_CLS}>Уншиж байна…</h1>
          </section>
        ) : !order ? (
          <section className={EMPTY_CLS}>
            <h1 className={EMPTY_H1_CLS}>Захиалга олдсонгүй</h1>
            <p className={EMPTY_P_CLS}>
              Энэ кодтой захиалга байхгүй эсвэл устгагдсан байна.
            </p>
            <Link
              to="/watch#tickets"
              className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
            >
              Миний тасалбарууд
            </Link>
          </section>
        ) : !owned ? (
          <section className={EMPTY_CLS}>
            <h1 className={EMPTY_H1_CLS}>Хандах эрхгүй</h1>
            <p className={EMPTY_P_CLS}>Энэ захиалга өөр хэрэглэгчийнх байна.</p>
            <Link
              to="/watch#tickets"
              className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
            >
              Миний тасалбарууд
            </Link>
          </section>
        ) : (
          <article className={CARD_CLS}>
            <header className={HERO_CLS}>
              <img
                src={order.image}
                alt={order.title}
                className={HERO_IMG_CLS}
              />
              <div className={HERO_META_CLS}>
                <span className={STATUS_CLS}>
                  <span className={STATUS_DOT_CLS} aria-hidden="true"></span>
                  Баталгаажсан
                </span>
                <h1 className={TITLE_CLS}>{order.title}</h1>
                <span className={EVENT_DATE_CLS}>{order.date}</span>
                <span className={VENUE_CLS}>
                  📡 Онлайн шууд дамжуулал · энэ вэбсайтаас үзнэ
                </span>
              </div>
            </header>

            <div className={GRID_CLS}>
              <section className={SECTION_CLS}>
                <h2 className={SECTION_TITLE_CLS}>Захиалгын мэдээлэл</h2>
                <dl className={META_CLS}>
                  <div>
                    <dt className={META_DT_CLS}>Захиалгын код</dt>
                    <dd className={CODE_CLS}>{order.code}</dd>
                  </div>
                  <div>
                    <dt className={META_DT_CLS}>Худалдаж авсан</dt>
                    <dd className={META_DD_CLS}>
                      {fmtDateTime(order.purchasedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className={META_DT_CLS}>Хэрэглэгч</dt>
                    <dd className={META_DD_CLS}>
                      {session.fullname || session.identifier}
                    </dd>
                  </div>
                  <div>
                    <dt className={META_DT_CLS}>Төлөв</dt>
                    <dd className={META_DD_CLS}>Төлбөр төлөгдсөн</dd>
                  </div>
                </dl>
              </section>

              <section className={SECTION_CLS}>
                <h2 className={SECTION_TITLE_CLS}>Үзэх багц</h2>
                <dl className={META_CLS}>
                  <div>
                    <dt className={META_DT_CLS}>Багц</dt>
                    <dd className={META_DD_CLS}>{order.tierName}</dd>
                  </div>
                  <div>
                    <dt className={META_DT_CLS}>Үзэх эрх</dt>
                    <dd className={META_DD_CLS}>{order.qty} төхөөрөмж</dd>
                  </div>
                  <div>
                    <dt className={META_DT_CLS}>Чанар</dt>
                    <dd className={META_DD_CLS}>HD 1080p</dd>
                  </div>
                </dl>
              </section>

              <section className={SECTION_WIDE_CLS}>
                <h2 className={SECTION_TITLE_CLS}>Төлбөр</h2>
                <table className={LINE_ITEMS_TABLE_CLS}>
                  <thead>
                    <tr>
                      <th>Зүйл</th>
                      <th>Нэгж үнэ</th>
                      <th>Тоо</th>
                      <th>Дүн</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        {order.tierName} — {order.title}
                      </td>
                      <td>{money(order.unitPrice)}</td>
                      <td>{order.qty}</td>
                      <td>
                        {money((order.unitPrice ?? 0) * (order.qty ?? 0))}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={3}>Дэд дүн</th>
                      <td>
                        {money((order.unitPrice ?? 0) * (order.qty ?? 0))}
                      </td>
                    </tr>
                    <tr>
                      <th colSpan={3}>НӨАТ (багтсан)</th>
                      <td>
                        {money(Math.round(order.total - order.total / 1.1))}
                      </td>
                    </tr>
                    <tr className={TOTAL_ROW_CLS}>
                      <th colSpan={3}>Нийт төлсөн</th>
                      <td>{money(order.total)}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className={PAY_METHOD_CLS}>
                  <span>Төлбөрийн хэрэгсэл:</span>
                  <strong className={PAY_METHOD_STRONG_CLS}>
                    {order.paymentName ||
                      (order.payment ? PAY_LABEL[order.payment] : "") ||
                      order.payment}
                  </strong>
                </p>
              </section>
            </div>

            <footer className={ACTIONS_CLS}>
              <Link
                to="/watch"
                className={`${WATCH_BTN_CLS} ${WATCH_BTN_PRIMARY_CLS}`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Шууд үзэх
              </Link>
              <button
                type="button"
                className={`${WATCH_BTN_CLS} ${WATCH_BTN_GHOST_CLS}`}
                onClick={onPrint}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Хэвлэх
              </button>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
