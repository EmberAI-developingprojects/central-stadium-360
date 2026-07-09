import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
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
import DatePicker from "../components/DatePicker";
import EventZonesEditor from "../components/EventZonesEditor";
import { useToast } from "../components/Toast";
import { LoadingState } from "../components/Skeleton";
import {
  ADMIN_ALERT_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_DANGER_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_SM_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const EMPTY: EventRecord = {
  id: "",
  title: "",
  desc: "",
  date: "",
  when: "",
  image: "",
  base: 0,
  featured: false,
  start_time: "",
  status: "upcoming",
  live_price: 0,
  replay_price: 0,
  price_standard: null,
  price_multi3: null,
  price_multi5: null,
  live_start_at: null,
  live_end_at: null,
  replay_available_until: null,
  thumbnail_url: null,
  titleEn: "",
  descEn: "",
};

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

function isoToDatePart(iso: string): string {
  return isoToLocalInput(iso).slice(0, 10);
}

function isoToTimePart(iso: string): string {
  return isoToLocalInput(iso).slice(11, 16);
}

function partsToIso(date: string, time: string): string {
  if (!date) return "";
  const t = time || "00:00";
  return localInputToIso(`${date}T${t}`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string | null, toIso: string | null): string {
  if (!fromIso || !toIso) return "";
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return "";
  const days = Math.round((to - from) / DAY_MS);
  return days > 0 ? String(days) : "";
}

function addDaysIso(iso: string | null, days: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + days * DAY_MS).toISOString();
}

const money = (n: number): string => n.toLocaleString("en-US") + "₮";

const CARD_CLS =
  "bg-white border border-[#ececef] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(24,24,27,0.04)]";
const CARD_HEAD_CLS =
  "flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#f4f4f5] bg-gradient-to-b from-[#fafafa] to-white";
const CARD_HEAD_ICON_BASE =
  "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset";
const CARD_HEAD_ICON_BLUE = `${CARD_HEAD_ICON_BASE} bg-[#eef0fd] text-brand-blue ring-[#dadffb]`;
const CARD_HEAD_ICON_EMERALD = `${CARD_HEAD_ICON_BASE} bg-emerald-50 text-emerald-600 ring-emerald-100`;
const CARD_HEAD_ICON_VIOLET = `${CARD_HEAD_ICON_BASE} bg-violet-50 text-violet-600 ring-violet-100`;
const CARD_HEAD_TITLE_CLS =
  "text-[14.5px] font-semibold tracking-[-0.01em] text-zinc-900 m-0 leading-tight";
const CARD_HEAD_DESC_CLS =
  "text-[12.5px] text-zinc-500 m-0 mt-0.5 leading-[1.45]";
const CARD_BODY_CLS = "p-6 flex flex-col gap-5";
const TWO_COL_CLS =
  "grid gap-5 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]";

type TimingStatus = {
  isPast: boolean;
  label: string;
};

function timingStatus(iso: string): TimingStatus | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) {
    const past = -diffMs;
    const days = Math.floor(past / (24 * 60 * 60 * 1000));
    const hours = Math.floor((past % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0)
      return { isPast: true, label: `${days} өдөр ${hours} цагийн өмнө` };
    const minutes = Math.floor((past % (60 * 60 * 1000)) / (60 * 1000));
    return { isPast: true, label: `${hours} цаг ${minutes} минутын өмнө` };
  }
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0)
    return { isPast: false, label: `${days} өдөр ${hours} цагийн дараа` };
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return { isPast: false, label: `${hours} цаг ${minutes} минутын дараа` };
}

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

  if (!loaded) return <LoadingState label="Арга хэмжээ уншиж байна…" />;

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
          <strong className="font-semibold text-zinc-900">
            «{form.title}»
          </strong>{" "}
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
        <div className="flex items-start gap-3">
          <span
            className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue-tint text-brand-blue ring-1 ring-inset ring-[#dadffb]"
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2>{isNew ? "Шинэ арга хэмжээ" : "Арга хэмжээ засах"}</h2>
              {isNew}
            </div>
            <p>
              {isNew
                ? "360° дамжуулалт зарагдах арга хэмжээний дэлгэрэнгүйг үүсгэх."
                : "Гарчиг, огноо, үнэ, нүүр зураг зэргийг засна."}
            </p>
          </div>
        </div>
        <Link
          to="/admin/events"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Буцах
        </Link>
      </div>

      {error && <div className={`${ADMIN_ALERT_CLS} mb-4`}>{error}</div>}

      <form onSubmit={onSubmit} className="pb-24">
        <div className="grid gap-5 [grid-template-columns:minmax(0,1fr)_360px] max-[1100px]:[grid-template-columns:1fr]">
          <div className="flex flex-col gap-5 min-w-0">
            <section className={CARD_CLS}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_BLUE} aria-hidden="true">
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className={CARD_HEAD_TITLE_CLS}>Үндсэн мэдээлэл</h3>
                  <p className={CARD_HEAD_DESC_CLS}>
                    Тоглолтын гарчиг, цаг, тайлбар.
                  </p>
                </div>
              </header>
              <div className={CARD_BODY_CLS}>
                <div
                  className={`${ADMIN_FIELD_CLS} [&_input]:!h-12 [&_input]:!text-[16px] [&_input]:!font-semibold [&_input]:tracking-[-0.01em]`}
                >
                  <label
                    htmlFor="evt-title"
                    className="flex items-center justify-between"
                  >
                    <span>Гарчиг *</span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      {(form.title || "").length}/120
                    </span>
                  </label>
                  <input
                    id="evt-title"
                    value={form.title}
                    onChange={(e) =>
                      update({ title: e.target.value.slice(0, 120) })
                    }
                    placeholder="Нэр"
                    maxLength={120}
                    required
                  />
                </div>

                <div className={ADMIN_FIELD_CLS}>
                  <label className="flex items-center gap-1.5">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-zinc-400"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Эхлэх огноо, цаг *
                  </label>
                  <div className="grid gap-3 [grid-template-columns:1.4fr_1fr] max-[480px]:[grid-template-columns:1fr]">
                    <DatePicker
                      id="evt-start-date"
                      value={isoToDatePart(form.start_time)}
                      onChange={(date) =>
                        update({
                          start_time: partsToIso(
                            date,
                            isoToTimePart(form.start_time),
                          ),
                        })
                      }
                      placeholder="yyyy.mm.dd"
                      required
                      allowPast
                    />
                    <div className="relative">
                      <input
                        id="evt-start-time"
                        type="time"
                        value={isoToTimePart(form.start_time)}
                        onChange={(e) =>
                          update({
                            start_time: partsToIso(
                              isoToDatePart(form.start_time),
                              e.target.value,
                            ),
                          })
                        }
                        className="!pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                  </div>
                  {startsAtLabel &&
                    (() => {
                      const status = timingStatus(form.start_time);
                      return (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-zinc-100 text-zinc-700 text-[11.5px] font-medium">
                            {startsAtLabel}
                          </span>
                          {status && (
                            <span
                              className={
                                status.isPast
                                  ? "inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-zinc-200 text-zinc-700 text-[11.5px] font-semibold"
                                  : "inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-emerald-50 text-emerald-700 text-[11.5px] font-semibold"
                              }
                            >
                              {status.isPast
                                ? "Өнгөрсөн арга хэмжээ"
                                : "Удахгүй болох"}
                            </span>
                          )}
                          {status && (
                            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-brand-blue-tint text-brand-blue text-[11.5px] font-medium">
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {status.label}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                </div>

                <div className={ADMIN_FIELD_CLS}>
                  <label className="flex items-center gap-1.5">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-zinc-400"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Дуусах огноо, цаг
                  </label>
                  <div className="grid gap-3 [grid-template-columns:1.4fr_1fr] max-[480px]:[grid-template-columns:1fr]">
                    <DatePicker
                      id="evt-end-date"
                      value={isoToDatePart(form.live_end_at ?? "")}
                      onChange={(date) => {
                        const iso = date
                          ? partsToIso(
                              date,
                              isoToTimePart(form.live_end_at ?? ""),
                            )
                          : "";
                        update({ live_end_at: iso || null });
                      }}
                      placeholder="yyyy.mm.dd"
                      allowPast
                    />
                    <div className="relative">
                      <input
                        id="evt-end-time"
                        type="time"
                        value={isoToTimePart(form.live_end_at ?? "")}
                        onChange={(e) => {
                          const datePart = isoToDatePart(
                            form.live_end_at ?? "",
                          );
                          if (!datePart) return;
                          const iso = partsToIso(datePart, e.target.value);
                          update({ live_end_at: iso || null });
                        }}
                        className="!pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                  </div>
                  <small className="text-zinc-500 text-[12px]">
                    Шууд дамжуулалт дуусах товлосон цаг. Үүнээс хойш нөхөж үзэх
                    цонх эхэлнэ.
                  </small>
                </div>

                <div className={ADMIN_FIELD_CLS}>
                  <label
                    htmlFor="evt-desc"
                    className="flex items-center justify-between"
                  >
                    <span>Тайлбар</span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      {(form.desc || "").length}/600
                    </span>
                  </label>
                  <textarea
                    id="evt-desc"
                    value={form.desc}
                    onChange={(e) =>
                      update({ desc: e.target.value.slice(0, 600) })
                    }
                    placeholder="Тайлбар"
                    rows={5}
                    maxLength={600}
                  />
                </div>

                <EventEnglishSection form={form} update={update} />
              </div>
            </section>

            <section className={CARD_CLS}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_EMERALD} aria-hidden="true">
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
                    <label htmlFor="evt-price-standard">
                      Энгийн тасалбар (₮) · 1 төхөөрөмж
                    </label>
                    <input
                      id="evt-price-standard"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.price_standard || ""}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        update({
                          price_standard: v || null,
                          live_price: v,
                          base: v,
                        });
                      }}
                      placeholder="9900"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                    />
                  </div>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-price-multi3">
                      3 хэрэглэгчийн тасалбар (₮) · 3 төхөөрөмж
                    </label>
                    <input
                      id="evt-price-multi3"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.price_multi3 || ""}
                      onChange={(e) =>
                        update({
                          price_multi3: Number(e.target.value) || null,
                        })
                      }
                      placeholder="14900"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                    />
                  </div>
                </div>
                <div className={TWO_COL_CLS}>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-price-multi5">
                      5 хэрэглэгчийн тасалбар (₮) · 5 төхөөрөмж + нөхөж үзэх
                    </label>
                    <input
                      id="evt-price-multi5"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.price_multi5 || ""}
                      onChange={(e) =>
                        update({
                          price_multi5: Number(e.target.value) || null,
                        })
                      }
                      placeholder="19900"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                    />
                  </div>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-replay-price">
                      Нөхөж үзэх дангаар нь (₮) — тоглолтын дараах худалдан
                      авалт
                    </label>
                    <input
                      id="evt-replay-price"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.replay_price || ""}
                      onChange={(e) =>
                        update({
                          replay_price: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                    />
                  </div>
                </div>

                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor="evt-replay-days">
                    Нөхөж үзэх хугацаа (5 хэрэглэгчийн тасалбарт) — хэд хоног?
                  </label>
                  <div className="relative">
                    <input
                      id="evt-replay-days"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={daysBetween(
                        form.live_end_at,
                        form.replay_available_until,
                      )}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        const n = raw === "" ? 0 : Number(raw);
                        update({
                          replay_available_until:
                            n > 0 ? addDaysIso(form.live_end_at, n) : null,
                        });
                      }}
                      placeholder="Хоногийн тоо"
                      className="!pr-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                      disabled={!form.live_end_at}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-zinc-500">
                      хоног
                    </span>
                  </div>
                  {!form.live_end_at && (
                    <small className="text-zinc-500 text-[12px]">
                      Эхлээд "Дуусах огноо"-г сонгоно уу.
                    </small>
                  )}
                </div>

                <div className={TWO_COL_CLS}>
                  <div className={ADMIN_FIELD_CLS}>
                    <label htmlFor="evt-base">Үндсэн үнэ (legacy)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-zinc-400 pointer-events-none">
                        ₮
                      </span>
                      <input
                        id="evt-base"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={
                          form.base ? form.base.toLocaleString("en-US") : ""
                        }
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D+/g, "");
                          update({ base: digits ? Number(digits) : 0 });
                        }}
                        className="!h-12 !pl-9 !text-[18px] !font-semibold tabular-nums"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-[11.5px] text-zinc-500 flex items-center gap-1">
                      <span>Үзэгчдэд харагдах:</span>
                      <span className="font-semibold text-zinc-700 tabular-nums">
                        {money(form.base || 0)}
                      </span>
                    </span>
                  </div>

                </div>
              </div>
            </section>

            {!isNew && id && <EventZonesEditor eventId={id} />}
          </div>

          <aside className="min-w-0 flex flex-col gap-5 sticky top-[76px] self-start">
            <section className={CARD_CLS}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_VIOLET} aria-hidden="true">
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
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className={CARD_HEAD_TITLE_CLS}>Урьдчилан харах</h3>
                  <p className={CARD_HEAD_DESC_CLS}>Үзэгчдэд харагдах төрх.</p>
                </div>
              </header>
              <div className="p-5">
                <div className="rounded-xl overflow-hidden border border-[#ececef] bg-zinc-900 text-white shadow-[0_8px_24px_-12px_rgba(31,41,55,0.4)]">
                  <div
                    className="w-full aspect-[16/9] bg-zinc-800 bg-center bg-cover bg-no-repeat relative"
                    style={
                      form.image
                        ? { backgroundImage: `url('${form.image}')` }
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    {!form.image && (
                      <div className="absolute inset-0 grid place-items-center text-zinc-500 text-[11.5px]">
                        Нүүр зураг алга
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="text-[13.5px] font-semibold leading-tight line-clamp-2 min-h-[34px]">
                      {form.title || "Гарчиг оруулна уу…"}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11.5px] text-zinc-300">
                      <span>{startsAtLabel || "Огноо тодорхойгүй"}</span>
                      <span className="font-semibold text-amber-300 tabular-nums">
                        {money(form.base || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={CARD_CLS}>
              <header className={CARD_HEAD_CLS}>
                <span className={CARD_HEAD_ICON_VIOLET} aria-hidden="true">
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>
                    <div className="text-center px-3">
                      <div className="text-[13px] font-semibold text-zinc-800">
                        {uploading
                          ? "Ачаалж байна…"
                          : "Зураг чирж тавих эсвэл сонгох"}
                      </div>
                      <div className="text-[11.5px] text-zinc-500 mt-0.5">
                        JPG · PNG · WEBP · GIF, ≤ 5 MB
                      </div>
                    </div>
                  </div>
                )}

                <div className={ADMIN_FIELD_CLS}>
                  <label
                    htmlFor="evt-img-url"
                    className="text-[11.5px] uppercase tracking-[0.06em] !text-zinc-500 !font-semibold"
                  >
                    эсвэл URL
                  </label>
                  <input
                    id="evt-img-url"
                    value={form.image}
                    onChange={(e) => update({ image: e.target.value })}
                    placeholder="Зургийн URL"
                  />
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="sticky bottom-0 -mx-8 mt-6 bg-white/95 backdrop-blur-md border-t border-[#ececef] px-8 py-4 flex items-center gap-2.5 z-10 shadow-[0_-8px_24px_-12px_rgba(31,41,55,0.12)]">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg font-[inherit] text-[13.5px] font-semibold bg-brand-blue text-white border-0 cursor-pointer transition-all shadow-[0_8px_20px_-8px_rgba(34,48,198,0.55)] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(34,48,198,0.65)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            disabled={busy}
          >
            {busy ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="animate-spin"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Хадгалж байна…
              </>
            ) : (
              <>
                {isNew ? "Үүсгэх" : "Хадгалах"}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
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

function EventEnglishSection({
  form,
  update,
}: {
  form: EventRecord;
  update: (patch: Partial<EventRecord>) => void;
}) {
  const hasAny = !!(form.titleEn || form.descEn);
  const [open, setOpen] = useState(hasAny);
  return (
    <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid #ececef" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-zinc-600 hover:text-zinc-900 text-[12.5px] font-medium transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform text-zinc-400"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Англи орчуулга
        {hasAny && !open && (
          <span className="text-[11px] text-zinc-400">· бөглөсөн</span>
        )}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <div className={ADMIN_FIELD_CLS}>
            <label htmlFor="evt-title-en" className="flex items-center justify-between">
              <span>Гарчиг (EN)</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {(form.titleEn || "").length}/120
              </span>
            </label>
            <input
              id="evt-title-en"
              value={form.titleEn || ""}
              onChange={(e) => update({ titleEn: e.target.value.slice(0, 120) })}
              placeholder="Name"
              maxLength={120}
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label htmlFor="evt-desc-en" className="flex items-center justify-between">
              <span>Тайлбар (EN)</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {(form.descEn || "").length}/600
              </span>
            </label>
            <textarea
              id="evt-desc-en"
              value={form.descEn || ""}
              onChange={(e) => update({ descEn: e.target.value.slice(0, 600) })}
              placeholder="Description"
              rows={5}
              maxLength={600}
            />
          </div>
        </div>
      )}
    </div>
  );
}
