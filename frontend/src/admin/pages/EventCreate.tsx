import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { createEvent } from "../../data/store";
import { api } from "../../lib/api";
import DatePicker from "../components/DatePicker";
import { useToast } from "../components/Toast";
import {
  ADMIN_ALERT_CLS,
  ADMIN_BTN_CLS,
  ADMIN_BTN_GHOST_CLS,
  ADMIN_BTN_PRIMARY_CLS,
  ADMIN_FIELD_CLS,
  ADMIN_FORM_ACTIONS_CLS,
  ADMIN_PAGE_HEADER_CLS,
} from "../_adminStyles";

const CARD_CLS =
  "bg-white border border-[#ececef] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(24,24,27,0.04)]";
const CARD_HEAD_CLS =
  "px-6 pt-5 pb-4 border-b border-[#f4f4f5] bg-gradient-to-b from-[#fafafa] to-white";
const CARD_HEAD_TITLE_CLS =
  "text-[14.5px] font-semibold tracking-[-0.01em] text-zinc-900 m-0 leading-tight";
const CARD_HEAD_DESC_CLS =
  "text-[12.5px] text-zinc-500 m-0 mt-0.5 leading-[1.45]";
const CARD_BODY_CLS = "p-6 flex flex-col gap-5";
const TWO_COL_CLS =
  "grid gap-5 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:[grid-template-columns:1fr]";

function EventEnglishSection({
  nameEn,
  descEn,
  onChangeName,
  onChangeDesc,
}: {
  nameEn: string;
  descEn: string;
  onChangeName: (v: string) => void;
  onChangeDesc: (v: string) => void;
}) {
  const hasAny = !!(nameEn || descEn);
  const [open, setOpen] = useState(false);
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
            <label
              htmlFor="ev-name-en"
              className="flex items-center justify-between"
            >
              <span>Нэр (EN)</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {nameEn.length}/120
              </span>
            </label>
            <input
              id="ev-name-en"
              value={nameEn}
              onChange={(e) => onChangeName(e.target.value.slice(0, 120))}
              placeholder="Name"
              maxLength={120}
            />
          </div>
          <div className={ADMIN_FIELD_CLS}>
            <label
              htmlFor="ev-desc-en"
              className="flex items-center justify-between"
            >
              <span>Тайлбар (EN)</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {descEn.length}/600
              </span>
            </label>
            <textarea
              id="ev-desc-en"
              value={descEn}
              onChange={(e) => onChangeDesc(e.target.value.slice(0, 600))}
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

type Channel = "web" | "kiosk";

const CHANNEL_META: Record<
  Channel,
  {
    label: string;
    lead: string;
    chipCls: string;
    other: string;
    otherHint: string;
  }
> = {
  web: {
    label: "Вэб дээр нэмэх",
    lead: "Сайт дээр жагсаагдаж, онлайн шууд ба нөхөж үзэх тасалбар зарагдана.",
    chipCls: "bg-[#eef0fd] text-brand-blue ring-[#dadffb]",
    other: "Мөн касс (kiosk) дээр нэмэх",
    otherHint: "Бүсийн тасалбарыг цэнгэлдэх дээр биечлэн бас зарна.",
  },
  kiosk: {
    label: "Касс (kiosk) дээр нэмэх",
    lead: "Цэнгэлдэх дээрх касс дээр гарч, бүсийн тасалбар биечлэн зарагдана.",
    chipCls: "bg-amber-50 text-amber-700 ring-amber-100",
    other: "Мөн вэб сайт дээр нэмэх",
    otherHint: "Онлайн шууд ба нөхөж үзэх тасалбарыг сайт дээр бас зарна.",
  },
};

function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export default function EventCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  // The chooser step (/admin/events/new) routes here with the storefront
  // already picked, so the form only shows the fields that channel needs.
  const { channel } = useParams<{ channel: string }>();
  const primary: Channel = channel === "kiosk" ? "kiosk" : "web";
  const meta = CHANNEL_META[primary];
  // A hand-typed / stale URL must not silently default to the web form.
  const unknownChannel = channel !== "web" && channel !== "kiosk";

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [replayDays, setReplayDays] = useState("");
  const [priceStandard, setPriceStandard] = useState("");
  const [priceMulti3, setPriceMulti3] = useState("");
  const [priceMulti5, setPriceMulti5] = useState("");
  const [replayPrice, setReplayPrice] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descEn, setDescEn] = useState("");
  // The chosen channel is always on; the other one is an opt-in extra.
  const [alsoOther, setAlsoOther] = useState(false);
  const showOnWeb = primary === "web" || alsoOther;
  const showOnKiosk = primary === "kiosk" || alsoOther;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (date && !endDate) setEndDate(date);
  }, [date, endDate]);

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
    setThumbnailUrl(res.data.url);
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Нэр шаардлагатай.");
      return;
    }
    if (!date) {
      setError("Огноо шаардлагатай.");
      return;
    }

    const liveStartIso = combineDateTime(date, startTime);
    const liveEndIso = combineDateTime(endDate, endTime);

    const startTimeIso =
      liveStartIso ??
      (() => {
        const d = new Date(`${date}T00:00`);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      })();
    if (!startTimeIso) {
      setError("Огноо алдаатай.");
      return;
    }

    const daysNum = Number(replayDays);
    const replayUntilIso =
      liveEndIso && Number.isFinite(daysNum) && daysNum > 0
        ? addDays(liveEndIso, daysNum)
        : null;

    setBusy(true);
    try {
      const cover = thumbnailUrl.trim();
      const trimmedDesc = desc.trim();
      // Standard tier is the "base" price shown on event cards; live_price
      // stays mirrored for the legacy (pre-tier) display paths.
      const standard = Number(priceStandard) || 0;
      const created = await createEvent({
        title: name.trim(),
        desc: trimmedDesc || undefined,
        titleEn: nameEn.trim() || undefined,
        descEn: descEn.trim() || undefined,
        start_time: startTimeIso,
        base: standard,
        live_price: standard,
        replay_price: Number(replayPrice) || 0,
        price_standard: standard || null,
        price_multi3: Number(priceMulti3) || null,
        price_multi5: Number(priceMulti5) || null,
        live_start_at: liveStartIso,
        live_end_at: liveEndIso,
        replay_available_until: replayUntilIso,
        thumbnail_url: cover || null,
        image: cover || undefined,
        showOnWeb,
        showOnKiosk,
      });
      toast.success("Арга хэмжээ үүсгэгдлээ.");
      // Kiosk events are useless without zones, and zones need the event to
      // exist first — so drop the admin straight into the zones editor.
      navigate(
        showOnKiosk
          ? `/admin/events/${created.id}/edit`
          : `/admin/events/${created.id}`,
      );
    } catch (err) {
      setError((err as Error).message || "Үүсгэх боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  if (unknownChannel) return <Navigate to="/admin/events/new" replace />;

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>{meta.label}</h2>
          <p>{meta.lead}</p>
        </div>
        <Link
          to="/admin/events/new"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Сонголт солих
        </Link>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-[860px]">
        {error && <div className={ADMIN_ALERT_CLS}>{error}</div>}

        <section className={CARD_CLS}>
          <header className={CARD_HEAD_CLS}>
            <h3 className={CARD_HEAD_TITLE_CLS}>Үндсэн мэдээлэл</h3>
            <p className={CARD_HEAD_DESC_CLS}>
              {showOnWeb
                ? "Үзэгчдэд харагдах нэр, огноо, эхлэх ба дуусах цаг, нүүр зураг."
                : "Үзэгчдэд харагдах нэр, огноо, эхлэх цаг, нүүр зураг."}
            </p>
          </header>
          <div className={CARD_BODY_CLS}>
            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="ev-name">Нэр *</label>
              <input
                id="ev-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Нэр"
                required
              />
            </div>

            <div className={ADMIN_FIELD_CLS}>
              <label
                htmlFor="ev-desc"
                className="flex items-center justify-between"
              >
                <span>Тайлбар</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  {desc.length}/600
                </span>
              </label>
              <textarea
                id="ev-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 600))}
                placeholder="Тайлбар"
                rows={5}
                maxLength={600}
              />
            </div>

            <div className={TWO_COL_CLS}>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-date">Огноо *</label>
                <DatePicker
                  id="ev-date"
                  value={date}
                  onChange={setDate}
                  required
                  allowPast
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-start-time">Эхлэх цаг</label>
                <input
                  id="ev-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            {/* The live end anchors the stream + replay windows, so it only
                matters on the web. Kiosk admissions just need a start. */}
            {showOnWeb && (
              <div className={TWO_COL_CLS}>
                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor="ev-end-date">Дуусах огноо</label>
                  <DatePicker
                    id="ev-end-date"
                    value={endDate}
                    onChange={setEndDate}
                    allowPast
                  />
                </div>
                <div className={ADMIN_FIELD_CLS}>
                  <label htmlFor="ev-end-time">Дуусах цаг</label>
                  <input
                    id="ev-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <EventEnglishSection
              nameEn={nameEn}
              descEn={descEn}
              onChangeName={setNameEn}
              onChangeDesc={setDescEn}
            />

            <div className={ADMIN_FIELD_CLS}>
              <label>Нүүр зураг</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFileChange}
                className="hidden"
              />
              {thumbnailUrl ? (
                <div className="relative group">
                  <div
                    className="w-full aspect-[16/9] rounded-lg bg-zinc-100 bg-center bg-cover bg-no-repeat ring-1 ring-inset ring-[#ececef]"
                    style={{ backgroundImage: `url('${thumbnailUrl}')` }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className={ADMIN_BTN_CLS}
                      onClick={onPickFile}
                      disabled={uploading || busy}
                    >
                      {uploading ? "Ачаалж байна…" : "Солих"}
                    </button>
                    <button
                      type="button"
                      className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
                      onClick={() => setThumbnailUrl("")}
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
            </div>

            <div className={ADMIN_FIELD_CLS}>
              <label
                htmlFor="ev-thumb"
                className="text-[11.5px] uppercase tracking-[0.06em] !text-zinc-500 !font-semibold"
              >
                эсвэл URL
              </label>
              <input
                id="ev-thumb"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Зургийн URL"
              />
            </div>
          </div>
        </section>

        <section className={CARD_CLS}>
          <header className={CARD_HEAD_CLS}>
            <h3 className={CARD_HEAD_TITLE_CLS}>Хаана нэмэх</h3>
            <p className={CARD_HEAD_DESC_CLS}>
              Эхлээд сонгосон газраа нэмэгдэнэ. Хоёуланд нь зарах бол доороос
              нөгөөг нь нэмнэ үү.
            </p>
          </header>
          <div className={CARD_BODY_CLS}>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center h-7 px-2.5 rounded-md text-[12.5px] font-semibold ring-1 ring-inset ${meta.chipCls}`}
              >
                {meta.label}
              </span>
              <Link
                to="/admin/events/new"
                className="text-[12.5px] text-zinc-500 hover:text-zinc-900 underline underline-offset-[3px] decoration-zinc-300"
              >
                Солих
              </Link>
            </div>
            <label
              htmlFor="ev-also-other"
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                alsoOther
                  ? "border-zinc-300 bg-white"
                  : "border-[#ececef] bg-[#fafafa] hover:border-zinc-200"
              }`}
            >
              <input
                id="ev-also-other"
                type="checkbox"
                checked={alsoOther}
                disabled={busy}
                onChange={(e) => setAlsoOther(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-zinc-900"
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-zinc-900 leading-tight">
                  {meta.other}
                </span>
                <span className="block text-[12.5px] text-zinc-500 mt-0.5 leading-[1.45]">
                  {meta.otherHint}
                </span>
              </span>
            </label>
            {showOnKiosk && (
              <p className="m-0 text-[12.5px] text-zinc-500 leading-[1.45]">
                VIP / Fan Zone / Энгийн гэсэн 3 төрлийн үнэ ба багтаамжийг
                үүсгэсний дараа, засварлах хуудсан дээр оруулна. Бүсгүй бол касс
                дээр зарагдахгүй.
              </p>
            )}
          </div>
        </section>

        {showOnWeb && (
        <section className={CARD_CLS}>
          <header className={CARD_HEAD_CLS}>
            <h3 className={CARD_HEAD_TITLE_CLS}>Тасалбарын үнэ</h3>
            <p className={CARD_HEAD_DESC_CLS}>
              Тасалбар 3 төрөлтэй: Энгийн (1 төхөөрөмж), 3 хэрэглэгчийн (3
              төхөөрөмж), 5 хэрэглэгчийн (5 төхөөрөмж + нөхөж үзэх). Хоосон
              орхивол үндсэн үнэ (9,900 / 14,900 / 19,900₮) ашиглагдана.
            </p>
          </header>
          <div className={CARD_BODY_CLS}>
            <div className={TWO_COL_CLS}>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-price-standard">
                  Энгийн тасалбар (₮) · 1 төхөөрөмж
                </label>
                <input
                  id="ev-price-standard"
                  type="number"
                  min={0}
                  value={priceStandard}
                  onChange={(e) => setPriceStandard(e.target.value)}
                  placeholder="9900"
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-price-multi3">
                  3 хэрэглэгчийн тасалбар (₮) · 3 төхөөрөмж
                </label>
                <input
                  id="ev-price-multi3"
                  type="number"
                  min={0}
                  value={priceMulti3}
                  onChange={(e) => setPriceMulti3(e.target.value)}
                  placeholder="14900"
                />
              </div>
            </div>
            <div className={TWO_COL_CLS}>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-price-multi5">
                  5 хэрэглэгчийн тасалбар (₮) · 5 төхөөрөмж + нөхөж үзэх
                </label>
                <input
                  id="ev-price-multi5"
                  type="number"
                  min={0}
                  value={priceMulti5}
                  onChange={(e) => setPriceMulti5(e.target.value)}
                  placeholder="19900"
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-replay-days">
                  Нөхөж үзэх хугацаа (5 хэрэглэгчийн тасалбарт)
                </label>
                <div className="relative">
                  <input
                    id="ev-replay-days"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={replayDays}
                    onChange={(e) =>
                      setReplayDays(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="Хоногийн тоо"
                    className="!pr-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-zinc-500">
                    хоног
                  </span>
                </div>
              </div>
            </div>

            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="ev-replay-price">
                Нөхөж үзэх дангаар нь худалдах үнэ (₮) — тоглолт дууссаны дараах
                худалдан авалтад
              </label>
              <input
                id="ev-replay-price"
                type="number"
                min={0}
                value={replayPrice}
                onChange={(e) => setReplayPrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </section>
        )}

        <div className={ADMIN_FORM_ACTIONS_CLS}>
          <button
            type="submit"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            disabled={busy}
          >
            {busy
              ? "Үүсгэж байна…"
              : showOnKiosk
                ? "Үүсгээд бүс нэмэх"
                : "Үүсгэх"}
          </button>
          <Link
            to="/admin/events"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
          >
            Болих
          </Link>
        </div>
      </form>
    </>
  );
}
