import { useEffect, useState } from "react";
import type { DbZone, ZoneInput } from "@cs360/shared";
import { api } from "../../lib/api";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";
import {
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_FIELD_CLS,
} from "../_adminStyles";

const CARD_CLS =
  "bg-white border border-[#ececef] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(24,24,27,0.04)]";
const CARD_HEAD_CLS =
  "flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#f4f4f5] bg-gradient-to-b from-[#fafafa] to-white";
const CARD_HEAD_ICON =
  "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset bg-amber-50 text-amber-600 ring-amber-100";
const CARD_HEAD_TITLE =
  "text-[14.5px] font-semibold tracking-[-0.01em] text-zinc-900 m-0 leading-tight";
const CARD_HEAD_DESC = "text-[12.5px] text-zinc-500 m-0 mt-0.5 leading-[1.45]";

/**
 * The kiosk sells exactly three admission tiers — VIP, Fan Zone and Энгийн —
 * so the names are fixed here and the admin only sets price and capacity.
 *
 * Zones created before this was locked down (any other name) still show up
 * under "Бусад бүс" so sold inventory never becomes invisible.
 */
type Tier = {
  key: string;
  name_mn: string;
  name_en: string;
  color: string;
};

const TIERS: Tier[] = [
  { key: "vip", name_mn: "VIP", name_en: "VIP", color: "#B45309" },
  { key: "fan", name_mn: "Fan Zone", name_en: "Fan Zone", color: "#2230C6" },
  { key: "standard", name_mn: "Энгийн", name_en: "Standard", color: "#2F6E8F" },
];

function matchesTier(zone: DbZone, tier: Tier): boolean {
  const mn = zone.name_mn.trim().toLowerCase();
  const en = zone.name_en.trim().toLowerCase();
  return (
    mn === tier.name_mn.toLowerCase() || en === tier.name_en.toLowerCase()
  );
}

type Row = {
  id: string;
  name_mn: string;
  name_en: string;
  desc_mn: string;
  desc_en: string;
  price: number;
  capacity: number;
  sold: number;
  color: string;
  sort_order: number;
  busy: boolean;
};

function rowFromZone(z: DbZone, fallbackColor = "#2F6E8F"): Row {
  return {
    id: z.id,
    name_mn: z.name_mn,
    name_en: z.name_en,
    desc_mn: z.desc_mn ?? "",
    desc_en: z.desc_en ?? "",
    price: z.price,
    capacity: z.capacity,
    sold: z.sold,
    color: z.color ?? fallbackColor,
    sort_order: z.sort_order,
    busy: false,
  };
}

function blankRow(tier: Tier, sortOrder: number): Row {
  return {
    id: "",
    name_mn: tier.name_mn,
    name_en: tier.name_en,
    desc_mn: "",
    desc_en: "",
    price: 0,
    capacity: 0,
    sold: 0,
    color: tier.color,
    sort_order: sortOrder,
    busy: false,
  };
}

const money = (n: number): string => n.toLocaleString("en-US") + "₮";

export default function EventZonesEditor({ eventId }: { eventId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  // Always three, index-aligned with TIERS.
  const [tierRows, setTierRows] = useState<Row[]>(
    TIERS.map((t, i) => blankRow(t, i)),
  );
  const [extraRows, setExtraRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api.admin.listZones(eventId).then((res) => {
      if (!alive) return;
      if (res.ok) {
        const zones = [...res.data];
        const taken = new Set<string>();
        setTierRows(
          TIERS.map((tier, i) => {
            const hit = zones.find(
              (z) => !taken.has(z.id) && matchesTier(z, tier),
            );
            if (!hit) return blankRow(tier, i);
            taken.add(hit.id);
            return rowFromZone(hit, tier.color);
          }),
        );
        setExtraRows(
          zones.filter((z) => !taken.has(z.id)).map((z) => rowFromZone(z)),
        );
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [eventId]);

  const patchTier = (idx: number, patch: Partial<Row>) =>
    setTierRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const patchExtra = (idx: number, patch: Partial<Row>) =>
    setExtraRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const saveRow = async (
    r: Row,
    onBusy: (busy: boolean) => void,
    onSaved: (z: DbZone) => void,
  ) => {
    if (!r.name_mn.trim() || !r.name_en.trim()) {
      toast.error("Бүсийн нэр (MN ба EN) шаардлагатай.");
      return;
    }
    const input: ZoneInput = {
      name_mn: r.name_mn.trim(),
      name_en: r.name_en.trim(),
      desc_mn: r.desc_mn.trim() || null,
      desc_en: r.desc_en.trim() || null,
      price: Math.max(0, Math.round(r.price)),
      capacity: Math.max(0, Math.round(r.capacity)),
      color: r.color || null,
      sort_order: r.sort_order,
    };
    onBusy(true);
    const res = r.id
      ? await api.admin.updateZone(eventId, r.id, input)
      : await api.admin.createZone(eventId, input);
    if (!res.ok) {
      onBusy(false);
      toast.error(`Хадгалах боломжгүй: ${res.error}`);
      return;
    }
    onSaved(res.data);
    toast.success("Бүс хадгалагдлаа.");
  };

  const confirmDelete = async (r: Row): Promise<boolean> =>
    confirm({
      title: "Бүсийг устгах уу?",
      message: (
        <>
          <strong className="font-semibold text-zinc-900">«{r.name_mn}»</strong>{" "}
          бүсийг устгана. Хэрэв энэ бүсэд зарагдсан тасалбар байвал устгах
          боломжгүй.
        </>
      ),
      confirmLabel: "Устгах",
      cancelLabel: "Болих",
      variant: "danger",
    });

  const deleteTier = async (idx: number) => {
    const r = tierRows[idx];
    if (!r.id) return;
    if (!(await confirmDelete(r))) return;
    patchTier(idx, { busy: true });
    const res = await api.admin.deleteZone(eventId, r.id);
    if (!res.ok) {
      patchTier(idx, { busy: false });
      toast.error(`Устгах боломжгүй: ${res.error}`);
      return;
    }
    setTierRows((rs) =>
      rs.map((row, i) => (i === idx ? blankRow(TIERS[idx], idx) : row)),
    );
    toast.success("Бүс устгагдлаа.");
  };

  const deleteExtra = async (idx: number) => {
    const r = extraRows[idx];
    if (!(await confirmDelete(r))) return;
    patchExtra(idx, { busy: true });
    const res = await api.admin.deleteZone(eventId, r.id);
    if (!res.ok) {
      patchExtra(idx, { busy: false });
      toast.error(`Устгах боломжгүй: ${res.error}`);
      return;
    }
    setExtraRows((rs) => rs.filter((_, i) => i !== idx));
    toast.success("Бүс устгагдлаа.");
  };

  return (
    <section className={CARD_CLS}>
      <header className={CARD_HEAD_CLS}>
        <span className={CARD_HEAD_ICON} aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 0 0 4v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-4z" />
            <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 3" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={CARD_HEAD_TITLE}>Биечлэн тасалбар — VIP / Fan Zone / Энгийн</h3>
          <p className={CARD_HEAD_DESC}>
            Касс дээр эдгээр 3 төрлийн тасалбар зарагдана. Төрөл бүрийн үнэ ба
            багтаамжийг оруулаад хадгална. Багтаамж нь суудал биш, тоо хэмжээ.
          </p>
        </div>
      </header>

      <div className="p-6 flex flex-col gap-4">
        {!loaded && (
          <div className="text-[13px] text-zinc-500">Уншиж байна…</div>
        )}

        {loaded &&
          tierRows.map((r, idx) => (
            <div
              key={TIERS[idx].key}
              className="rounded-xl border border-[#ececef] bg-[#fafafa] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-1.5 rounded-full shrink-0"
                  style={{ background: r.color }}
                  aria-hidden="true"
                />
                <span className="text-[13.5px] font-semibold text-zinc-900">
                  {TIERS[idx].name_mn}
                </span>
                <span className="text-[12px] text-zinc-400">
                  {TIERS[idx].name_en}
                </span>
                {!r.id && (
                  <span className="ml-auto text-[11.5px] text-zinc-500">
                    Хадгалаагүй
                  </span>
                )}
              </div>

              <div className="grid gap-3 [grid-template-columns:1fr_1fr_1fr_auto] max-[760px]:[grid-template-columns:1fr_1fr]">
                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor={`zone-price-${TIERS[idx].key}`}>Үнэ (₮)</label>
                  <input
                    id={`zone-price-${TIERS[idx].key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={r.price || ""}
                    onChange={(e) =>
                      patchTier(idx, { price: Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor={`zone-cap-${TIERS[idx].key}`}>Багтаамж</label>
                  <input
                    id={`zone-cap-${TIERS[idx].key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={r.capacity || ""}
                    onChange={(e) =>
                      patchTier(idx, { capacity: Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor={`zone-color-${TIERS[idx].key}`}>Өнгө</label>
                  <input
                    id={`zone-color-${TIERS[idx].key}`}
                    type="color"
                    value={r.color}
                    onChange={(e) => patchTier(idx, { color: e.target.value })}
                    className="!h-10 !w-full !p-1 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <span className="inline-flex items-center h-10 px-3 rounded-md bg-white border border-[#e4e4e7] text-[12.5px] text-zinc-600 whitespace-nowrap tabular-nums">
                    Зарагдсан: {r.sold}/{r.capacity}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                  onClick={() =>
                    saveRow(
                      r,
                      (busy) => patchTier(idx, { busy }),
                      (z) =>
                        setTierRows((rs) =>
                          rs.map((row, i) =>
                            i === idx ? rowFromZone(z, TIERS[idx].color) : row,
                          ),
                        ),
                    )
                  }
                  disabled={r.busy}
                >
                  {r.busy ? "…" : r.id ? "Хадгалах" : "Нэмэх"}
                </button>
                {r.id && (
                  <>
                    <button
                      type="button"
                      className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
                      onClick={() => deleteTier(idx)}
                      disabled={r.busy}
                    >
                      Устгах
                    </button>
                    <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
                      {money(r.price)} · {Math.max(0, r.capacity - r.sold)}{" "}
                      үлдсэн
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}

        {loaded && extraRows.length > 0 && (
          <div className="flex flex-col gap-3 pt-2 border-t border-[#f4f4f5]">
            <p className="m-0 text-[12.5px] text-zinc-500 leading-[1.45]">
              <strong className="font-semibold text-zinc-700">Бусад бүс</strong>{" "}
              — 3 төрөлд ороогүй, өмнө нь үүсгэсэн бүсүүд. Касс дээр хэвээр
              зарагдана; хэрэггүй бол устгана уу.
            </p>
            {extraRows.map((r, idx) => (
              <div
                key={r.id}
                className="rounded-xl border border-[#ececef] bg-[#fafafa] p-4 flex flex-col gap-3"
              >
                <div className="grid gap-3 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]">
                  <div className={ADMIN_FIELD_CLS}>
                    <label>Нэр (MN) *</label>
                    <input
                      value={r.name_mn}
                      onChange={(e) =>
                        patchExtra(idx, { name_mn: e.target.value })
                      }
                      placeholder="Бүсийн нэр"
                    />
                  </div>
                  <div className={ADMIN_FIELD_CLS}>
                    <label>Нэр (EN) *</label>
                    <input
                      value={r.name_en}
                      onChange={(e) =>
                        patchExtra(idx, { name_en: e.target.value })
                      }
                      placeholder="Name"
                    />
                  </div>
                </div>

                <div className="grid gap-3 [grid-template-columns:1fr_1fr_1fr_auto] max-[760px]:[grid-template-columns:1fr_1fr]">
                  <div className={ADMIN_FIELD_CLS}>
                    <label>Үнэ (₮)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={r.price || ""}
                      onChange={(e) =>
                        patchExtra(idx, { price: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className={ADMIN_FIELD_CLS}>
                    <label>Багтаамж</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={r.capacity || ""}
                      onChange={(e) =>
                        patchExtra(idx, {
                          capacity: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className={ADMIN_FIELD_CLS}>
                    <label>Өнгө</label>
                    <input
                      type="color"
                      value={r.color}
                      onChange={(e) =>
                        patchExtra(idx, { color: e.target.value })
                      }
                      className="!h-10 !w-full !p-1 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="inline-flex items-center h-10 px-3 rounded-md bg-white border border-[#e4e4e7] text-[12.5px] text-zinc-600 whitespace-nowrap tabular-nums">
                      Зарагдсан: {r.sold}/{r.capacity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                    onClick={() =>
                      saveRow(
                        r,
                        (busy) => patchExtra(idx, { busy }),
                        (z) =>
                          setExtraRows((rs) =>
                            rs.map((row, i) => (i === idx ? rowFromZone(z) : row)),
                          ),
                      )
                    }
                    disabled={r.busy}
                  >
                    {r.busy ? "…" : "Хадгалах"}
                  </button>
                  <button
                    type="button"
                    className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
                    onClick={() => deleteExtra(idx)}
                    disabled={r.busy}
                  >
                    Устгах
                  </button>
                  <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
                    {money(r.price)} · {Math.max(0, r.capacity - r.sold)} үлдсэн
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
