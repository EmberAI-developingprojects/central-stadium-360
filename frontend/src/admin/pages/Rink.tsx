import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { AdminRink, AdminRinkInput, AdminRinkLive, AdminRinkSession } from "@cs360/shared";
import { api } from "../../lib/api";
import { mnt, minutesLabel, minutesLeft, ubClock } from "../../pages/Rink/format";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { LoadingState } from "../components/Skeleton";
import {
  ADMIN_ALERT_CLS,
  ADMIN_BADGE_CLS,
  ADMIN_BADGE_PAID_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_CARD_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FORM_ROW_CLS,
  ADMIN_PAGE_HEADER_CLS,
  ADMIN_STAT_CARD_CLS,
  ADMIN_TABLE_CLS,
  ADMIN_TABLE_WRAP_CLS,
} from "../_adminStyles";

const LIVE_REFRESH_MS = 10_000;

const ERRORS: Record<string, string> = {
  count_below_out: "Гутлын тоог одоо гадуур байгаа тооноос бага болгох боломжгүй.",
  duplicate_size: "Размер давхардсан байна.",
  sizes_required: "Дор хаяж нэг размер оруулна уу.",
  invalid_input: "Мэдээлэл буруу байна. Талбаруудаа шалгана уу.",
  title_required: "Нэр оруулна уу.",
};

type SizeRow = { size: string; count: string };
type Form = {
  title: string;
  price: string;
  duration: string;
  overtime: string;
  on_sale: boolean;
  sizes: SizeRow[];
};

const EMPTY_FORM: Form = {
  title: "Мөсөн гулгуур",
  price: "",
  duration: "120",
  overtime: "3000",
  on_sale: true,
  sizes: [
    { size: "36", count: "" },
    { size: "38", count: "" },
    { size: "40", count: "" },
    { size: "42", count: "" },
  ],
};

function toForm(r: AdminRink): Form {
  return {
    title: r.title,
    price: String(r.price),
    duration: String(r.duration_minutes),
    overtime: String(r.overtime_per_minute),
    on_sale: r.on_sale,
    sizes: r.sizes.map((s) => ({ size: s.size, count: String(s.count) })),
  };
}

function toInput(f: Form): AdminRinkInput | string {
  const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);
  const price = int(f.price);
  const duration = int(f.duration);
  const overtime = int(f.overtime);
  if (!f.title.trim()) return "Нэр оруулна уу.";
  if (Number.isNaN(price)) return "Үнэ буруу байна.";
  if (Number.isNaN(duration) || duration < 1) return "Хугацаа буруу байна.";
  if (Number.isNaN(overtime)) return "Минутын нэмэлт төлбөр буруу байна.";
  const sizes = f.sizes
    .filter((s) => s.size.trim() || s.count.trim())
    .map((s) => ({ size: s.size.trim(), count: int(s.count || "0") }));
  if (sizes.length === 0) return "Дор хаяж нэг размер оруулна уу.";
  if (sizes.some((s) => !s.size || Number.isNaN(s.count))) return "Размер, тоогоо шалгана уу.";
  return { title: f.title.trim(), price, duration_minutes: duration, overtime_per_minute: overtime, on_sale: f.on_sale, sizes };
}

function RinkSettings({ rink, onSaved }: { rink: AdminRink | null; onSaved: (r: AdminRink) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Form>(rink ? toForm(rink) : EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const outBySize = new Map(rink?.sizes.map((s) => [s.size, s]) ?? []);

  useEffect(() => {
    if (rink) setForm(toForm(rink));
  }, [rink]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setSize = (i: number, patch: Partial<SizeRow>) =>
    setForm((f) => ({ ...f, sizes: f.sizes.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const input = toInput(form);
    if (typeof input === "string") return setError(input);
    setBusy(true);
    const res = rink ? await api.admin.rink.update(rink.id, input) : await api.admin.rink.create(input);
    setBusy(false);
    if (!res.ok) return setError(ERRORS[res.error] ?? `Хадгалахад алдаа гарлаа (${res.error}).`);
    toast.success("Хадгаллаа.");
    onSaved(res.data);
  };

  return (
    <form className={ADMIN_CARD_CLS} onSubmit={onSubmit}>
      <h3>{rink ? "Тохиргоо" : "Мөсөн гулгуур нээх"}</h3>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Нэр (kiosk дээр харагдана)</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Тасалбарын үнэ (₮)</label>
          <input inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="15000" />
        </div>
      </div>
      <div className={ADMIN_FORM_ROW_CLS}>
        <div className={ADMIN_FIELD_CLS}>
          <label>Гулгах хугацаа (минут)</label>
          <input inputMode="numeric" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
        </div>
        <div className={ADMIN_FIELD_CLS}>
          <label>Хэтэрсэн минут бүрийн төлбөр (₮)</label>
          <input inputMode="numeric" value={form.overtime} onChange={(e) => set("overtime", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13px] my-2">
        <input type="checkbox" checked={form.on_sale} onChange={(e) => set("on_sale", e.target.checked)} />
        Kiosk дээр зарагдаж байна
      </label>

      <h4 className="text-[13px] font-semibold mt-4 mb-2">Гутлын размер ба тоо</h4>
      <div className={ADMIN_TABLE_WRAP_CLS}>
        <table className={ADMIN_TABLE_CLS}>
          <thead>
            <tr>
              <th>Размер</th>
              <th>Нийт гутал</th>
              <th>Гадуур</th>
              <th>Зарах боломжтой</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {form.sizes.map((s, i) => {
              const live = outBySize.get(s.size.trim());
              return (
                <tr key={i}>
                  <td>
                    <input aria-label="Размер" value={s.size} onChange={(e) => setSize(i, { size: e.target.value })} className="w-20 border border-zinc-200 rounded px-2 py-1" />
                  </td>
                  <td>
                    <input aria-label="Нийт гутал" inputMode="numeric" value={s.count} onChange={(e) => setSize(i, { count: e.target.value })} className="w-20 border border-zinc-200 rounded px-2 py-1" />
                  </td>
                  <td>{live?.out ?? 0}</td>
                  <td>{live?.available ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                      disabled={(live?.out ?? 0) > 0}
                      title={(live?.out ?? 0) > 0 ? "Гадуур байгаа гуталтай размерыг хасах боломжгүй" : undefined}
                      onClick={() => set("sizes", form.sizes.filter((_, j) => j !== i))}
                    >
                      Хасах
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} mt-2`} onClick={() => set("sizes", [...form.sizes, { size: "", count: "" }])}>
        + Размер нэмэх
      </button>

      {error && <div className={`${ADMIN_ALERT_CLS} mt-3`} role="alert">{error}</div>}
      <div className="mt-4">
        <button type="submit" disabled={busy} className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}>
          {busy ? "Хадгалж байна…" : rink ? "Хадгалах" : "Нээх"}
        </button>
      </div>
    </form>
  );
}

function SessionTable({
  title,
  rows,
  now,
  kind,
  onCash,
}: {
  title: string;
  rows: AdminRinkSession[];
  now: number;
  kind: "active" | "overdue" | "done";
  onCash?: (s: AdminRinkSession) => void;
}) {
  return (
    <div className={ADMIN_CARD_CLS}>
      <h3>
        {title} <span className="text-zinc-400 font-normal">({rows.length})</span>
      </h3>
      {rows.length === 0 ? (
        <div className={ADMIN_EMPTY_CLS}>Алга</div>
      ) : (
        <div className={ADMIN_TABLE_WRAP_CLS}>
          <table className={ADMIN_TABLE_CLS}>
            <thead>
              <tr>
                <th>Утас</th>
                <th>Гутал</th>
                <th>Эхэлсэн</th>
                <th>Дуусах</th>
                <th>{kind === "active" ? "Үлдсэн" : "Нэмэлт төлбөр"}</th>
                {kind !== "active" && <th>{kind === "overdue" ? "" : "Төлсөн"}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const left = s.ends_at ? minutesLeft(s.ends_at, now) : 0;
                return (
                  <tr key={s.code} className={kind === "active" && left < 0 ? "bg-red-50" : undefined}>
                    <td className="font-medium">{s.phone ?? "—"}</td>
                    <td>{s.size}</td>
                    <td>{ubClock(s.started_at)}</td>
                    <td>{ubClock(kind === "active" ? s.ends_at : s.ended_at)}</td>
                    <td className={kind === "active" && left < 0 ? "text-red-600 font-semibold" : undefined}>
                      {kind === "active"
                        ? minutesLabel(left)
                        : s.overtime_amount
                          ? `${s.overtime_minutes} мин · ${mnt(s.overtime_amount)}`
                          : "—"}
                    </td>
                    {kind === "overdue" && (
                      <td>
                        <button type="button" className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`} onClick={() => onCash?.(s)}>
                          Бэлнээр төлсөн
                        </button>
                      </td>
                    )}
                    {kind === "done" && (
                      <td>
                        {s.overtime_paid_via ? (
                          <span className={`${ADMIN_BADGE_CLS} ${ADMIN_BADGE_PAID_CLS}`}>
                            {s.overtime_paid_via === "cash" ? "Бэлэн" : "QPay"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Rink() {
  const confirm = useConfirm();
  const toast = useToast();
  const [rinks, setRinks] = useState<AdminRink[] | null>(null);
  const [live, setLive] = useState<AdminRinkLive | null>(null);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadRinks = useCallback(async () => {
    const res = await api.admin.rink.list();
    if (!res.ok) return setLoadError("Ачаалахад алдаа гарлаа.");
    setRinks(res.data);
  }, []);

  const loadLive = useCallback(async () => {
    const res = await api.admin.rink.live();
    if (res.ok) {
      setLive(res.data);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    void loadRinks();
    void loadLive();
    const t = setInterval(() => void loadLive(), LIVE_REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
  }, [loadRinks, loadLive]);

  const onCash = async (s: AdminRinkSession) => {
    const ok = await confirm({
      title: "Бэлнээр төлсөн үү?",
      message: `${s.phone ?? s.code} — ${mnt(s.overtime_amount)} бэлнээр хүлээн авснаар бүртгэнэ.`,
      confirmLabel: "Тийм, төлсөн",
      cancelLabel: "Болих",
    });
    if (!ok) return;
    const res = await api.scanner.overtimeCash(s.code);
    if (!res.ok) return toast.error("Бүртгэж чадсангүй.");
    toast.success("Бүртгэлээ.");
    void loadLive();
    void loadRinks();
  };

  if (loadError) return <div className={ADMIN_ALERT_CLS}>{loadError}</div>;
  if (!rinks) return <LoadingState />;

  const rink = rinks[0] ?? null;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Мөсөн гулгуур</h2>
          <p>Гутал түрээс, гулгаж буй хүмүүс, хэтэрсэн хугацааны төлбөр</p>
        </div>
        <Link to="/scanner" className={ADMIN_BTN_CLS}>
          Шалгагчийн хэсэг / LED
        </Link>
      </div>

      {live && (
        <div className="grid grid-cols-5 gap-3 mb-4 max-[980px]:grid-cols-2">
          {[
            ["Өнөөдөр зарагдсан", String(live.totals.sold_today)],
            ["Мөсөн дээр", String(live.totals.on_ice)],
            ["Төлбөр хүлээгдэж буй", String(live.totals.overdue)],
            ["Нэмэлт — QPay", mnt(live.totals.overtime_paid_qpay)],
            ["Нэмэлт — бэлэн", mnt(live.totals.overtime_paid_cash)],
          ].map(([label, value]) => (
            <div key={label} className={ADMIN_STAT_CARD_CLS}>
              <div className="text-[12px] text-zinc-500">{label}</div>
              <div className="text-[22px] font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      )}

      {live && (
        <>
          <SessionTable title="Мөсөн дээр" rows={live.active} now={now} kind="active" />
          <SessionTable title="Нэмэлт төлбөр хүлээгдэж буй" rows={live.overdue} now={now} kind="overdue" onCash={onCash} />
          <SessionTable title="Өнөөдөр дууссан" rows={live.done_today} now={now} kind="done" />
        </>
      )}

      <RinkSettings
        rink={rink}
        onSaved={(r) => setRinks((list) => [r, ...(list ?? []).filter((x) => x.id !== r.id)])}
      />
    </>
  );
}
