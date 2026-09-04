import { newZoneDraft, type ZoneDraft } from "../lib/kiosk-zones";
import { ADMIN_FIELD_CLS } from "../_adminStyles";

/**
 * Admin-defined kiosk zones as plain form rows — no per-row save. The page's
 * single submit button writes them together with the event. Rows can be
 * renamed, added and removed freely; a row that already sold tickets can't be
 * removed (its tickets reference the zone), only renamed or re-priced.
 */
export default function KioskZoneFields({
  value,
  onChange,
  disabled,
}: {
  value: ZoneDraft[];
  onChange: (next: ZoneDraft[]) => void;
  disabled?: boolean;
}) {
  const patch = (idx: number, p: Partial<ZoneDraft>) =>
    onChange(value.map((d, i) => (i === idx ? { ...d, ...p } : d)));
  const remove = (idx: number) =>
    onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, newZoneDraft(value.length)]);

  return (
    <div className="flex flex-col gap-4">
      {value.map((d, idx) => (
        <div
          key={d.id || `new-${idx}`}
          className="rounded-xl border border-[#ececef] bg-[#fafafa] p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-1.5 rounded-full shrink-0"
              style={{ background: d.color }}
              aria-hidden="true"
            />
            <input
              type="text"
              disabled={disabled}
              value={d.name}
              onChange={(e) =>
                patch(idx, { name: e.target.value, nameEn: e.target.value })
              }
              placeholder="Төрлийн нэр (ж: VIP)"
              aria-label="Төрлийн нэр"
              /* This input is not inside ADMIN_FIELD_CLS, so it needs its own
                 16px bump — below that iOS Safari zooms the page on focus. */
              className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent focus:border-zinc-300 focus:outline-none text-[13.5px] font-semibold text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 py-0.5 max-[640px]:text-[16px] max-[640px]:min-h-[40px]"
            />
            {d.sold > 0 ? (
              <span className="ml-auto shrink-0 text-[12px] text-zinc-500 tabular-nums">
                Зарагдсан: {d.sold}/{d.capacity}
              </span>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(idx)}
                aria-label="Төрөл устгах"
                title="Төрөл устгах"
                className="ml-auto shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-zinc-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-colors max-[640px]:h-10 max-[640px]:w-10 max-[640px]:-mr-1"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="grid gap-3 [grid-template-columns:1fr_1fr_120px] max-[760px]:[grid-template-columns:1fr_1fr]">
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor={`zone-price-${idx}`}>Үнэ (₮)</label>
              <input
                id={`zone-price-${idx}`}
                type="number"
                inputMode="numeric"
                min={0}
                disabled={disabled}
                value={d.price || ""}
                onChange={(e) =>
                  patch(idx, { price: Number(e.target.value) || 0 })
                }
                placeholder="0"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor={`zone-cap-${idx}`}>Багтаамж (ширхэг)</label>
              <input
                id={`zone-cap-${idx}`}
                type="number"
                inputMode="numeric"
                min={d.sold}
                disabled={disabled}
                value={d.capacity || ""}
                onChange={(e) =>
                  patch(idx, { capacity: Number(e.target.value) || 0 })
                }
                placeholder="0"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor={`zone-color-${idx}`}>Өнгө</label>
              <input
                id={`zone-color-${idx}`}
                type="color"
                disabled={disabled}
                value={d.color}
                onChange={(e) => patch(idx, { color: e.target.value })}
                className="!h-10 !w-full !p-1 cursor-pointer"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="self-start inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-[13px] font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors max-[640px]:min-h-[44px] max-[640px]:self-stretch max-[640px]:justify-center max-[640px]:text-[13.5px]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Төрөл нэмэх
      </button>

      <p className="m-0 text-[12.5px] text-zinc-500 leading-[1.45]">
        Багтаамж хоосон (0) төрөл касс дээр гарахгүй. Багтаамж нь суудал биш,
        зарах тасалбарын тоо — үлдэгдэл зөвхөн админд харагдана; худалдан
        авагчид төрөл ба үнэ л харагдана.
      </p>
    </div>
  );
}
