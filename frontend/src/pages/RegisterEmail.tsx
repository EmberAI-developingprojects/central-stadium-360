import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";

type Step = "form" | "verify";

function explainError(code: string, fallback: string): string {
  switch (code) {
    case "already_registered":
      return "Энэ имэйл аль хэдийн бүртгэлтэй байна.";
    case "rate_limited":
      return "Хэт олон оролдлого. Хэдэн минутын дараа дахин оролдоно уу.";
    case "invalid_input":
      return "Оруулсан мэдээллийг шалгана уу.";
    case "supabase_not_configured":
      return "Сервер тохиргоо дутуу байна. Админд хандана уу.";
    default:
      return fallback;
  }
}

export default function RegisterEmail() {
  const { registerEmail, resendCode } = useAuth();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState("");
  const [submitLabel, setSubmitLabel] = useState("Бүртгүүлэх");
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<Step>("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [verifyAlert, setVerifyAlert] = useState<{
    kind: "error" | "ok";
    msg: string;
  } | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert("");

    if (fullname.trim().length < 2) return setAlert("Бүтэн нэрээ оруулна уу.");
    const normalized = email.trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@gmail\.com$/.test(normalized)) {
      return setAlert("Зөвхөн @gmail.com хаяг хүлээн авна.");
    }
    if (password.length < 8)
      return setAlert("Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.");
    if (password !== confirmPw) return setAlert("Нууц үг таарахгүй байна.");
    if (!agree) return setAlert("Үйлчилгээний нөхцөлийг зөвшөөрнө үү.");

    setBusy(true);
    setSubmitLabel("Илгээж байна…");
    const res = await registerEmail({
      fullName: fullname.trim(),
      email: normalized,
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
    setPendingEmail(normalized);
    setStep("verify");
    setBusy(false);
    setSubmitLabel("Бүртгүүлэх");
  };

  const onResend = async () => {
    setVerifyAlert(null);
    setResendBusy(true);
    const res = await resendCode(pendingEmail);
    setResendBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, "Дахин илгээх боломжгүй байна."),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: "Шинэ имэйл илгээгдлээ." });
  };

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

            <h1 className="login-title">Гмэйлээ шалгана уу</h1>
            <p className="login-subtitle">
              Бид {pendingEmail} хаяг руу баталгаажуулах линк илгээлээ. Линк
              дээр дарж бүртгэлээ идэвхжүүлээрэй.
            </p>

            <div className="reg-alert is-ok" role="status">
              Дахин харагдахгүй бол спам хавтсаа шалгана уу.
            </div>

            {verifyAlert && (
              <div
                className={`reg-alert${verifyAlert.kind === "ok" ? " is-ok" : ""}`}
                role="alert"
                style={{ marginTop: 8 }}
              >
                {verifyAlert.msg}
              </div>
            )}

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
              {resendBusy ? "Илгээж байна…" : "Дахин линк илгээх"}
            </button>
            <Link className="login-home" to="/login">
              Нэвтрэх рүү буцах
            </Link>
          </section>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────── Email registration form
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

          <h1 className="login-title">Gmail хаягаар бүртгүүлэх</h1>
          <p className="login-subtitle">
            @gmail.com хаягаараа бүртгүүлж, баталгаажуулах линкээ имэйлээрээ
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

            <label className="login-field reg-field-email">
              <span className="login-label">Gmail хаяг</span>
              <input
                className="login-input reg-input-email"
                type="email"
                name="email"
                placeholder="name@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="reg-hint">
                Зөвхөн @gmail.com хаяг хүлээн авна
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

          <Link className="login-register" to="/register/phone">
            Утасны дугаараар бүртгүүлэх
          </Link>
          <Link className="login-home" to="/login">
            Аль хэдийн бүртгэлтэй — Нэвтрэх
          </Link>
        </section>
      </main>
    </div>
  );
}
