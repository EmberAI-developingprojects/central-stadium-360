import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function SiteFooter() {
  const { t } = useTranslation();
  const colTitleCls =
    "text-white text-[14px] font-bold uppercase tracking-[0.12em] m-0 mb-5";
  const ulCls = "list-none p-0 m-0 flex flex-col gap-2.5";
  const liCls = "text-[15px] text-[rgba(255,255,255,0.7)] leading-[1.55]";
  const linkCls =
    "text-[15px] no-underline text-[rgba(255,255,255,0.7)] [transition:color_0.15s_ease] hover:text-white";
  const socialLinkCls =
    "w-9 h-9 rounded-full inline-flex items-center justify-center text-white/70 no-underline [transition:color_0.18s_ease,background_0.18s_ease] hover:text-white hover:bg-white/10 [&_svg]:w-[16px] [&_svg]:h-[16px]";

  return (
    <footer className="bg-ink pt-14 px-6 pb-6 text-[rgba(255,255,255,0.78)] max-[560px]:pt-8 max-[560px]:px-5 max-[560px]:pb-5">
      <div className="max-w-screen-page mx-auto">
        <div className="grid gap-10 pb-12 [grid-template-columns:1.5fr_1fr_1fr_1fr] max-[900px]:[grid-template-columns:1fr_1fr] max-[900px]:gap-8 max-[560px]:!flex max-[560px]:!flex-col max-[560px]:!items-center max-[560px]:!text-center max-[560px]:gap-5 max-[560px]:pb-6">
          <div className="max-[560px]:flex max-[560px]:flex-col max-[560px]:items-center">
            <Link
              className="inline-flex items-center gap-3 mb-5 no-underline max-[560px]:mb-3"
              to="/"
            >
              <img
                className="block h-12 w-auto max-[560px]:h-9"
                src="/assets/images/brand/logo-white.png"
                alt="Төв Цэнгэлдэх Хүрээлэн"
                width="240"
                height="48"
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="text-[15px] leading-[1.65] m-0 mb-6 max-w-[320px] text-[rgba(255,255,255,0.7)] max-[560px]:hidden">
              {t("footer_tagline")}
            </p>
            <div className="flex gap-1.5 -ml-2 max-[560px]:ml-0 max-[560px]:gap-1">
              <a href="#" aria-label="Facebook" className={socialLinkCls}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 22v-8h3l1-4h-4V7c0-1 .3-1.7 1.8-1.7H17V1.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7v4h3.6v8z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className={socialLinkCls}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className={socialLinkCls}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 5.8c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 12 9c0 .3 0 .6.1.9A11.6 11.6 0 0 1 3.4 5a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4 4 0 0 1-1.9.1c.5 1.6 2 2.8 3.8 2.9A8.2 8.2 0 0 1 2 18.6 11.6 11.6 0 0 0 8.3 20.5c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.1z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className={socialLinkCls}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM19 19h-3v-4.7c0-1.1 0-2.6-1.6-2.6S12.6 13 12.6 14.2V19h-3v-9h2.9v1.2h.1A3.2 3.2 0 0 1 15.5 10c3.1 0 3.7 2 3.7 4.7z" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube" className={socialLinkCls}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8a26 26 0 0 0-.4-4.8zM10 15V9l5 3z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="max-[560px]:hidden">
            <h4 className={colTitleCls}>{t("footer_quick_links")}</h4>
            <ul className={ulCls}>
              <li>
                <Link className={linkCls} to="/#top">
                  {t("footer_home")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#about">
                  {t("footer_about")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#events">
                  {t("footer_events")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#partners">
                  {t("footer_partners")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#membership">
                  {t("footer_membership")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="max-[560px]:hidden">
            <h4 className={colTitleCls}>{t("footer_info")}</h4>
            <ul className={ulCls}>
              <li>
                <Link className={linkCls} to="/#news">
                  {t("footer_news")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#partners">
                  {t("footer_sponsors")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#certificates">
                  {t("footer_certificates")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#contact">
                  {t("footer_help")}
                </Link>
              </li>
              <li>
                <Link className={linkCls} to="/#contact">
                  {t("footer_contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div id="contact" className="max-[560px]:hidden">
            <h4 className={colTitleCls}>{t("footer_contact")}</h4>
            <ul className={ulCls}>
              <li className={liCls}>+976 7700 1212</li>
              <li className={liCls}>info@stadium.mn</li>
              <li className={liCls}>Улаанбаатар хот, Монгол улс</li>
            </ul>
          </div>

          {/* Mobile-only compact contact row */}
          <div className="hidden max-[560px]:flex flex-col items-center gap-1 text-[13px] text-white/65">
            <a
              href="tel:+97677001212"
              className="text-white/85 no-underline tabular-nums hover:text-white"
            >
              +976 7700 1212
            </a>
            <a
              href="mailto:info@stadium.mn"
              className="text-white/75 no-underline hover:text-white"
            >
              info@stadium.mn
            </a>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 text-[14.5px] text-[rgba(255,255,255,0.55)] border-t border-white/5 max-[560px]:flex-col max-[560px]:gap-2 max-[560px]:text-center max-[560px]:pt-4 max-[560px]:text-[13px]">
          <p className="m-0">{t("footer_years_copyright")}</p>
          <p className="m-0">
            {t("footer_built_by_prefix")}{" "}
            <a
              href="https://ember.mn/"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline font-semibold text-white [transition:color_0.15s_ease] hover:text-brand-blue-tint"
            >
              Grand Ember Group
            </a>
            {t("footer_built_by_suffix")
              ? ` ${t("footer_built_by_suffix")}`
              : ""}
          </p>
        </div>
      </div>
    </footer>
  );
}
