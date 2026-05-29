import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";

// Restrict ?next= to local SPA routes so we can't be used as an open redirect.
// Default to /watch so freshly-signed-in users land in their dashboard.
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

  // ─────────────────────────────────────────── Verification: phone
  if (step === "verify-phone") {
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
          <button
            type="button"
            className="login-back"
            onClick={() => {
              setStep("form");
              setCode("");
              setVerifyAlert(null);
            }}
            style={{
              background: "none",
              border: 0,
              cursor: "pointer",
              font: "inherit",
            }}
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

        <main className="login-main">
          <section className="login-card">
            <span className="login-eyebrow">
              <span className="login-eyebrow-dot" aria-hidden="true"></span>
              Баталгаажуулалт
            </span>

            <h1 className="login-title">Утсаа баталгаажуулах</h1>
            <p className="login-subtitle">
              {pendingIdentifier} дугаар руу 6 оронтой код илгээлээ. Хүлээж
              аваад доор оруулна уу.
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
            <Link className="login-home" to="/">
              Нүүр хуудас руу буцах
            </Link>
          </section>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────── Verification: email
  if (step === "verify-email") {
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
          <button
            type="button"
            className="login-back"
            onClick={() => {
              setStep("form");
              setVerifyAlert(null);
            }}
            style={{
              background: "none",
              border: 0,
              cursor: "pointer",
              font: "inherit",
            }}
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

        <main className="login-main">
          <section className="login-card">
            <span className="login-eyebrow">
              <span className="login-eyebrow-dot" aria-hidden="true"></span>
              Баталгаажуулалт
            </span>

            <h1 className="login-title">Гмэйлээ шалгана уу</h1>
            <p className="login-subtitle">
              Бид {pendingIdentifier} хаяг руу баталгаажуулах линк илгээлээ.
              Линк дээр дарж бүртгэлээ идэвхжүүлээрэй.
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
            <Link className="login-home" to="/">
              Нүүр хуудас руу буцах
            </Link>
          </section>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────── Login form (unchanged design)
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
        <Link className="login-back" to="/">
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

      <main className="login-main">
        <section className="login-card">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" aria-hidden="true"></span>
            Хувийн булан
          </span>

          <h1 className="login-title">Нэвтрэх</h1>
          <p className="login-subtitle">
            Тасалбар, шууд дамжуулал, гишүүнчлэлдээ хандахын тулд бүртгэлээрээ
            нэвтэрнэ үү.
          </p>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            <label className="login-field">
              <span className="login-label">И-мэйл эсвэл утасны дугаар</span>
              <input
                className="login-input"
                type="text"
                name="identifier"
                placeholder="name@gmail.com эсвэл 8800 0000"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </label>

            <label className="login-field">
              <span className="login-label">Нууц үг</span>
              <span className="login-password-wrap">
                <input
                  className="login-input"
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

          <Link className="login-register" to="/register">
            Шинээр бүртгүүлэх
          </Link>
          <Link className="login-home" to="/">
            Нүүр хуудас руу буцах
          </Link>
        </section>
      </main>
    </div>
  );
}
