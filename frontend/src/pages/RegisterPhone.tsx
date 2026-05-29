import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import {
  BACK_CLS,
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
  REG_CHECKBOX_CLS,
  REG_FORM_CLS,
  REG_HINT_CLS,
  REG_INPUT_PHONE_CLS,
  REG_PHONE_PREFIX_CLS,
  REG_PHONE_WRAP_CLS,
  REG_TERMS_CLS,
  REGISTER_CLS,
  SUBMIT_CLS,
  SUBTITLE_CLS,
  TITLE_CLS,
} from "./_authStyles";

type Step = "form" | "verify";

function explainError(code: string, fallback: string): string {
  switch (code) {
    case "already_registered":
      return "Энэ дугаар аль хэдийн бүртгэлтэй байна.";
    case "rate_limited":
      return "Хэт олон оролдлого. Хэдэн минутын дараа дахин оролдоно уу.";
    case "invalid_input":
      return "Оруулсан мэдээллийг шалгана уу.";
    case "supabase_not_configured":
      return "Сервер тохиргоо дутуу байна. Админд хандана уу.";
    case "otp_invalid":
      return "Код буруу эсвэл хугацаа дууссан байна.";
    default:
      return fallback;
  }
}

export default function RegisterPhone() {
  const navigate = useNavigate();
  const { registerPhone, verifyPhone, resendCode } = useAuth();

  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState("");
  const [submitLabel, setSubmitLabel] = useState("Бүртгүүлэх");
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<Step>("form");
  const [pendingPhone, setPendingPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [verifyAlert, setVerifyAlert] = useState<{
    kind: "error" | "ok";
    msg: string;
  } | null>(null);

  const onPhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setPhone(
      digits.length > 4 ? digits.slice(0, 4) + " " + digits.slice(4) : digits,
    );
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert("");

    if (fullname.trim().length < 2) return setAlert("Бүтэн нэрээ оруулна уу.");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 8)
      return setAlert("Утасны дугаар 8 оронтой байх ёстой.");
    if (!/^[6789]/.test(digits)) {
      return setAlert(
        "Зөвхөн Монгол утасны дугаар хүлээн авна (6, 7, 8, 9-өөр эхэлсэн).",
      );
    }
    if (password.length < 8)
      return setAlert("Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.");
    if (password !== confirmPw) return setAlert("Нууц үг таарахгүй байна.");
    if (!agree) return setAlert("Үйлчилгээний нөхцөлийг зөвшөөрнө үү.");

    const identifier = "+976" + digits;
    setBusy(true);
    setSubmitLabel("Илгээж байна…");
    const res = await registerPhone({
      fullName: fullname.trim(),
      phone: identifier,
      password,
    });
    if (!res.ok) {
      setBusy(false);
      setSubmitLabel("Бүртгүүлэх");
      setAlert(
        explainError(res.error, "Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу."),
      );
      return;
    }
    setPendingPhone(identifier);
    setStep("verify");
    setBusy(false);
    setSubmitLabel("Бүртгүүлэх");
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
    const res = await verifyPhone({ phone: pendingPhone, code: clean });
    setVerifyBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, "Код буруу байна."),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: "Баталгаажлаа ✓" });
    setTimeout(() => navigate("/watch", { replace: true }), 700);
  };

  const onResend = async () => {
    setVerifyAlert(null);
    setResendBusy(true);
    const res = await resendCode(pendingPhone);
    setResendBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, "Дахин илгээх боломжгүй байна."),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: "Шинэ код илгээгдлээ." });
  };

  if (step === "verify") {
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
          <Link className={BACK_CLS} to="/login">
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
          </Link>
        </header>

        <main className={MAIN_CLS}>
          <section className={CARD_CLS}>
            <span className={EYEBROW_CLS}>
              <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
              Баталгаажуулалт
            </span>

            <h1 className={TITLE_CLS}>Утсаа баталгаажуулах</h1>
            <p className={SUBTITLE_CLS}>
              {pendingPhone} дугаар руу 6 оронтой код илгээлээ. Хүлээж аваад
              доор оруулна уу.
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
            <Link className={HOME_CLS} to="/login">
              Нэвтрэх рүү буцах
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
        <Link className={BACK_CLS} to="/register">
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
          Сонголт руу буцах
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={CARD_CLS}>
          <span className={EYEBROW_CLS}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className={TITLE_CLS}>Утасны дугаараар бүртгүүлэх</h1>
          <p className={SUBTITLE_CLS}>
            8 оронтой Монгол утасны дугаараа оруулаад баталгаажуулах SMS код
            хүлээж аваарай.
          </p>

          <form className={REG_FORM_CLS} onSubmit={onSubmit} noValidate>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Бүтэн нэр</span>
              <input
                className={INPUT_CLS}
                type="text"
                name="fullname"
                placeholder="Жишээ: Б. Болор"
                autoComplete="name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Утасны дугаар</span>
              <span className={REG_PHONE_WRAP_CLS}>
                <span className={REG_PHONE_PREFIX_CLS} aria-hidden="true">
                  +976
                </span>
                <input
                  className={REG_INPUT_PHONE_CLS}
                  type="tel"
                  name="phone"
                  placeholder="8800 0000"
                  inputMode="numeric"
                  maxLength={9}
                  autoComplete="tel-national"
                  value={phone}
                  onChange={onPhoneChange}
                  required
                />
              </span>
              <span className={REG_HINT_CLS}>
                8 оронтой Монгол утасны дугаар оруулна уу
              </span>
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Нууц үг</span>
              <span className={PWD_WRAP_CLS}>
                <input
                  className={PWD_INPUT_CLS}
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
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
              <span className={REG_HINT_CLS}>Хамгийн багадаа 8 тэмдэгт</span>
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>Нууц үг давтах</span>
              <input
                className={INPUT_CLS}
                type="password"
                name="password_confirm"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </label>

            <label className={REG_TERMS_CLS}>
              <input
                type="checkbox"
                name="agree"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className={REG_CHECKBOX_CLS}
                required
              />
              <span>
                Үйлчилгээний нөхцөл болон нууцлалын бодлогыг хүлээн зөвшөөрч
                байна.
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

          <Link className={REGISTER_CLS} to="/register/email">
            Gmail-аар бүртгүүлэх
          </Link>
          <Link className={HOME_CLS} to="/login">
            Аль хэдийн бүртгэлтэй — Нэвтрэх
          </Link>
        </section>
      </main>
    </div>
  );
}
