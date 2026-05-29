import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

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

  // ─────────────────────────────────────────── Verification step
  if (step === "verify") {
    return (
      <div className="login-page">
        <header className="login-header">
          <Link
            className="login-logo"
            to="/"
            aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
          >
            <img
              src="/assets/images/brand/logo.png"
              alt="Төв Цэнгэлдэх Хүрээлэн"
            />
          </Link>
          <Link className="login-back" to="/login">
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

        <main className="login-main">
          <section className="login-card">
            <span className="login-eyebrow">
              <span className="login-eyebrow-dot" aria-hidden="true"></span>
              Баталгаажуулалт
            </span>

            <h1 className="login-title">Утсаа баталгаажуулах</h1>
            <p className="login-subtitle">
              {pendingPhone} дугаар руу 6 оронтой код илгээлээ. Хүлээж аваад
              доор оруулна уу.
            </p>

            <form className="login-form" onSubmit={onVerifySubmit} noValidate>
              <label className="login-field">
                <span className="login-label">Баталгаажуулах код</span>
                <input
                  className="login-input"
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
                <span className="reg-hint">
                  Кодын хүчинтэй хугацаа: 5 минут
                </span>
              </label>

              {verifyAlert && (
                <div
                  className={`reg-alert${verifyAlert.kind === "ok" ? " is-ok" : ""}`}
                  role="alert"
                >
                  {verifyAlert.msg}
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
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

            <div className="login-divider">
              <span>эсвэл</span>
            </div>

            <button
              type="button"
              className="login-register"
              onClick={onResend}
              disabled={resendBusy}
              style={{
                background: "none",
                border: 0,
                cursor: "pointer",
                width: "100%",
                font: "inherit",
              }}
            >
              {resendBusy ? "Илгээж байна…" : "Дахин код илгээх"}
            </button>
            <Link className="login-home" to="/login">
              Нэвтрэх рүү буцах
            </Link>
          </section>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────── Phone registration form
  return (
    <div className="login-page">
      <header className="login-header">
        <Link
          className="login-logo"
          to="/"
          aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
        >
          <img
            src="/assets/images/brand/logo.png"
            alt="Төв Цэнгэлдэх Хүрээлэн"
          />
        </Link>
        <Link className="login-back" to="/register">
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

      <main className="login-main">
        <section className="login-card">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className="login-title">Утасны дугаараар бүртгүүлэх</h1>
          <p className="login-subtitle">
            8 оронтой Монгол утасны дугаараа оруулаад баталгаажуулах SMS код
            хүлээж аваарай.
          </p>

          <form className="login-form reg-form" onSubmit={onSubmit} noValidate>
            <label className="login-field">
              <span className="login-label">Бүтэн нэр</span>
              <input
                className="login-input"
                type="text"
                name="fullname"
                placeholder="Жишээ: Б. Болор"
                autoComplete="name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required
              />
            </label>

            <label className="login-field reg-field-phone">
              <span className="login-label">Утасны дугаар</span>
              <span className="reg-phone-wrap">
                <span className="reg-phone-prefix" aria-hidden="true">
                  +976
                </span>
                <input
                  className="login-input reg-input-phone"
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
              <span className="reg-hint">
                8 оронтой Монгол утасны дугаар оруулна уу
              </span>
            </label>

            <label className="login-field">
              <span className="login-label">Нууц үг</span>
              <span className="login-password-wrap">
                <input
                  className="login-input"
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
                  className="login-pass-toggle"
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
              <span className="reg-hint">Хамгийн багадаа 8 тэмдэгт</span>
            </label>

            <label className="login-field">
              <span className="login-label">Нууц үг давтах</span>
              <input
                className="login-input"
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

            <label className="reg-terms">
              <input
                type="checkbox"
                name="agree"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required
              />
              <span>
                Үйлчилгээний нөхцөл болон нууцлалын бодлогыг хүлээн зөвшөөрч
                байна.
              </span>
            </label>

            <div className="reg-alert" role="alert" hidden={!alert}>
              {alert}
            </div>

            <button type="submit" className="login-submit" disabled={busy}>
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

          <div className="login-divider">
            <span>эсвэл</span>
          </div>

          <Link className="login-register" to="/register/email">
            Gmail-аар бүртгүүлэх
          </Link>
          <Link className="login-home" to="/login">
            Аль хэдийн бүртгэлтэй — Нэвтрэх
          </Link>
        </section>
      </main>
    </div>
  );
}
