import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth, useRequireAuth } from "../../auth";
import { api } from "../../lib/api";
import {
  BACK_CLS,
  CARD_CLS,
  DIVIDER_CLS,
  EYEBROW_CLS,
  EYEBROW_DOT_CLS,
  FIELD_CLS,
  HEADER_CLS,
  INPUT_CLS,
  LABEL_CLS,
  LOGO_CLS,
  LOGO_IMG_CLS,
  MAIN_CLS,
  PAGE_CLS,
  REG_ALERT_CLS,
  REG_ALERT_OK_CLS,
  REG_HINT_CLS,
  SUBMIT_CLS,
  TITLE_CLS,
} from "../_authStyles";
import { WATCH_PAGE_BG } from "../_watchStyles";

type AlertState = { kind: "error" | "ok"; msg: string } | null;

const PROFILE_EYEBROW_OVERRIDE = "!bg-gold-pale !text-[#7C5A1E]";
const PROFILE_CARD_EXTRA =
  "max-w-[560px] !bg-[rgba(255,255,255,0.04)] !border-[rgba(255,255,255,0.08)] !shadow-[0_30px_60px_-28px_rgba(0,0,0,0.6)]";
const PROFILE_TITLE_OVERRIDE = "!text-white";
const PROFILE_SUBTITLE_OVERRIDE = "!text-[rgba(255,255,255,0.6)]";
const PROFILE_LABEL_OVERRIDE = "!text-[rgba(255,255,255,0.85)]";
const PROFILE_INPUT_OVERRIDE =
  "!bg-[rgba(255,255,255,0.06)] !border-[rgba(255,255,255,0.12)] !text-white placeholder:!text-[rgba(255,255,255,0.35)] hover:!border-[rgba(255,255,255,0.25)] focus:!border-brand-blue-soft focus:!shadow-[0_0_0_4px_rgba(68,81,220,0.18)] disabled:!text-[rgba(255,255,255,0.5)]";
const PROFILE_HINT_OVERRIDE = "!text-[rgba(255,255,255,0.5)]";
const PROFILE_DIVIDER_OVERRIDE =
  "!text-[rgba(255,255,255,0.5)] before:!bg-[rgba(255,255,255,0.1)] after:!bg-[rgba(255,255,255,0.1)]";
const PROFILE_FORM_CLS = "flex flex-col gap-[18px] w-full";
const PROFILE_BTN_GHOST_CLS =
  "inline-flex items-center gap-2 bg-[rgba(255,255,255,0.06)] rounded-full text-white text-[13px] font-semibold cursor-pointer no-underline py-2 px-[14px] border border-solid border-[rgba(255,255,255,0.12)] font-[inherit] [transition:border-color_.15s_ease,color_.15s_ease,background_.15s_ease] hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.12)] [&_svg]:w-[14px] [&_svg]:h-[14px]";
const PROFILE_STATS_CLS =
  "grid gap-3 p-4 m-0 bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.08)] rounded-xl [grid-template-columns:repeat(3,1fr)] max-[560px]:[grid-template-columns:1fr]";
const PROFILE_STAT_ITEM_CLS = "flex flex-col gap-1 min-w-0";
const PROFILE_STAT_DT_CLS =
  "text-[10.5px] font-semibold uppercase text-[rgba(255,255,255,0.5)] tracking-[0.06em]";
const PROFILE_STAT_DD_CLS = "m-0 text-[15px] font-bold text-white";
const PROFILE_QUICK_LINKS_CLS = "flex flex-wrap gap-2.5 justify-center";

export default function Profile() {
  const session = useRequireAuth();
  const { updateSession } = useAuth();

  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [alert, setAlert] = useState<AlertState>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setFullname(session.fullname || "");
    setPhone(session.phone || "");
  }, [session]);

  const [createdAt, setCreatedAt] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api.me().then((res) => {
      if (alive && res.ok) setCreatedAt(res.data.created_at);
    });
    return () => {
      alive = false;
    };
  }, []);

  const [ticketCount, setTicketCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  useEffect(() => {
    if (!session) {
      setTicketCount(0);
      setTotalSpent(0);
      return;
    }
    let alive = true;
    api.listMyTickets().then((res) => {
      if (!alive || !res.ok) return;
      setTicketCount(res.data.length);
      setTotalSpent(
        res.data
          .filter((t) => t.status === "paid")
          .reduce((sum, t) => sum + (Number(t.price) || 0), 0),
      );
    });
    return () => {
      alive = false;
    };
  }, [session]);

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("mn-MN")
    : "—";

  if (!session) return null;

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);
    const name = fullname.trim();
    if (name.length < 2)
      return setAlert({
        kind: "error",
        msg: "Бүтэн нэр хамгийн багадаа 2 тэмдэгт байна.",
      });
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^[+\d][\d\s-]{5,}$/.test(trimmedPhone))
      return setAlert({
        kind: "error",
        msg: "Утасны дугаар буруу форматтай байна.",
      });

    setSaving(true);
    try {
      await updateSession({ fullname: name, phone: trimmedPhone });
      setAlert({ kind: "ok", msg: "Профайл хадгалагдлаа." });
    } catch {
      setAlert({
        kind: "error",
        msg: "Хадгалахад алдаа гарлаа.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={PAGE_CLS} style={{ background: WATCH_PAGE_BG }}>
      <header className={HEADER_CLS}>
        <Link
          className={LOGO_CLS}
          to="/"
          aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
        >
          <img
            className={LOGO_IMG_CLS}
            src="/assets/images/brand/logo-white.png"
            alt="Төв Цэнгэлдэх Хүрээлэн"
          />
        </Link>
        <Link
          className={`${BACK_CLS} !bg-[rgba(255,255,255,0.08)] !border-[rgba(255,255,255,0.14)] !text-white hover:!bg-[rgba(255,255,255,0.14)] hover:!border-[rgba(255,255,255,0.30)] hover:!text-white`}
          to="/watch"
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
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Буцах
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={`${CARD_CLS} ${PROFILE_CARD_EXTRA}`}>
          <span className={`${EYEBROW_CLS} ${PROFILE_EYEBROW_OVERRIDE}`}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className={`${TITLE_CLS} ${PROFILE_TITLE_OVERRIDE}`}>
            Миний профайл
          </h1>

          <form className={PROFILE_FORM_CLS} onSubmit={onSave} noValidate>
            <label className={FIELD_CLS}>
              <span className={`${LABEL_CLS} ${PROFILE_LABEL_OVERRIDE}`}>
                Нэр
              </span>
              <input
                className={`${INPUT_CLS} ${PROFILE_INPUT_OVERRIDE}`}
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Нэр"
                autoComplete="name"
                required
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={`${LABEL_CLS} ${PROFILE_LABEL_OVERRIDE}`}>
                Утасны дугаар
              </span>
              <input
                className={`${INPUT_CLS} ${PROFILE_INPUT_OVERRIDE}`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Жишээ: 99999999"
                autoComplete="tel"
                inputMode="tel"
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={`${LABEL_CLS} ${PROFILE_LABEL_OVERRIDE}`}>
                Е-мэйл хаяг
              </span>
              <input
                className={`${INPUT_CLS} ${PROFILE_INPUT_OVERRIDE}`}
                type="text"
                value={session.identifier}
                disabled
              />
              <span className={`${REG_HINT_CLS} ${PROFILE_HINT_OVERRIDE}`}>
                Бүртгэлийн и-мэйл эсвэл утсыг солих бол шинээр бүртгүүлнэ үү.
              </span>
            </label>

            <dl className={PROFILE_STATS_CLS}>
              <div className={PROFILE_STAT_ITEM_CLS}>
                <dt className={PROFILE_STAT_DT_CLS}>Бүртгэгдсэн</dt>
                <dd className={PROFILE_STAT_DD_CLS}>{memberSince}</dd>
              </div>
              <div className={PROFILE_STAT_ITEM_CLS}>
                <dt className={PROFILE_STAT_DT_CLS}>Тасалбар</dt>
                <dd className={PROFILE_STAT_DD_CLS}>{ticketCount}</dd>
              </div>
              <div className={PROFILE_STAT_ITEM_CLS}>
                <dt className={PROFILE_STAT_DT_CLS}>Нийт зарцуулсан</dt>
                <dd className={PROFILE_STAT_DD_CLS}>
                  {totalSpent.toLocaleString("en-US")}₮
                </dd>
              </div>
            </dl>

            {alert && (
              <div
                className={
                  alert.kind === "ok" ? REG_ALERT_OK_CLS : REG_ALERT_CLS
                }
                role="alert"
              >
                {alert.msg}
              </div>
            )}

            <button type="submit" className={SUBMIT_CLS} disabled={saving}>
              {saving ? "Хадгалж байна…" : "Өөрчлөлт хадгалах"}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </form>

          <div className={`${DIVIDER_CLS} ${PROFILE_DIVIDER_OVERRIDE}`}>
            <span>хурдан холбоос</span>
          </div>

          <div className={PROFILE_QUICK_LINKS_CLS}>
            <Link to="/settings" className={PROFILE_BTN_GHOST_CLS}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
              Нууц үг / тохиргоо
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
