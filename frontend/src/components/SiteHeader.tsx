import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth";
import UserMenu from "./UserMenu";
import LanguageSwitcher from "./LanguageSwitcher";

const HEADER_BASE_CLS =
  "w-full px-5 pb-0 sticky top-0 z-[100] [backdrop-filter:blur(20px)_saturate(170%)] [-webkit-backdrop-filter:blur(20px)_saturate(170%)] border-b border-solid [transition:background_0.25s_ease,box-shadow_0.25s_ease,border-color_0.25s_ease,padding_0.25s_ease] max-[920px]:px-4 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-1px] after:h-px after:bg-[linear-gradient(90deg,transparent_0%,rgba(212,175,55,0.4)_20%,rgba(212,175,55,0.55)_50%,rgba(212,175,55,0.4)_80%,transparent_100%)] after:opacity-0 [&.is-scrolled]:after:opacity-100 after:[transition:opacity_.25s_ease]";
const HEADER_BG_CLS =
  "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.10)]";
const HEADER_SCROLLED_CLS =
  "!bg-[rgba(255,255,255,0.55)] !border-[rgba(255,255,255,0.25)] shadow-[0_10px_32px_-18px_rgba(31,41,55,0.22)]";

const HEADER_INNER_CLS = "max-w-screen-page mx-auto";

const MAINNAV_CLS =
  "flex items-center justify-between gap-5 py-[14px] px-0 max-[1024px]:gap-4 max-[1024px]:py-3";

const LOGO_CLS =
  "inline-flex items-center gap-3 no-underline text-ink flex-none [transition:transform_0.25s_ease] hover:scale-[1.02]";
const LOGO_MARK_CLS =
  "w-auto h-12 rounded-none bg-transparent border-0 flex-none [&_img]:block [&_img]:h-full [&_img]:w-auto [&_img]:drop-shadow-[0_2px_8px_rgba(0,0,0,0.08)] max-[1024px]:h-11 max-[640px]:h-10";

const NAV_LINKS_CLS =
  "flex items-center list-none m-0 p-0 gap-6 max-[1500px]:gap-5 max-[1400px]:gap-4 max-[1200px]:gap-3 max-[1024px]:hidden";
const NAV_LINK_A_CLS =
  "relative no-underline text-ink text-[14px] font-semibold whitespace-nowrap [transition:color_0.18s_ease] hover:text-brand-blue max-[1500px]:text-[13.5px] after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[6px] after:h-[2px] after:rounded-full after:bg-brand-blue after:scale-x-0 after:origin-center after:[transition:transform_.2s_ease] hover:after:scale-x-100";
const NAV_LINK_DROPDOWN_TRIGGER_CLS = `${NAV_LINK_A_CLS} inline-flex items-center gap-1.5`;

const HAS_DROPDOWN_LI_CLS = "group relative";

const CARET_CLS =
  "w-[9px] h-[9px] [transition:transform_.2s_ease] group-hover:[transform:rotate(180deg)] group-focus-within:[transform:rotate(180deg)]";

const DROPDOWN_CLS =
  "absolute top-full min-w-[240px] mt-3 p-2 rounded-xl invisible opacity-0 z-[110] left-[-14px] bg-[rgba(255,255,255,0.92)] [backdrop-filter:blur(20px)_saturate(170%)] [-webkit-backdrop-filter:blur(20px)_saturate(170%)] border border-solid border-[rgba(31,41,55,0.08)] shadow-[0_18px_40px_-12px_rgba(31,41,55,0.18)] [transform:translateY(6px)] [transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_.18s] group-hover:opacity-100 group-hover:visible group-hover:[transform:translateY(0)] group-hover:[transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_0s] group-focus-within:opacity-100 group-focus-within:visible group-focus-within:[transform:translateY(0)] group-focus-within:[transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_0s]";

const DROPDOWN_A_CLS =
  "block text-[15px] font-medium text-ink rounded-lg whitespace-nowrap py-[9px] px-[14px] no-underline hover:bg-brand-blue-tint hover:text-brand-blue";

const HEADER_AUTH_CLS =
  "inline-flex items-center gap-3 flex-none max-[1024px]:gap-2.5 max-[480px]:gap-1.5";

const AUTH_BTN_CLS =
  "inline-flex items-center leading-none gap-2 rounded-full bg-[linear-gradient(135deg,#2230c6_0%,#3a48d8_100%)] text-white text-[14px] font-semibold no-underline py-[10px] px-[18px] [transition:transform_.18s_ease,box-shadow_.22s_ease,filter_.18s_ease] shadow-[0_8px_22px_-8px_rgba(34,48,198,.55),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(34,48,198,.65),inset_0_1px_0_rgba(255,255,255,0.22)] hover:[filter:brightness(1.06)] [&_svg]:w-[16px] [&_svg]:h-[16px] max-[480px]:!w-11 max-[480px]:!h-11 max-[480px]:!p-0 max-[480px]:!justify-center max-[480px]:!gap-0 max-[480px]:[&_svg]:!w-[18px] max-[480px]:[&_svg]:!h-[18px]";

const AUTH_LABEL_CLS = "max-[480px]:hidden";

const LANG_SWITCHER_WRAP_CLS = "max-[540px]:hidden";

const HAMBURGER_BTN_CLS =
  "hidden max-[1024px]:inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-solid border-[rgba(31,41,55,0.12)] text-ink [transition:border-color_.15s_ease,box-shadow_.22s_ease,transform_.15s_ease] hover:border-[rgba(34,48,198,0.32)] hover:shadow-[0_8px_22px_-10px_rgba(34,48,198,.45)] hover:-translate-y-px [&_svg]:w-[20px] [&_svg]:h-[20px] max-[480px]:w-10 max-[480px]:h-10 max-[480px]:[&_svg]:w-[18px] max-[480px]:[&_svg]:h-[18px]";

const DRAWER_BACKDROP_BASE_CLS =
  "fixed inset-0 bg-[rgba(15,23,42,0.55)] z-[200] [backdrop-filter:blur(2px)] [-webkit-backdrop-filter:blur(2px)] [transition:opacity_.25s_ease]";

const DRAWER_BASE_CLS =
  "fixed left-0 top-0 h-[100dvh] w-[300px] max-w-[85vw] bg-brand-blue-darker z-[210] flex flex-col p-5 gap-3 shadow-[0_0_40px_rgba(0,0,0,0.35)] overflow-y-auto [transition:transform_.3s_cubic-bezier(.4,0,.2,1)]";

const DRAWER_HEADER_CLS =
  "flex items-center justify-between pb-4 [border-bottom:1px_solid_rgba(255,255,255,0.1)]";

const DRAWER_LOGO_CLS =
  "inline-flex items-center gap-2 no-underline text-white outline-none [-webkit-tap-highlight-color:transparent] [&_img]:block [&_img]:h-10 [&_img]:w-auto [&_img]:border-0 [&_img]:outline-none";

const DRAWER_CLOSE_CLS =
  "inline-flex items-center justify-center w-9 h-9 rounded-full bg-transparent border border-solid border-[rgba(255,255,255,0.22)] text-white outline-none [-webkit-tap-highlight-color:transparent] [transition:background_.15s_ease,border-color_.15s_ease] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.4)] [&_svg]:w-[18px] [&_svg]:h-[18px]";

const DRAWER_NAV_CLS = "flex flex-col list-none m-0 p-0 mt-1";

const DRAWER_LINK_ROW_CLS =
  "flex items-center justify-between gap-3 w-full text-left text-white text-[13px] font-semibold uppercase tracking-[0.04em] no-underline py-4 px-1 bg-transparent border-0 border-b border-solid border-[rgba(255,255,255,0.08)] cursor-pointer [transition:color_.15s_ease] hover:text-white/80";

const DRAWER_CARET_CLS =
  "w-3 h-3 flex-none text-white/70 [transition:transform_.2s_ease]";
const DRAWER_CARET_OPEN_CLS = "[transform:rotate(180deg)]";

const DRAWER_SUBLIST_CLS =
  "overflow-hidden [transition:max-height_.25s_ease] flex flex-col pl-3";

const DRAWER_SUBLINK_CLS =
  "block text-[13px] font-medium text-white/75 no-underline py-2.5 hover:text-white";

const DRAWER_FOOTER_CLS =
  "mt-auto pt-5 [border-top:1px_solid_rgba(255,255,255,0.1)] flex flex-col gap-3";

const DRAWER_CONTACT_CLS =
  "inline-flex items-center gap-2.5 text-[13px] font-medium text-white/85 no-underline [&_svg]:w-4 [&_svg]:h-4 [&_svg]:flex-none [&_svg]:text-white/70";

const DRAWER_SOCIAL_ROW_CLS = "flex items-center gap-2 mt-1";
const DRAWER_SOCIAL_CLS =
  "w-9 h-9 rounded-full bg-[rgba(255,255,255,0.10)] inline-flex items-center justify-center text-white no-underline [transition:background_.15s_ease] hover:bg-[rgba(255,255,255,0.20)] [&_svg]:w-[15px] [&_svg]:h-[15px]";

type NavGroup = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

const buildNavGroups = (t: (k: string) => string): NavGroup[] => [
  {
    label: t("nav_about"),
    href: "/about/intro",
    children: [
      { label: t("nav_about_intro"), href: "/about/intro" },
      { label: t("nav_about_history"), href: "/about/intro#history" },
      { label: t("nav_about_director"), href: "/about/director" },
      { label: t("nav_about_structure"), href: "/about/structure" },
    ],
  },
  { label: t("nav_events"), href: "/events" },
  {
    label: t("nav_transparency"),
    href: "/#certificates",
    children: [
      { label: t("nav_transparency_mission"), href: "/transparency/mission" },
      {
        label: t("nav_transparency_report"),
        href: "/transparency/report-2025",
      },
      {
        label: t("nav_transparency_resolution"),
        href: "/transparency/resolution",
      },
      {
        label: t("nav_transparency_petition"),
        href: "/transparency/petitions",
      },
      { label: t("nav_transparency_hr"), href: "/transparency/hr-policy" },
      {
        label: t("nav_transparency_vacancies"),
        href: "https://www.zangia.mn/company/National-Stadium-of-Mongolia",
      },
      {
        label: t("nav_transparency_selection"),
        href: "/transparency/selection",
      },
      {
        label: t("nav_transparency_evaluation"),
        href: "/transparency/evaluation",
      },
      {
        label: t("nav_transparency_glass_account"),
        href: "https://shilendans.gov.mn/organization/96933?ry=2025&group=5",
      },
      {
        label: t("nav_transparency_recommendations"),
        href: "/transparency/recommendations",
      },
    ],
  },
  { label: t("nav_legal"), href: "/legal" },
  { label: t("nav_news"), href: "/news" },
];

export default function SiteHeader() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const NAV_GROUPS = buildNavGroups(t);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setScrolled((prev) => {
          if (prev && y < 24) return false;
          if (!prev && y > 64) return true;
          return prev;
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const closeDrawer = () => {
    setMobileOpen(false);
    setOpenIndex(null);
  };

  return (
    <Fragment>
      <header
        className={`${HEADER_BASE_CLS} ${scrolled ? HEADER_SCROLLED_CLS : HEADER_BG_CLS} ${scrolled ? "is-scrolled" : ""}`}
      >
        <div className={HEADER_INNER_CLS}>
          <nav className={MAINNAV_CLS} aria-label={t("nav_main_menu")}>
            <Link
              className={LOGO_CLS}
              to="/"
              aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
            >
              <span className={LOGO_MARK_CLS} aria-hidden="true">
                <img
                  src="/assets/images/brand/logo.png"
                  alt="Төв Цэнгэлдэх Хүрээлэн"
                  width="180"
                  height="36"
                  fetchPriority="high"
                  decoding="async"
                />
              </span>
            </Link>

            <ul className={NAV_LINKS_CLS}>
              <li className={HAS_DROPDOWN_LI_CLS}>
                <Link
                  to="/about/intro"
                  className={NAV_LINK_DROPDOWN_TRIGGER_CLS}
                >
                  {t("nav_about")}
                  <svg
                    className={CARET_CLS}
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 1l4 4 4-4" />
                  </svg>
                </Link>
                <div className={DROPDOWN_CLS} role="menu">
                  <Link className={DROPDOWN_A_CLS} to="/about/intro">
                    {t("nav_about_intro")}
                  </Link>
                  <Link className={DROPDOWN_A_CLS} to="/about/intro#history">
                    {t("nav_about_history")}
                  </Link>
                  <Link className={DROPDOWN_A_CLS} to="/about/director">
                    {t("nav_about_director")}
                  </Link>
                  <Link className={DROPDOWN_A_CLS} to="/about/structure">
                    {t("nav_about_structure")}
                  </Link>
                </div>
              </li>
              <li>
                <Link to="/events" className={NAV_LINK_A_CLS}>
                  {t("nav_events")}
                </Link>
              </li>
              <li className={HAS_DROPDOWN_LI_CLS}>
                <Link
                  to="/#certificates"
                  className={NAV_LINK_DROPDOWN_TRIGGER_CLS}
                >
                  {t("nav_transparency")}
                  <svg
                    className={CARET_CLS}
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 1l4 4 4-4" />
                  </svg>
                </Link>
                <div className={DROPDOWN_CLS} role="menu">
                  <Link className={DROPDOWN_A_CLS} to="/transparency/mission">
                    {t("nav_transparency_mission")}
                  </Link>
                  <Link
                    className={DROPDOWN_A_CLS}
                    to="/transparency/report-2025"
                  >
                    {t("nav_transparency_report")}
                  </Link>
                  <Link
                    className={DROPDOWN_A_CLS}
                    to="/transparency/resolution"
                  >
                    {t("nav_transparency_resolution")}
                  </Link>
                  <Link className={DROPDOWN_A_CLS} to="/transparency/petitions">
                    {t("nav_transparency_petition")}
                  </Link>
                  <Link className={DROPDOWN_A_CLS} to="/transparency/hr-policy">
                    {t("nav_transparency_hr")}
                  </Link>
                  <a
                    className={DROPDOWN_A_CLS}
                    href="https://www.zangia.mn/company/National-Stadium-of-Mongolia"
                  >
                    {t("nav_transparency_vacancies")}
                  </a>
                  <Link className={DROPDOWN_A_CLS} to="/transparency/selection">
                    {t("nav_transparency_selection")}
                  </Link>
                  <Link
                    className={DROPDOWN_A_CLS}
                    to="/transparency/evaluation"
                  >
                    {t("nav_transparency_evaluation")}
                  </Link>
                  <a
                    className={DROPDOWN_A_CLS}
                    href="https://shilendans.gov.mn/organization/96933?ry=2025&group=5"
                  >
                    {t("nav_transparency_glass_account")}
                  </a>
                  <Link
                    className={DROPDOWN_A_CLS}
                    to="/transparency/recommendations"
                  >
                    {t("nav_transparency_recommendations")}
                  </Link>
                </div>
              </li>
              <li>
                <Link to="/legal" className={NAV_LINK_A_CLS}>
                  {t("nav_legal")}
                </Link>
              </li>
              <li>
                <Link to="/news" className={NAV_LINK_A_CLS}>
                  {t("nav_news")}
                </Link>
              </li>
            </ul>

            <div className={HEADER_AUTH_CLS}>
              <span className={LANG_SWITCHER_WRAP_CLS}>
                <LanguageSwitcher />
              </span>
              <button
                type="button"
                className={HAMBURGER_BTN_CLS}
                aria-label={t("nav_open_menu")}
                aria-expanded={mobileOpen}
                aria-controls="mobile-drawer"
                onClick={() => setMobileOpen(true)}
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
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              {session && session.identifier ? (
                <UserMenu />
              ) : (
                <Link
                  to="/login"
                  className={AUTH_BTN_CLS}
                  aria-label={t("nav_login")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0116 0" />
                  </svg>
                  <span className={AUTH_LABEL_CLS}>{t("nav_login")}</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      <div
        className={`${DRAWER_BACKDROP_BASE_CLS} ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!mobileOpen}
        onClick={closeDrawer}
      />
      <aside
        id="mobile-drawer"
        className={`${DRAWER_BASE_CLS} ${mobileOpen ? "[transform:translateX(0)]" : "[transform:translateX(-100%)]"}`}
        aria-hidden={!mobileOpen}
        aria-label={t("nav_main_menu")}
      >
        <div className={DRAWER_HEADER_CLS}>
          <Link to="/" className={DRAWER_LOGO_CLS} onClick={closeDrawer}>
            <img
              src="/assets/images/brand/logo-white.png"
              alt="Төв Цэнгэлдэх Хүрээлэн"
              width="200"
              height="40"
              decoding="async"
            />
          </Link>
          <button
            type="button"
            className={DRAWER_CLOSE_CLS}
            aria-label={t("nav_close_menu")}
            onClick={closeDrawer}
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <ul className={DRAWER_NAV_CLS}>
          {NAV_GROUPS.map((group, idx) => {
            const isOpen = openIndex === idx;
            if (!group.children) {
              const isRoute = group.href.startsWith("/");
              return (
                <li key={group.label}>
                  {isRoute ? (
                    <Link
                      to={group.href}
                      className={DRAWER_LINK_ROW_CLS}
                      onClick={closeDrawer}
                    >
                      <span>{group.label}</span>
                    </Link>
                  ) : (
                    <a
                      href={group.href}
                      className={DRAWER_LINK_ROW_CLS}
                      onClick={closeDrawer}
                    >
                      <span>{group.label}</span>
                    </a>
                  )}
                </li>
              );
            }
            return (
              <li key={group.label}>
                <button
                  type="button"
                  className={DRAWER_LINK_ROW_CLS}
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span>{group.label}</span>
                  <svg
                    className={`${DRAWER_CARET_CLS} ${isOpen ? DRAWER_CARET_OPEN_CLS : ""}`}
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 1l4 4 4-4" />
                  </svg>
                </button>
                <div
                  className={DRAWER_SUBLIST_CLS}
                  style={{
                    maxHeight: isOpen
                      ? `${group.children.length * 44 + 16}px`
                      : "0px",
                  }}
                >
                  {group.children.map((child) => {
                    const isExternal = /^https?:\/\//i.test(child.href);
                    if (isExternal) {
                      return (
                        <a
                          key={child.label}
                          href={child.href}
                          className={DRAWER_SUBLINK_CLS}
                          onClick={closeDrawer}
                        >
                          {child.label}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={child.label}
                        to={child.href}
                        className={DRAWER_SUBLINK_CLS}
                        onClick={closeDrawer}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <div className={DRAWER_FOOTER_CLS}>
          <div className="mb-2">
            <LanguageSwitcher dark />
          </div>
          <a href="mailto:info@tsengeldekh.mn" className={DRAWER_CONTACT_CLS}>
            <svg
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
            info@tsengeldekh.mn
          </a>
          <a href="tel:+97677000000" className={DRAWER_CONTACT_CLS}>
            <svg
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
            (+976) 7700 0000
          </a>
          <div className={DRAWER_SOCIAL_ROW_CLS}>
            <a href="#" aria-label="Facebook" className={DRAWER_SOCIAL_CLS}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13 22v-8h3l1-4h-4V7c0-1 .3-1.7 1.8-1.7H17V1.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7v4h3.6v8z" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram" className={DRAWER_SOCIAL_CLS}>
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
            <a href="#" aria-label="YouTube" className={DRAWER_SOCIAL_CLS}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8a26 26 0 0 0-.4-4.8zM10 15V9l5 3z" />
              </svg>
            </a>
          </div>
        </div>
      </aside>
    </Fragment>
  );
}
