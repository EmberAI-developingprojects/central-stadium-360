import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthLayout, BackLink } from "../../components/auth/AuthLayout";
import { AuthCard, Divider } from "../../components/auth/AuthCard";
import { ButtonLink } from "../../components/ui/Button";
import {
  REG_TAB_CLS,
  REG_TABS_CLS,
  REG_TAB_LABEL_CLS,
  REG_TAB_SUB_CLS,
} from "../_authStyles";

export default function Register() {
  const { t } = useTranslation();
  return (
    <AuthLayout back={<BackLink to="/login">{t("auth_back_login")}</BackLink>}>
      <AuthCard
        title={t("auth_register_title")}
        subtitle={t("auth_register_subtitle")}
      >
        <div
          className={REG_TABS_CLS}
          role="list"
          aria-label={t("auth_register_type_aria")}
        >
          <Link to="/register/phone" className={REG_TAB_CLS} role="listitem">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className={REG_TAB_LABEL_CLS}>
              {t("auth_register_phone")}
            </span>
            <span className={REG_TAB_SUB_CLS}>
              {t("auth_register_phone_sub")}
            </span>
          </Link>
          <Link to="/register/email" className={REG_TAB_CLS} role="listitem">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span className={REG_TAB_LABEL_CLS}>
              {t("auth_register_email")}
            </span>
            <span className={REG_TAB_SUB_CLS}>
              {t("auth_register_email_sub")}
            </span>
          </Link>
        </div>

        <ButtonLink variant="outline" to="/login">
          {t("auth_already_registered")}
        </ButtonLink>
        <ButtonLink variant="text" to="/">
          {t("auth_back_home")}
        </ButtonLink>
      </AuthCard>
    </AuthLayout>
  );
}
