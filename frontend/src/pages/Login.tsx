import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import {
  BACK_CLS,
  BTN_RESET_STYLE as BACK_BTN_STYLE,
  CARD_CLS,
  DIVIDER_CLS,
  EYEBROW_CLS,
  EYEBROW_DOT_CLS,
  FIELD_CLS,
  FORM_CLS,
  FULL_RESET_BTN_STYLE as RESEND_BTN_STYLE,
  HEADER_CLS,
  HOME_CLS,
  INPUT_CLS,
  LABEL_CLS,
  LOGO_CLS,
  LOGO_IMG_CLS,
  MAIN_CLS,
  PAGE_BG,
  PAGE_CLS,
  PWD_INPUT_CLS,
  PWD_TOGGLE_CLS,
  PWD_WRAP_CLS,
  REG_ALERT_CLS,
  REG_ALERT_OK_CLS,
  REG_HINT_CLS,
  REGISTER_CLS,
  SUBMIT_CLS,
  SUBTITLE_CLS,
  TITLE_CLS,
} from "./_authStyles";

function safeNext(next: string | null): string {
  if (!next) return "/watch";
  if (!next.startsWith("/")) return "/watch";
  if (next.startsWith("//")) return "/watch";
  return next;
}

function explainError(code: string, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "И-мэйл/утас эсвэл нууц үг буруу байна.";
    case "not_verified":
      return "Та бүртгэлээ хараахан баталгаажуулаагүй байна.";
    case "account_deleted":
      return "Энэ бүртгэл устгагдсан байна.";
    case "invalid_input":
      return "Оруулсан мэдээллийг шалгана уу.";
    case "rate_limited":
      return "Хэт олон оролдлого. Хэдэн минутын дараа дахин оролдоно уу.";
    case "supabase_not_configured":
      return "Сервер тохиргоо дутуу байна. Админд хандана уу.";
    default:
      return fallback;
  }
}

type Step = "form" | "verify-phone" | "verify-email";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, verifyPhone, resendCode } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitLabel, setSubmitLabel] = useState("Нэвтрэх");

  const [step, setStep] = useState<Step>("form");
  const [pendingIdentifier, setPendingIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [verifyAlert, setVerifyAlert] = useState<{
    kind: "error" | "ok";
    msg: string;
  } | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert("");
    const rawId = identifier.trim();
    if (!rawId) return setAlert("И-мэйл эсвэл утасны дугаараа оруулна уу.");
    if (!password) return setAlert("Нууц үгээ оруулна уу.");

    setBusy(true);
    setSubmitLabel("Нэвтэрч байна…");
    const res = await login({ identifier: rawId, password });

    if (res.ok) {
      setSubmitLabel("Тавтай морилно уу ✓");
      const next = safeNext(params.get("next"));
      setTimeout(() => navigate(next, { replace: true }), 600);
      return;
    }

    setBusy(false);
    setSubmitLabel("Нэвтрэх");

    if (res.error === "not_verified") {
      setPendingIdentifier(res.identifier ?? rawId);
      setStep(res.kind === "email" ? "verify-email" : "verify-phone");
      setVerifyAlert({
        kind: "error",
        msg: "Бүртгэлээ баталгаажуулаагүй байна. Кодоо илгээж дуусгана уу.",
      });
      return;
    }

    setAlert(explainError(res.error, "Нэвтрэхэд алдаа гарлаа."));
  };

  const onVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVerifyAlert(null);
    const clean = code.replace(/\D/g, "");
    if (clean.length < 4) {
      setVerifyAlert({ kind: "error", msg: "Кодыг бүрэн оруулна уу." });
      return;
    }
    setVerifyBusy(true);
    const res = await verifyPhone({ phone: pendingIdentifier, code: clean });
    setVerifyBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, "Код буруу байна."),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: "Баталгаажлаа ✓" });
    setTimeout(
      () => navigate(safeNext(params.get("next")), { replace: true }),
      600,
    );
  };

  const onResend = async () => {
    setVerifyAlert(null);
    setResendBusy(true);
    const res = await resendCode(pendingIdentifier);
    setResendBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, "Дахин илгээх боломжгүй байна."),
      });
      return;
    }
    setVerifyAlert({
      kind: "ok",
      msg:
        step === "verify-phone"
          ? "Шинэ код илгээгдлээ."
          : "Шинэ имэйл илгээгдлээ.",
    });
  };

  if (step === "verify-phone") {
    return (
      <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
        <header className={HEADER_CLS}>
          <Link
            className={LOGO_CLS}
            to="/"
            aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
          >
            <img
              className={LOGO_IMG_CLS}
              src="/assets/images/brand/logo.png"
              alt="Төв Цэнгэлдэх Хүрээлэн"
            />
          </Link>
          <button
            type="button"
            className={BACK_CLS}
            onClick={() => {
              setStep("form");
              setCode("");
              setVerifyAlert(null);
            }}
            style={BACK_BTN_STYLE}
          >
            <svg
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
            Нэвтрэх рүү буцах
          </button>
        </header>

        <main className={MAIN_CLS}>
          <section className={CARD_CLS}>
            <span className={EYEBROW_CLS}>
              <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
              Баталгаажуулалт
            </span>

            <h1 className={TITLE_CLS}>Утсаа баталгаажуулах</h1>
            <p className={SUBTITLE_CLS}>
              {pendingIdentifier} дугаар руу 6 оронтой код илгээлээ. Хүлээж
              аваад доор оруулна уу.
            </p>

            <form className={FORM_CLS} onSubmit={onVerifySubmit} noValidate>
              <label className={FIELD_CLS}>
                <span className={LABEL_CLS}>Баталгаажуулах код</span>
                <input
                  className={INPUT_CLS}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                />
                <span className={REG_HINT_CLS}>
                  Кодын хүчинтэй хугацаа: 5 минут
                </span>
              </label>

              {verifyAlert && (
                <div
                  className={verifyAlert.kind === "ok" ? REG_ALERT_OK_CLS : REG_ALERT_CLS}
                  role="alert"
                >
                  {verifyAlert.msg}
                </div>
              )}

              <button
                type="submit"
                className={SUBMIT_CLS}
                disabled={verifyBusy}
              >
                {verifyBusy ? "Шалгаж байна…" : "Баталгаажуулах"}
                <svg
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
              </button>
            </form>

            <div className={DIVIDER_CLS}>
              <span>эсвэл</span>
            </div>

            <button
              type="button"
              className={REGISTER_CLS}
              onClick={onResend}
              disabled={resendBusy}
              style={RESEND_BTN_STYLE}
            >
              {resendBusy ? "Илгээж байна…" : "Дахин код илгээх"}
            </button>
            <Link className={HOME_CLS} to="/">
              Нүүр хуудас руу буцах
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (step === "verify-email") {
    return (
      <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
        <header className={HEADER_CLS}>
          <Link
            className={LOGO_CLS}
            to="/"
            aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
          >
            <img
              className={LOGO_IMG_CLS}
              src="/assets/images/brand/logo.png"
              alt="Төв Цэнгэлдэх Хүрээлэн"
            />
          </Link>
          <button
            type="button"
            className={BACK_CLS}
            onClick={() => {
              setStep("form");
              setVerifyAlert(null);
            }}
            style={BACK_BTN_STYLE}
          >
            <svg
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
            Нэвтрэх рүү буцах
          </button>
        </header>

        <main className={MAIN_CLS}>
          <section className={CARD_CLS}>
            <span className={EYEBROW_CLS}>
              <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
              Баталгаажуулалт
            </span>

            <h1 className={TITLE_CLS}>Гмэйлээ шалгана уу</h1>
            <p className={SUBTITLE_CLS}>
              Бид {pendingIdentifier} хаяг руу баталгаажуулах линк илгээлээ.
              Линк дээр дарж бүртгэлээ идэвхжүүлээрэй.
            </p>

            <div className={REG_ALERT_OK_CLS} role="status">
              Дахин харагдахгүй бол спам хавтсаа шалгана уу.
            </div>

            {verifyAlert && (
              <div
                className={verifyAlert.kind === "ok" ? REG_ALERT_OK_CLS : REG_ALERT_CLS}
                role="alert"
                style={{ marginTop: 8 }}
              >
                {verifyAlert.msg}
              </div>
            )}

            <div className={DIVIDER_CLS}>
              <span>эсвэл</span>
            </div>

            <button
              type="button"
              className={REGISTER_CLS}
              onClick={onResend}
              disabled={resendBusy}
              style={RESEND_BTN_STYLE}
            >
              {resendBusy ? "Илгээж байна…" : "Дахин линк илгээх"}
            </button>
            <Link className={HOME_CLS} to="/">
              Нүүр хуудас руу буцах
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
      <header className={HEADER_CLS}>
        <Link
          className={LOGO_CLS}
          to="/"
          aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
        >
          <img
            className={LOGO_IMG_CLS}
            src="/assets/images/brand/logo.png"
            alt="Төв Цэнгэлдэх Хүрээлэн"
          />
        </Link>
        <Link className={BACK_CLS} to="/">
          <svg
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
          Нүүр буцах
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={CARD_CLS}>
          <span className={EYEBROW_CLS}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className={TITLE_CLS}>Нэвтрэх</h1>
          <p className={SUBTITLE_CLS}>
            Тасалбар, шууд дамжуулал, гишүүнчлэлдээ хандахын тулд бүртгэлээрээ
            нэвтэрнэ үү.
          </p>

          <form className={FORM_CLS} onSubmit={onSubmit} noValidate>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>И-мэйл эсвэл утасны дугаар</span>
              <input
                className={INPUT_CLS}
                type="text"
                name="identifier"
                placeholder="name@gmail.com эсвэл 8800 0000"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Нууц үг</span>
              <span className={PWD_WRAP_CLS}>
                <input
                  className={PWD_INPUT_CLS}
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={PWD_TOGGLE_CLS}
                  aria-label={showPw ? "Нууц үг нуух" : "Нууц үг харах"}
                  onClick={() => setShowPw((s) => !s)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </span>
            </label>

            <div className={REG_ALERT_CLS} role="alert" hidden={!alert}>
              {alert}
            </div>

            <button type="submit" className={SUBMIT_CLS} disabled={busy}>
              {submitLabel}
              <svg
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
            </button>
          </form>

          <div className={DIVIDER_CLS}>
            <span>эсвэл</span>
          </div>

          <Link className={REGISTER_CLS} to="/register">
            Шинээр бүртгүүлэх
          </Link>
          <Link className={HOME_CLS} to="/">
            Нүүр хуудас руу буцах
          </Link>
        </section>
      </main>
    </div>
  );
}
