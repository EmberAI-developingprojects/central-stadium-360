import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

/**
 * First step of creating an event: pick the storefront.
 *
 * One `events` row can feed both the website (live/replay stream tickets) and
 * the stadium kiosk (printed zone admissions), but the two are set up very
 * differently — so the admin chooses up front and only fills the fields that
 * channel actually needs. The other channel stays switchable inside the form.
 */

const CARD_CLS =
  "group flex flex-col items-start gap-3 no-underline text-left p-6 rounded-2xl border border-[#ececef] bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-all hover:border-zinc-300 hover:shadow-[0_4px_16px_rgba(24,24,27,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";
const ICON_CLS =
  "inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset";

function ChoiceCard({
  to,
  icon,
  iconCls,
  title,
  desc,
  bullets,
}: {
  to: string;
  icon: ReactNode;
  iconCls: string;
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <Link to={to} className={CARD_CLS}>
      <span className={`${ICON_CLS} ${iconCls}`} aria-hidden="true">
        {icon}
      </span>
      <span className="block">
        <span className="block text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
          {title}
        </span>
        <span className="block text-[12.5px] text-zinc-500 mt-1 leading-[1.5]">
          {desc}
        </span>
      </span>
      <ul className="m-0 mt-1 p-0 list-none flex flex-col gap-1.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[12.5px] text-zinc-600"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-zinc-400"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {b}
          </li>
        ))}
      </ul>
      <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900">
        Үргэлжлүүлэх
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </Link>
  );
}

export default function EventCreateChoose() {
  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Шинэ арга хэмжээ</h2>
          <p>Хаана нэмэхээ сонгоно уу — вэб ба касс тус тусдаа тохируулагдана.</p>
        </div>
        <Link
          to="/admin/events"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Буцах
        </Link>
      </div>

      <div className="grid gap-4 max-w-[860px] [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]">
        <ChoiceCard
          to="/admin/events/new/web"
          iconCls="bg-[#eef0fd] text-brand-blue ring-[#dadffb]"
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          }
          title="Вэб дээр нэмэх"
          desc="Сайт дээр жагсаагдаж, онлайн шууд ба нөхөж үзэх тасалбар зарагдана."
          bullets={[
            "Шууд эфирийн эхлэх / дуусах цаг",
            "Энгийн, 3 ба 5 хэрэглэгчийн тасалбарын үнэ",
            "Нөхөж үзэх хугацаа ба үнэ",
          ]}
        />
        <ChoiceCard
          to="/admin/events/new/kiosk"
          iconCls="bg-amber-50 text-amber-600 ring-amber-100"
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="2" width="16" height="16" rx="2" />
              <line x1="8" y1="22" x2="16" y2="22" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="13" y2="11" />
            </svg>
          }
          title="Касс (kiosk) дээр нэмэх"
          desc="Цэнгэлдэх дээрх касс дээр гарч, бүсийн тасалбар биечлэн зарагдана."
          bullets={[
            "Тоглолтын огноо ба эхлэх цаг",
            "VIP / Fan Zone / Энгийн — 3 төрөл",
            "Төрөл тус бүрийн үнэ ба багтаамж",
          ]}
        />
      </div>

      <p className="mt-4 text-[12.5px] text-zinc-500 max-w-[860px]">
        Хоёуланд нь зарах бол аль нэгээр нь эхлээд, дараа нь маягтан дээрх
        «Хаана нэмэх» хэсгээс нөгөөг нь нэмнэ.
      </p>
    </>
  );
}
