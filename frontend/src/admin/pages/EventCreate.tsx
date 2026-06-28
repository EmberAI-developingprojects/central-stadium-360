import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createEvent } from "../../data/store";
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

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [replayDays, setReplayDays] = useState("");
  const [livePrice, setLivePrice] = useState("");
  const [replayPrice, setReplayPrice] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descEn, setDescEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (date && !endDate) setEndDate(date);
  }, [date, endDate]);

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
      const created = await createEvent({
        title: name.trim(),
        desc: trimmedDesc || undefined,
        titleEn: nameEn.trim() || undefined,
        descEn: descEn.trim() || undefined,
        start_time: startTimeIso,
        base: Number(livePrice) || 0,
        live_price: Number(livePrice) || 0,
        replay_price: Number(replayPrice) || 0,
        live_start_at: liveStartIso,
        live_end_at: liveEndIso,
        replay_available_until: replayUntilIso,
        thumbnail_url: cover || null,
        image: cover || undefined,
      });
      toast.success("Арга хэмжээ үүсгэгдлээ.");
      navigate(`/admin/events/${created.id}`);
    } catch (err) {
      setError((err as Error).message || "Үүсгэх боломжгүй.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={ADMIN_PAGE_HEADER_CLS}>
        <div>
          <h2>Шинэ арга хэмжээ</h2>
          <p>VOD дамжуулалттай арга хэмжээний үндсэн мэдээллийг үүсгэх.</p>
        </div>
        <Link
          to="/admin/events"
          className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_GHOST_CLS}`}
        >
          ← Буцах
        </Link>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-[860px]">
        {error && <div className={ADMIN_ALERT_CLS}>{error}</div>}

        <section className={CARD_CLS}>
          <header className={CARD_HEAD_CLS}>
            <h3 className={CARD_HEAD_TITLE_CLS}>Үндсэн мэдээлэл</h3>
            <p className={CARD_HEAD_DESC_CLS}>
              Үзэгчдэд харагдах нэр, огноо, эхлэх ба дуусах цаг, нүүр зураг.
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

            <EventEnglishSection
              nameEn={nameEn}
              descEn={descEn}
              onChangeName={setNameEn}
              onChangeDesc={setDescEn}
            />

            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="ev-thumb">Нүүр зургийн URL</label>
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
            <h3 className={CARD_HEAD_TITLE_CLS}>
              Шууд үзэх үнэ болон Нөхөж үзэх төлбөрийн үнэ
            </h3>
            <p className={CARD_HEAD_DESC_CLS}>
              Хадгалах хугацаагаа дуусахад нөхөж үзэх боломжтой арга хэмжээ
              автоматаар хаагдана.
            </p>
          </header>
          <div className={CARD_BODY_CLS}>
            <div className={TWO_COL_CLS}>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-live-price">Шууд тасалбар (₮)</label>
                <input
                  id="ev-live-price"
                  type="number"
                  min={0}
                  value={livePrice}
                  onChange={(e) => setLivePrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className={ADMIN_FIELD_CLS}>
                <label htmlFor="ev-replay-price">Нөхөж үзэх (₮)</label>
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

            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="ev-replay-days">
                Хэд хоногийн турш вэб-с нөхөж үзэх өдрийг оруулна уу?
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
        </section>

        <div className={ADMIN_FORM_ACTIONS_CLS}>
          <button
            type="submit"
            className={`${ADMIN_BTN_CLS} ${ADMIN_BTN_PRIMARY_CLS}`}
            disabled={busy}
          >
            {busy ? "Үүсгэж байна…" : "Үүсгэх"}
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
