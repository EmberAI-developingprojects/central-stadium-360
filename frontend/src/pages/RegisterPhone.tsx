import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

export default function RegisterPhone() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { registerPhone, verifyPhone, resendCode } = useAuth();

  const explainError = (code: string, fallback: string): string => {
    switch (code) {
      case "already_registered":
        return t("auth_err_already_registered_phone");
      case "rate_limited":
        return t("auth_err_rate_limited");
      case "invalid_input":
        return t("auth_err_invalid_input");
      case "supabase_not_configured":
        return t("auth_err_supabase_not_configured");
      case "otp_invalid":
        return t("auth_err_otp_invalid");
      default:
        return fallback;
    }
  };

  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState("");
  const [submitLabel, setSubmitLabel] = useState<string>(
    t("auth_register_btn"),
  );
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

    if (fullname.trim().length < 2)
      return setAlert(t("auth_err_fullname_required"));
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 8) return setAlert(t("auth_err_phone_8_digits"));
    if (!/^[6789]/.test(digits)) {
      return setAlert(t("auth_err_phone_only_mn"));
    }
    if (password.length < 8) return setAlert(t("auth_err_password_min"));
    if (password !== confirmPw)
      return setAlert(t("auth_err_passwords_dont_match"));
    if (!agree) return setAlert(t("auth_err_must_agree"));

    const identifier = "+976" + digits;
    setBusy(true);
    setSubmitLabel(t("auth_sending"));
    const res = await registerPhone({
      fullName: fullname.trim(),
      phone: identifier,
      password,
    });
    if (!res.ok) {
      setBusy(false);
      setSubmitLabel(t("auth_register_btn"));
      setAlert(explainError(res.error, t("auth_err_register_failed")));
      return;
    }
    setPendingPhone(identifier);
    setStep("verify");
    setBusy(false);
    setSubmitLabel(t("auth_register_btn"));
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
    const res = await verifyPhone({ phone: pendingPhone, code: clean });
    setVerifyBusy(false);
    if (!res.ok) {
      setVerifyAlert({
        kind: "error",
        msg: explainError(res.error, t("auth_err_code_wrong")),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: t("auth_verified") });
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
        msg: explainError(res.error, t("auth_err_resend_failed")),
      });
      return;
    }
    setVerifyAlert({ kind: "ok", msg: t("auth_new_code_sent") });
  };

  if (step === "verify") {
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
            {t("auth_back_login")}
          </Link>
        </header>

        <main className={MAIN_CLS}>
          <section className={CARD_CLS}>
            <span className={EYEBROW_CLS}>
              <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
              {t("auth_verify_eyebrow")}
            </span>

            <h1 className={TITLE_CLS}>{t("auth_verify_phone_title")}</h1>
            <p className={SUBTITLE_CLS}>
              {t("auth_verify_phone_subtitle", { identifier: pendingPhone })}
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
            <Link className={HOME_CLS} to="/login">
              {t("auth_back_login")}
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
          {t("auth_back_choose")}
        </Link>
      </header>

      <main className={MAIN_CLS}>
        <section className={CARD_CLS}>
          <span className={EYEBROW_CLS}>
            <span className={EYEBROW_DOT_CLS} aria-hidden="true"></span>
            {t("auth_register_eyebrow")}
          </span>

          <h1 className={TITLE_CLS}>{t("auth_reg_phone_title")}</h1>
          <p className={SUBTITLE_CLS}>{t("auth_reg_phone_subtitle")}</p>

          <form className={REG_FORM_CLS} onSubmit={onSubmit} noValidate>
            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>{t("auth_fullname_label")}</span>
              <input
                className={INPUT_CLS}
                type="text"
                name="fullname"
                placeholder={t("auth_fullname_placeholder")}
                autoComplete="name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required
              />
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>{t("auth_phone_label")}</span>
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
              <span className={REG_HINT_CLS}>{t("auth_phone_hint")}</span>
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>{t("auth_password_label")}</span>
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
              <span className={REG_HINT_CLS}>{t("auth_password_hint")}</span>
            </label>

            <label className={FIELD_CLS}>
              <span className={LABEL_CLS}>
                {t("auth_password_confirm_label")}
              </span>
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
              <span>{t("auth_terms_label")}</span>
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

          <Link className={REGISTER_CLS} to="/register/email">
            {t("auth_register_with_email")}
          </Link>
          <Link className={HOME_CLS} to="/login">
            {t("auth_already_registered")}
          </Link>
        </section>
      </main>
    </div>
  );
}
