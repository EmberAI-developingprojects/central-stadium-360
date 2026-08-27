import { KIOSK_TIERS, type ZoneDraft } from "../lib/kiosk-zones";
import { ADMIN_FIELD_CLS } from "../_adminStyles";

/**
 * The kiosk's three admission tiers as plain form fields — no per-row save.
 * The page's single submit button writes them together with the event.
 */
export default function KioskZoneFields({
  value,
  onChange,
  disabled,
}: {
  value: ZoneDraft[];
  onChange: (index: number, patch: Partial<ZoneDraft>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {KIOSK_TIERS.map((tier, idx) => {
        const d = value[idx];
        if (!d) return null;
        return (
          <div
            key={tier.key}
            className="rounded-xl border border-[#ececef] bg-[#fafafa] p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-1.5 rounded-full shrink-0"
                style={{ background: d.color }}
                aria-hidden="true"
              />
              <span className="text-[13.5px] font-semibold text-zinc-900">
                {tier.name_mn}
              </span>
              <span className="text-[12px] text-zinc-400">{tier.name_en}</span>
              {d.sold > 0 && (
                <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
                  Зарагдсан: {d.sold}/{d.capacity}
                </span>
              )}
            </div>

            <div className="grid gap-3 [grid-template-columns:1fr_1fr_120px] max-[760px]:[grid-template-columns:1fr_1fr]">
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor={`zone-price-${tier.key}`}>Үнэ (₮)</label>
                <input
                  id={`zone-price-${tier.key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  disabled={disabled}
                  value={d.price || ""}
                  onChange={(e) =>
                    onChange(idx, { price: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor={`zone-cap-${tier.key}`}>Багтаамж (ширхэг)</label>
                <input
                  id={`zone-cap-${tier.key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  disabled={disabled}
                  value={d.capacity || ""}
                  onChange={(e) =>
                    onChange(idx, { capacity: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor={`zone-color-${tier.key}`}>Өнгө</label>
                <input
                  id={`zone-color-${tier.key}`}
                  type="color"
                  disabled={disabled}
                  value={d.color}
                  onChange={(e) => onChange(idx, { color: e.target.value })}
                  className="!h-10 !w-full !p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      })}
      <p className="m-0 text-[12.5px] text-zinc-500 leading-[1.45]">
        Багтаамж хоосон үлдээсэн төрөл касс дээр гарахгүй. Багтаамж нь суудал
        биш, зарах тасалбарын тоо.
      </p>
    </div>
  );
}
