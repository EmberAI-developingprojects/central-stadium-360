import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
  allowPast?: boolean;
};

const WEEKDAYS = ["Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям", "Ням"];
const MONTHS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromYmd(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(s: string): string {
  const d = fromYmd(s);
  if (!d) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "yyyy.mm.dd",
  id,
  required,
  className,
  allowPast = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const selected = useMemo(() => fromYmd(value), [value]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth(),
  );

  useEffect(() => {
    if (open && selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const compute = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const popW = 296;
      const popH = 320;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.left;
      if (left + popW > vw - 8) left = Math.max(8, vw - popW - 8);
      let top = rect.bottom + 8;
      if (top + popH > vh - 8 && rect.top - popH - 8 > 8) {
        top = rect.top - popH - 8;
      }
      setPos({ top, left });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open]);

  const firstOfMonth = startOfMonth(viewYear, viewMonth);
  const jsDow = firstOfMonth.getDay();
  const leading = (jsDow + 6) % 7;
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: Array<{ day: number; date: Date } | null> = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, date: new Date(viewYear, viewMonth, d) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectedYmd = selected ? toYmd(selected) : "";
  const todayYmd = toYmd(today);

  const pick = (d: Date) => {
    if (!allowPast && d.getTime() < today.getTime()) return;
    onChange(toYmd(d));
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group relative w-full h-10 pl-10 pr-3 text-left bg-white border rounded-md text-[13.5px] outline-none transition-shadow ${
          open
            ? "border-zinc-400 shadow-[0_0_0_3px_rgba(24,24,27,0.06)]"
            : "border-[#e4e4e7] hover:border-zinc-300"
        } ${value ? "text-zinc-900 font-medium tabular-nums" : "text-zinc-400"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-zinc-600"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {value ? formatDisplay(value) : placeholder}
      </button>

      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => undefined}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      )}

      {open && pos &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-[60] w-[296px] bg-white rounded-xl border border-[#e4e4e7] shadow-[0_20px_40px_-16px_rgba(31,41,55,0.25),0_4px_12px_-4px_rgba(31,41,55,0.1)] p-3"
          >
            <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={prevMonth}
              className="h-8 w-8 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              aria-label="Өмнөх сар"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="text-[13.5px] font-semibold text-zinc-900 tracking-[-0.01em] tabular-nums">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="h-8 w-8 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              aria-label="Дараагийн сар"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`h-7 grid place-items-center text-[11px] font-semibold uppercase tracking-[.06em] ${i >= 5 ? "text-zinc-400" : "text-zinc-500"}`}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`e-${idx}`} className="h-9" />;
              const ymd = toYmd(cell.date);
              const isSelected = ymd === selectedYmd;
              const isToday = ymd === todayYmd;
              const isWeekend = idx % 7 >= 5;
              const isPast = cell.date.getTime() < today.getTime();
              const disabled = isPast && !allowPast;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => pick(cell.date)}
                  disabled={disabled}
                  aria-disabled={disabled}
                  className={`h-9 grid place-items-center text-[13px] rounded-md tabular-nums transition-all ${
                    disabled
                      ? "text-zinc-300 cursor-not-allowed line-through decoration-zinc-200"
                      : isSelected
                        ? "bg-brand-blue text-white font-semibold shadow-[0_4px_10px_-4px_rgba(34,48,198,0.6)]"
                        : isToday
                          ? "bg-brand-blue-tint text-brand-blue font-semibold hover:bg-brand-blue/15"
                          : isPast
                            ? "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            : isWeekend
                              ? "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                              : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

            <div className="mt-2 pt-2 border-t border-[#f4f4f5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Цэвэрлэх
              </button>
              <button
                type="button"
                onClick={() => pick(today)}
                className="text-[12.5px] font-semibold text-brand-blue hover:text-brand-blue-soft transition-colors"
              >
                Өнөөдөр
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
