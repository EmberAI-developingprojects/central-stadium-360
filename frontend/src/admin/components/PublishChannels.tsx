import type { ReactNode } from "react";

/**
 * Where an event is published. One `events` row feeds two independent
 * storefronts — the website (live/replay stream tickets) and the stadium kiosk
 * (printed zone admissions) — and these two flags decide which of them lists
 * and sells it.
 *
 * Renders the rows only; the caller wraps them in whatever card its page uses.
 */

export type PublishChannelsValue = {
  showOnWeb: boolean;
  showOnKiosk: boolean;
};

const ROW_BASE_CLS =
  "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors";
const ROW_ON_CLS = "border-zinc-300 bg-white";
const ROW_OFF_CLS = "border-[#ececef] bg-[#fafafa] hover:border-zinc-200";

function WebIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function KioskIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="16" rx="2" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="13" y2="11" />
    </svg>
  );
}

function ChannelRow({
  id,
  checked,
  onChange,
  disabled,
  icon,
  title,
  desc,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`${ROW_BASE_CLS} ${checked ? ROW_ON_CLS : ROW_OFF_CLS}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-zinc-900"
      />
      <span
        className={`shrink-0 mt-px ${checked ? "text-zinc-700" : "text-zinc-400"}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-zinc-900 leading-tight">
          {title}
        </span>
        <span className="block text-[12.5px] text-zinc-500 mt-0.5 leading-[1.45]">
          {desc}
        </span>
      </span>
    </label>
  );
}

export default function PublishChannels({
  value,
  onChange,
  disabled,
  idPrefix = "publish",
}: {
  value: PublishChannelsValue;
  onChange: (patch: Partial<PublishChannelsValue>) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const none = !value.showOnWeb && !value.showOnKiosk;
  return (
    <div className="flex flex-col gap-3">
      <ChannelRow
        id={`${idPrefix}-web`}
        checked={value.showOnWeb}
        onChange={(v) => onChange({ showOnWeb: v })}
        disabled={disabled}
        icon={<WebIcon />}
        title="Вэб сайт дээр нэмэх"
        desc="Сайт дээр жагсаагдаж, онлайн шууд ба нөхөж үзэх тасалбар зарагдана."
      />
      <ChannelRow
        id={`${idPrefix}-kiosk`}
        checked={value.showOnKiosk}
        onChange={(v) => onChange({ showOnKiosk: v })}
        disabled={disabled}
        icon={<KioskIcon />}
        title="Касс (kiosk) дээр нэмэх"
        desc="Цэнгэлдэх дээрх касс дээр гарч, бүсийн тасалбар биечлэн зарагдана."
      />
      {none && (
        <p className="m-0 text-[12.5px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Аль ч сувгийг сонгоогүй байна — энэ арга хэмжээ хаана ч харагдахгүй.
        </p>
      )}
    </div>
  );
}
