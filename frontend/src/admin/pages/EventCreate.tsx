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
  const [date, setDate] = useState(""); // yyyy-mm-dd — эхлэх огноо
  const [startTime, setStartTime] = useState(""); // HH:MM
  const [endDate, setEndDate] = useState(""); // yyyy-mm-dd
  const [endTime, setEndTime] = useState(""); // HH:MM
  const [replayDays, setReplayDays] = useState(""); // нөхөж үзэх хоног
  const [livePrice, setLivePrice] = useState("");
  const [replayPrice, setReplayPrice] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Дуусах огноог анхдагчаар эхлэх огноотой адил болгох (хэрэглэгч өөрчилж болно).
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
      const created = await createEvent({
        title: name.trim(),
        start_time: startTimeIso,
        base: Number(livePrice) || 0,
        live_price: Number(livePrice) || 0,
        replay_price: Number(replayPrice) || 0,
        live_start_at: liveStartIso,
        live_end_at: liveEndIso,
        replay_available_until: replayUntilIso,
        thumbnail_url: thumbnailUrl.trim() || null,
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
                placeholder="Тоглолтын нэр"
                required
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

            <div className={ADMIN_FIELD_CLS}>
              <label htmlFor="ev-thumb">Нүүр зургийн URL</label>
              <input
                id="ev-thumb"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://…/cover.jpg"
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
                  placeholder="Хэд хоногийн турш нөхөж үзэх боломжтой өдрийн тоог оруул"
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
