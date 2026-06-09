import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth";
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
} from "../_authStyles";

function safeNext(next: string | null): string {
  if (!next) return "/watch";
  if (!next.startsWith("/")) return "/watch";
  if (next.startsWith("//")) return "/watch";
  return next;
}

type Step = "form" | "verify-phone" | "verify-email";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, verifyPhone, resendCode, session, loading } = useAuth();

  const explainError = (code: string, fallback: string): string => {
    switch (code) {
      case "invalid_credentials":
        return t("auth_err_invalid_credentials");
      case "not_verified":
        return t("auth_err_not_verified");
      case "account_deleted":
        return t("auth_err_account_deleted");
      case "invalid_input":
        return t("auth_err_invalid_input");
      case "rate_limited":
        return t("auth_err_rate_limited");
      case "supabase_not_configured":
        return t("auth_err_supabase_not_configured");
      default:
        return fallback;
    }
  };

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitLabel, setSubmitLabel] = useState<string>(t("auth_login_btn"));
  const [awaitingSession, setAwaitingSession] = useState(false);

  const [step, setStep] = useState<Step>("form");
  const [pendingIdentifier, setPendingIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [verifyAlert, setVerifyAlert] = useState<{
    kind: "error" | "ok";
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (!awaitingSession) return;
    if (loading || !session) return;
    const nextParam = params.get("next");
    const dest = nextParam
      ? safeNext(nextParam)
      : session.role === "admin"
        ? "/admin"
        : "/watch";
    navigate(dest, { replace: true });
  }, [awaitingSession, session, loading, params, navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert("");
    const rawId = identifier.trim();
    if (!rawId) return setAlert(t("auth_err_id_required"));
    if (!password) return setAlert(t("auth_err_password_required"));

    setBusy(true);
    setSubmitLabel(t("auth_logging_in"));
    const res = await login({ identifier: rawId, password });

    if (res.ok) {
      setSubmitLabel(t("auth_welcome"));
      setAwaitingSession(true);
      return;
    }

    setBusy(false);
    setSubmitLabel(t("auth_login_btn"));

    if (res.error === "not_verified") {
      setPendingIdentifier(res.identifier ?? rawId);
      setStep(res.kind === "email" ? "verify-email" : "verify-phone");
      setVerifyAlert({
        kind: "error",
        msg: t("auth_err_not_verified_resend"),
      });
      return;
    }

    setAlert(explainError(res.error, t("auth_err_login_failed")));
  };

  const onVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVerifyAlert(null);
    const clean = code.replace(/\D/g, "");
    if (clean.length < 4) {
      setVerifyAlert({ kind: "error", msg: t("auth_err_code_incomplete") });
      return;
    }
    setVerifyBusy(true);
    const res = await verifyPhone({ phone: pendingIdentifier, code: clean });
    setVerifyBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, t("auth_err_code_wrong")),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: t("auth_verified") });
    setAwaitingSession(true);
  };

  const onResend = async () => {
    setVerifyAlert(null);
    setResendBusy(true);
    const res = await resendCode(pendingIdentifier);
    setResendBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, t("auth_err_resend_failed")),
      });
      return;
    }
    setVerifyAlert({
      kind: "ok",
      msg:
        step === "verify-phone"
          ? t("auth_new_code_sent")
          : t("auth_new_email_sent"),
    });
  };

  if (step === "verify-phone") {
    return (
      <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
        <header className={HEADER_CLS}>
          <Link className={LOGO_CLS} to="/" aria-label={t("auth_logo_aria")}>
            <img
              className={LOGO_IMG_CLS}
              src="/assets/images/brand/logo.png"
              alt={t("auth_logo_alt")}
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
            {t("auth_back_login")}
          </button>
        </header>

        <main className={MAIN_CLS}>
          <section className={CARD_CLS}>
            <span className={EYEBROW_CLS}>
              <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
              {t("auth_verify_eyebrow")}
            </span>

            <h1 className={TITLE_CLS}>{t("auth_verify_phone_title")}</h1>
            <p className={SUBTITLE_CLS}>
              {t("auth_verify_phone_subtitle", {
                identifier: pendingIdentifier,
              })}
            </p>

            <form className={FORM_CLS} onSubmit={onVerifySubmit} noValidate>
              <label className={FIELD_CLS}>
                <span className={LABEL_CLS}>{t("auth_verify_code_label")}</span>
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
                <span className={REG_HINT_CLS}>{t("auth_verify_hint")}</span>
              </label>

              {verifyAlert && (
                <div
                  className={
                    verifyAlert.kind === "ok" ? REG_ALERT_OK_CLS : REG_ALERT_CLS
                  }
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
                {verifyBusy ? t("auth_verifying") : t("auth_verify_btn")}
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
              <span>{t("auth_or")}</span>
            </div>

            <button
              type="button"
              className={REGISTER_CLS}
              onClick={onResend}
              disabled={resendBusy}
              style={RESEND_BTN_STYLE}
            >
              {resendBusy ? t("auth_sending") : t("auth_resend_code")}
            </button>
            <Link className={HOME_CLS} to="/">
              {t("auth_back_home")}
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
          <Link className={LOGO_CLS} to="/" aria-label={t("auth_logo_aria")}>
            <img
              className={LOGO_IMG_CLS}
              src="/assets/images/brand/logo.png"
              alt={t("auth_logo_alt")}
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
            {t("auth_back_login")}
          </button>
        </header>

        <main className={MAIN_CLS}>
          <section className={CARD_CLS}>
            <span className={EYEBROW_CLS}>
              <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
              {t("auth_verify_eyebrow")}
            </span>

            <h1 className={TITLE_CLS}>{t("auth_verify_email_title")}</h1>
            <p className={SUBTITLE_CLS}>
              {t("auth_verify_email_subtitle", {
                identifier: pendingIdentifier,
              })}
            </p>

            <div className={REG_ALERT_OK_CLS} role="status">
              {t("auth_check_spam")}
            </div>

            {verifyAlert && (
              <div
                className={
                  verifyAlert.kind === "ok" ? REG_ALERT_OK_CLS : REG_ALERT_CLS
                }
                role="alert"
                style={{ marginTop: 8 }}
              >
                {verifyAlert.msg}
              </div>
            )}

            <div className={DIVIDER_CLS}>
              <span>{t("auth_or")}</span>
            </div>

            <button
              type="button"
              className={REGISTER_CLS}
              onClick={onResend}
              disabled={resendBusy}
              style={RESEND_BTN_STYLE}
            >
              {resendBusy ? t("auth_sending") : t("auth_resend_link")}
            </button>
            <Link className={HOME_CLS} to="/">
              {t("auth_back_home")}
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={PAGE_CLS} style={{ background: PAGE_BG }}>
      <header className={HEADER_CLS}>
        <Link className={LOGO_CLS} to="/" aria-label={t("auth_logo_aria")}>
          <img
            className={LOGO_IMG_CLS}
            src="/assets/images/brand/logo.png"
            alt={t("auth_logo_alt")}
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
          {t("auth_back_home")}
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={CARD_CLS}>
          <span className={EYEBROW_CLS}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            {t("auth_login_eyebrow")}
          </span>

          <h1 className={TITLE_CLS}>{t("auth_login_title")}</h1>
          <p className={SUBTITLE_CLS}>{t("auth_login_subtitle")}</p>

          <form className={FORM_CLS} onSubmit={onSubmit} noValidate>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>{t("auth_identifier_label")}</span>
              <input
                className={INPUT_CLS}
                type="text"
                name="identifier"
                placeholder={t("auth_identifier_placeholder")}
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>{t("auth_password_label")}</span>
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
                  aria-label={showPw ? t("auth_hide_pw") : t("auth_show_pw")}
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
              <Link
                to="/forgot-password"
                className="self-end mt-1 text-[12.5px] font-semibold text-brand-blue no-underline [transition:color_.15s_ease] hover:text-brand-blue-soft hover:underline"
              >
                {t("auth_forgot_link")}
              </Link>
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
            <span>{t("auth_or")}</span>
          </div>

          <Link className={REGISTER_CLS} to="/register">
            {t("auth_register_link")}
          </Link>
          <Link className={HOME_CLS} to="/">
            {t("auth_back_home")}
          </Link>
        </section>
      </main>
    </div>
  );
}
