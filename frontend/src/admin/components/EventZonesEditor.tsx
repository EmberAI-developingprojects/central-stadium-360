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

function rowFromZone(z: DbZone): Row {
  return {
    id: z.id,
    name_mn: z.name_mn,
    name_en: z.name_en,
    desc_mn: z.desc_mn ?? "",
    desc_en: z.desc_en ?? "",
    price: z.price,
    capacity: z.capacity,
    sold: z.sold,
    color: z.color ?? "#2F6E8F",
    sort_order: z.sort_order,
    busy: false,
  };
}

function blankRow(sortOrder: number): Row {
  return {
    id: "",
    name_mn: "",
    name_en: "",
    desc_mn: "",
    desc_en: "",
    price: 0,
    capacity: 0,
    sold: 0,
    color: "#2F6E8F",
    sort_order: sortOrder,
    busy: false,
  };
}

const money = (n: number): string => n.toLocaleString("en-US") + "₮";

export default function EventZonesEditor({ eventId }: { eventId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api.admin.listZones(eventId).then((res) => {
      if (!alive) return;
      if (res.ok) setRows(res.data.map(rowFromZone));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [eventId]);

  const patchRow = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, blankRow(rs.length)]);

  const saveRow = async (idx: number) => {
    const r = rows[idx];
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
    patchRow(idx, { busy: true });
    const res = r.id
      ? await api.admin.updateZone(eventId, r.id, input)
      : await api.admin.createZone(eventId, input);
    if (!res.ok) {
      patchRow(idx, { busy: false });
      toast.error(`Хадгалах боломжгүй: ${res.error}`);
      return;
    }
    setRows((rs) =>
      rs.map((row, i) => (i === idx ? rowFromZone(res.data) : row)),
    );
    toast.success("Бүс хадгалагдлаа.");
  };

  const deleteRow = async (idx: number) => {
    const r = rows[idx];
    if (!r.id) {
      setRows((rs) => rs.filter((_, i) => i !== idx));
      return;
    }
    const ok = await confirm({
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
    if (!ok) return;
    patchRow(idx, { busy: true });
    const res = await api.admin.deleteZone(eventId, r.id);
    if (!res.ok) {
      patchRow(idx, { busy: false });
      toast.error(`Устгах боломжгүй: ${res.error}`);
      return;
    }
    setRows((rs) => rs.filter((_, i) => i !== idx));
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
          <h3 className={CARD_HEAD_TITLE}>Биечлэн тасалбар — бүсүүд</h3>
          <p className={CARD_HEAD_DESC}>
            Цэнгэлдэх дээрх kiosk-д зарагдах бүс бүрийн үнэ ба багтаамж (VIP /
            Premium / Энгийн). Багтаамж нь суудал биш, тоо хэмжээ.
          </p>
        </div>
      </header>

      <div className="p-6 flex flex-col gap-4">
        {!loaded && (
          <div className="text-[13px] text-zinc-500">Уншиж байна…</div>
        )}

        {loaded && rows.length === 0 && (
          <div className="text-[13px] text-zinc-500">
            Бүс алга. Доороос нэмнэ үү — бүсгүйгээр энэ арга хэмжээ kiosk-д
            зарагдахгүй.
          </div>
        )}

        {rows.map((r, idx) => (
          <div
            key={r.id || `draft-${idx}`}
            className="rounded-xl border border-[#ececef] bg-[#fafafa] p-4 flex flex-col gap-3"
          >
            <div className="grid gap-3 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]">
              <div className={ADMIN_FIELD_CLS}>
                <label>Нэр (MN) *</label>
                <input
                  value={r.name_mn}
                  onChange={(e) => patchRow(idx, { name_mn: e.target.value })}
                  placeholder="VIP — Ширээний үйлчилгээ"
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label>Нэр (EN) *</label>
                <input
                  value={r.name_en}
                  onChange={(e) => patchRow(idx, { name_en: e.target.value })}
                  placeholder="VIP — Table service"
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
                    patchRow(idx, { price: Number(e.target.value) || 0 })
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
                    patchRow(idx, { capacity: Number(e.target.value) || 0 })
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
                  onChange={(e) => patchRow(idx, { color: e.target.value })}
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
                onClick={() => saveRow(idx)}
                disabled={r.busy}
              >
                {r.busy ? "…" : r.id ? "Хадгалах" : "Нэмэх"}
              </button>
              <button
                type="button"
                className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
                onClick={() => deleteRow(idx)}
                disabled={r.busy}
              >
                Устгах
              </button>
              {r.id && (
                <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">
                  {money(r.price)} · {Math.max(0, r.capacity - r.sold)} үлдсэн
                </span>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          className={`${ADMIN_BTN_CLS} self-start`}
          onClick={addRow}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Бүс нэмэх
        </button>
      </div>
    </section>
  );
}
