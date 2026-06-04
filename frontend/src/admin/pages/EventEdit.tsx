import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createEvent,
  deleteEvent,
  getEvent,
  updateEvent,
} from "../../data/store";
import type { EventRecord } from "../../data/store";
import { api } from "../../lib/api";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import {
  ADMIN_ALERT_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_EMPTY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const EMPTY: EventRecord = {
  id: "",
  title: "",
  desc: "",
  date: "",
  when: "",
  pill: "Концерт",
  image: "",
  base: 0,
  featured: false,
  start_time: "",
};

const CATEGORY_SUGGESTIONS = [
  "Концерт",
  "Спорт",
  "Тоглолт",
  "Шоу",
  "Бусад",
];

function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

const money = (n: number): string => n.toLocaleString("en-US") + "₮";

const CARD_CLS =
  "bg-white border border-[#ececef] rounded-xl overflow-hidden";
const CARD_HEAD_CLS =
  "flex items-start gap-3 px-5 pt-5 pb-3 border-b border-[#f4f4f5]";
const CARD_HEAD_ICON_CLS =
  "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700";
const CARD_HEAD_TITLE_CLS =
  "text-[14px] font-semibold tracking-[-0.01em] text-zinc-900 m-0 leading-tight";
const CARD_HEAD_DESC_CLS =
  "text-[12.5px] text-zinc-500 m-0 mt-0.5 leading-[1.45]";
const CARD_BODY_CLS = "p-5 flex flex-col gap-5";
const TWO_COL_CLS =
  "grid gap-5 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]";

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const isNew = !id;

  const [form, setForm] = useState<EventRecord>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew || !id) return;
    getEvent(id).then((e) => {
      if (!e) {
        setError("Арга хэмжээ олдсонгүй.");
        setLoaded(true);
        return;
      }
      setForm(e);
      setLoaded(true);
    });
  }, [id, isNew]);

  if (!loaded) return <div className={ADMIN_EMPTY_CLS}>Уншиж байна…</div>;

  const update = (patch: Partial<EventRecord>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Гарчиг шаардлагатай.");
      return;
    }
    if (!form.start_time) {
      setError("Огноо, цаг шаардлагатай.");
      return;
    }
    setBusy(true);
    try {
      if (isNew) {
        await createEvent(form);
        toast.success("Арга хэмжээ үүсгэгдлээ.");
      } else if (id) {
        await updateEvent(id, form);
        toast.success("Өөрчлөлт хадгалагдлаа.");
      }
      navigate("/admin/events");
    } catch (err) {
      setError((err as Error).message || "Хадгалах боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: "Арга хэмжээг устгах уу?",
      message: (
        <>
          <strong className="font-semibold text-zinc-900">«{form.title}»</strong>{" "}
          бүх захиалга, тасалбарын хамт устгагдана. Энэ үйлдлийг буцаах
          боломжгүй.
        </>
      ),
      confirmLabel: "Устгах",
      cancelLabel: "Болих",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteEvent(id);
      toast.success(`«${form.title}» устгалаа.`);
      navigate("/admin/events");
    } catch (e) {
      toast.error((e as Error).message || "Устгах боломжгүй.");
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зургийн файл сонгоно уу.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Зурагны хэмжээ 5MB-аас бага байх ёстой.");
      return;
    }
    setError("");
    setUploading(true);
    const res = await api.admin.uploadImage(file);
    setUploading(false);
    if (!res.ok) {
      setError(`Зураг ачаалах боломжгүй: ${res.error}`);
      return;
    }
    update({ image: res.data.url });
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await handleFile(file);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    await handleFile(file);
  };

  const startsAtLabel = form.start_time
    ? new Date(form.start_time).toLocaleString("mn-MN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{isNew ? "Шинэ арга хэмжээ" : "Арга хэмжээ засах"}</h2>
          <p>
            {isNew
              ? "360° дамжуулалт зарагдах арга хэмжээний дэлгэрэнгүйг үүсгэх."
              : "Гарчиг, огноо, үнэ, нүүр зураг зэргийг засна."}
          </p>
        </div>
        <Link
          to="/admin/events"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Жагсаалт руу
        </Link>
      </div>

      {error && (
        <div className={`${ADMIN_ALERT_CLS} mb-4`}>{error}</div>
      )}

      <form onSubmit={onSubmit} className="pb-24">
        <div className="grid gap-5 [grid-template-columns:minmax(0,1fr)_360px] max-[1100px]:[grid-template-columns:1fr]">

          <div className="flex flex-col gap-5 min-w-0">

            <section className={CARD_CLS}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_CLS} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className={CARD_HEAD_TITLE_CLS}>Үндсэн мэдээлэл</h3>
                  <p className={CARD_HEAD_DESC_CLS}>
                    Тоглолтын гарчиг, ангилал, цаг, тайлбар.
                  </p>
                </div>
              </header>
              <div className={CARD_BODY_CLS}>
                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor="evt-title">Гарчиг *</label>
                  <input
                    id="evt-title"
                    value={form.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="Жишээ нь: HU Concert Live 2026"
                    required
                  />
                </div>

                <div className={TWO_COL_CLS}>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-pill">Ангилал</label>
                    <input
                      id="evt-pill"
                      value={form.pill}
                      onChange={(e) => update({ pill: e.target.value })}
                      placeholder="Концерт"
                      list="evt-pill-suggestions"
                    />
                    <datalist id="evt-pill-suggestions">
                      {CATEGORY_SUGGESTIONS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-start">Эхлэх огноо, цаг *</label>
                    <input
                      id="evt-start"
                      type="datetime-local"
                      value={isoToLocalInput(form.start_time)}
                      onChange={(e) =>
                        update({ start_time: localInputToIso(e.target.value) })
                      }
                      required
                    />
                    {startsAtLabel && (
                      <span className="text-[11.5px] text-zinc-500">
                        {startsAtLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor="evt-desc">Тайлбар</label>
                  <textarea
                    id="evt-desc"
                    value={form.desc}
                    onChange={(e) => update({ desc: e.target.value })}
                    placeholder="Тоглолтын талаар товч мэдээлэл, онцлох тоглогчид, тусгай мэдэгдэл…"
                    rows={5}
                  />
                  <span className="text-[11.5px] text-zinc-500">
                    {(form.desc || "").length} тэмдэгт
                  </span>
                </div>
              </div>
            </section>

            <section className={CARD_CLS}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_CLS} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className={CARD_HEAD_TITLE_CLS}>Үнэ ба байршил</h3>
                  <p className={CARD_HEAD_DESC_CLS}>
                    Эхлэлтийн үнэ. Шууд хуудсан дээр гарах эсэх.
                  </p>
                </div>
              </header>
              <div className={CARD_BODY_CLS}>
                <div className={TWO_COL_CLS}>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-base">Үндсэн үнэ (₮)</label>
                    <div className="relative">
                      <input
                        id="evt-base"
                        type="number"
                        min="0"
                        step="500"
                        value={form.base}
                        onChange={(e) =>
                          update({ base: Number(e.target.value) })
                        }
                        className="!pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400 pointer-events-none">
                        ₮
                      </span>
                    </div>
                    <span className="text-[11.5px] text-zinc-500">
                      Тасалбар үзэгчдэд: {money(form.base || 0)}
                    </span>
                  </div>

                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                      form.featured
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-[#e4e4e7] bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!form.featured}
                      onChange={(e) => update({ featured: e.target.checked })}
                      className="mt-0.5 h-4 w-4 accent-zinc-900 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-zinc-900 leading-tight">
                        Featured (Шууд) болгох
                      </div>
                      <div className="text-[12px] text-zinc-500 mt-0.5 leading-[1.45]">
                        Watch нүүр хуудаст hero хэсэгт энэ арга хэмжээ онцлогдоно.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0">
            <section className={`${CARD_CLS} sticky top-[76px]`}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_CLS} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className={CARD_HEAD_TITLE_CLS}>Нүүр зураг</h3>
                  <p className={CARD_HEAD_DESC_CLS}>
                    16:9 харьцаа, дээд тал нь 5 MB.
                  </p>
                </div>
              </header>
              <div className={CARD_BODY_CLS}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onFileChange}
                  className="hidden"
                />

                {form.image ? (
                  <div className="relative group">
                    <div
                      className="w-full aspect-[16/9] rounded-lg bg-zinc-100 bg-center bg-cover bg-no-repeat ring-1 ring-inset ring-[#ececef]"
                      style={{ backgroundImage: `url('${form.image}')` }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS}`}
                        onClick={onPickFile}
                        disabled={uploading || busy}
                      >
                        {uploading ? "Ачаалж байна…" : "Солих"}
                      </button>
                      <button
                        type="button"
                        className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_SM_CLS} ${ADMIN_BTN_DANGER_CLS}`}
                        onClick={() => update({ image: "" })}
                        disabled={uploading || busy}
                      >
                        Арилгах
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={onPickFile}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPickFile();
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-2 w-full aspect-[16/9] rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                      dragOver
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-[#e4e4e7] bg-[#fafafa] hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#e4e4e7] text-zinc-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>
                    <div className="text-center px-3">
                      <div className="text-[13px] font-semibold text-zinc-800">
                        {uploading ? "Ачаалж байна…" : "Зураг чирж тавих эсвэл сонгох"}
                      </div>
                      <div className="text-[11.5px] text-zinc-500 mt-0.5">
                        JPG · PNG · WEBP · GIF, ≤ 5 MB
                      </div>
                    </div>
                  </div>
                )}

                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor="evt-img-url" className="text-[11.5px] uppercase tracking-[0.06em] !text-zinc-500 !font-semibold">
                    эсвэл URL
                  </label>
                  <input
                    id="evt-img-url"
                    value={form.image}
                    onChange={(e) => update({ image: e.target.value })}
                    placeholder="https://… эсвэл /assets/images/events/…"
                  />
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="sticky bottom-0 -mx-8 mt-6 bg-white/95 backdrop-blur-md border-t border-[#ececef] px-8 py-3.5 flex items-center gap-2 z-10">
          <button
            type="submit"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            disabled={busy}
          >
            {busy ? "Хадгалж байна…" : isNew ? "Үүсгэх" : "Хадгалах"}
          </button>
          <Link
            to="/admin/events"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            Болих
          </Link>
          {!isNew && (
            <button
              type="button"
              className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_DANGER_CLS} ml-auto`}
              onClick={onDelete}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              Устгах
            </button>
          )}
        </div>
      </form>
    </>
  );
}
