import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import UserMenu from "./UserMenu";

const HEADER_BASE_CLS =
  "w-full px-4 pb-0 sticky top-0 z-[100] [backdrop-filter:blur(18px)_saturate(160%)] [-webkit-backdrop-filter:blur(18px)_saturate(160%)] border-b border-solid border-[rgba(31,41,55,0.08)] [transition:background_0.25s_ease,box-shadow_0.25s_ease] max-[920px]:px-3";
const HEADER_BG_CLS = "bg-[rgba(255,255,255,0.55)]";
const HEADER_SCROLLED_CLS =
  "!bg-[rgba(255,255,255,0.78)] shadow-[0_8px_24px_-16px_rgba(31,41,55,0.18)]";

const HEADER_INNER_CLS = "max-w-screen-page mx-auto";

const MAINNAV_CLS =
  "flex items-center justify-between gap-6 py-[8px] px-0 max-[920px]:px-0 max-[920px]:py-2 max-[920px]:gap-3";

const LOGO_CLS = "inline-flex items-center gap-2.5 no-underline text-ink";
const LOGO_MARK_CLS =
  "w-auto h-9 rounded-none bg-transparent border-0 flex-none [&_img]:block [&_img]:h-full [&_img]:w-auto max-[920px]:h-8";

const NAV_LINKS_CLS =
  "flex items-center list-none m-0 p-0 gap-8 max-[1100px]:gap-5 max-[920px]:hidden";
const NAV_LINK_A_CLS =
  "no-underline text-ink text-[16px] font-semibold whitespace-nowrap [transition:color_0.15s_ease] hover:text-brand-blue";
const NAV_LINK_DROPDOWN_TRIGGER_CLS = `${NAV_LINK_A_CLS} inline-flex items-center gap-1.5`;

const HAS_DROPDOWN_LI_CLS = "group relative";

const CARET_CLS =
  "w-[9px] h-[9px] [transition:transform_.2s_ease] group-hover:[transform:rotate(180deg)] group-focus-within:[transform:rotate(180deg)]";

const DROPDOWN_CLS =
  "absolute top-full min-w-[240px] mt-3 p-2 rounded-xl invisible opacity-0 z-[110] left-[-14px] bg-[rgba(255,255,255,0.92)] [backdrop-filter:blur(20px)_saturate(170%)] [-webkit-backdrop-filter:blur(20px)_saturate(170%)] border border-solid border-[rgba(31,41,55,0.08)] shadow-[0_18px_40px_-12px_rgba(31,41,55,0.18)] [transform:translateY(6px)] [transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_.18s] group-hover:opacity-100 group-hover:visible group-hover:[transform:translateY(0)] group-hover:[transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_0s] group-focus-within:opacity-100 group-focus-within:visible group-focus-within:[transform:translateY(0)] group-focus-within:[transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_0s]";

const DROPDOWN_A_CLS =
  "block text-[15px] font-medium text-ink rounded-lg whitespace-nowrap py-[9px] px-[14px] no-underline hover:bg-brand-blue-tint hover:text-brand-blue";

const HEADER_AUTH_CLS = "inline-flex items-center gap-[14px] max-[920px]:gap-2";

const AUTH_BTN_CLS =
  "inline-flex items-center leading-none gap-2 rounded-full bg-brand-blue text-white text-[15px] font-semibold no-underline py-[9px] px-[18px] [transition:background_.15s_ease,transform_.15s_ease,box-shadow_.2s_ease] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-4 [&_svg]:h-4";

const HAMBURGER_BTN_CLS =
  "hidden max-[920px]:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-solid border-[rgba(31,41,55,0.10)] text-ink [transition:border-color_.15s_ease,box-shadow_.2s_ease] hover:border-[rgba(34,48,198,0.30)] hover:shadow-[0_6px_18px_-10px_rgba(34,48,198,.45)] [&_svg]:w-[18px] [&_svg]:h-[18px]";

const DRAWER_BACKDROP_BASE_CLS =
  "fixed inset-0 bg-[rgba(15,23,42,0.55)] z-[200] [backdrop-filter:blur(2px)] [-webkit-backdrop-filter:blur(2px)] [transition:opacity_.25s_ease]";

const DRAWER_BASE_CLS =
  "fixed left-0 top-0 h-[100dvh] w-[300px] max-w-[85vw] bg-brand-blue-darker z-[210] flex flex-col p-5 gap-3 shadow-[0_0_40px_rgba(0,0,0,0.35)] overflow-y-auto [transition:transform_.3s_cubic-bezier(.4,0,.2,1)]";

const DRAWER_HEADER_CLS =
  "flex items-center justify-between pb-4 border-b border-solid border-[rgba(255,255,255,0.12)]";

const DRAWER_LOGO_CLS =
  "inline-flex items-center gap-2 no-underline text-white [&_img]:block [&_img]:h-10 [&_img]:w-auto";

const DRAWER_CLOSE_CLS =
  "inline-flex items-center justify-center w-9 h-9 rounded-full bg-transparent border border-solid border-[rgba(255,255,255,0.22)] text-white [transition:background_.15s_ease,border-color_.15s_ease] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.4)] [&_svg]:w-[18px] [&_svg]:h-[18px]";

const DRAWER_NAV_CLS = "flex flex-col list-none m-0 p-0 mt-1";

const DRAWER_LINK_ROW_CLS =
  "flex items-center justify-between gap-3 w-full text-left text-white text-[13px] font-semibold uppercase tracking-[0.04em] no-underline py-4 px-1 bg-transparent border-0 border-b border-solid border-[rgba(255,255,255,0.08)] cursor-pointer [transition:color_.15s_ease] hover:text-white/80";

const DRAWER_CARET_CLS =
  "w-3 h-3 flex-none text-white/70 [transition:transform_.2s_ease]";
const DRAWER_CARET_OPEN_CLS = "[transform:rotate(180deg)]";

const DRAWER_SUBLIST_CLS =
  "overflow-hidden [transition:max-height_.25s_ease] flex flex-col pl-3 border-b border-solid border-[rgba(255,255,255,0.08)]";

const DRAWER_SUBLINK_CLS =
  "block text-[13px] font-medium text-white/75 no-underline py-2.5 hover:text-white";

const DRAWER_FOOTER_CLS =
  "mt-auto pt-5 border-t border-solid border-[rgba(255,255,255,0.12)] flex flex-col gap-3";

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

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Бидний тухай",
    href: "#about",
    children: [
      { label: "Танилцуулга", href: "#about" },
      { label: "Түүхэн замнал", href: "#events" },
      { label: "Байгууллагын бүтэц", href: "#about" },
      { label: "Эрхэм зорилго", href: "#about" },
    ],
  },
  { label: "Үйл ажиллагаа & Арга хэмжээ", href: "/events" },
  {
    label: "Ил тод байдал",
    href: "#certificates",
    children: [
      { label: "Гүйцэтгэлийн тайлан", href: "#certificates" },
      { label: "НИТХ-ын тогтоол", href: "#certificates" },
      { label: "Өргөдөл хүсэлт", href: "#contact" },
      { label: "Хүний нөөцийн бодлого", href: "#certificates" },
      { label: "Сонгон шалгаруулах журам", href: "#certificates" },
      { label: "Гүйцэтгэлийг үнэлэх журам", href: "#certificates" },
      { label: "Ёс зүйн дүрэм", href: "#certificates" },
      { label: "Зөвлөмжийн хэрэгжилт", href: "#certificates" },
    ],
  },
  { label: "Хууль, эрх зүй", href: "#certificates" },
  { label: "Шилэн", href: "#certificates" },
  { label: "Мэдээ мэдээлэл", href: "#news" },
  { label: "Холбоо барих", href: "#contact" },
];

export default function SiteHeader() {
  const { session } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
          <nav className={MAINNAV_CLS} aria-label="Үндсэн цэс">
            <Link
              className={LOGO_CLS}
              to="/"
              aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр"
            >
              <span className={LOGO_MARK_CLS} aria-hidden="true">
                <img
                  src="/assets/images/brand/logo.png"
                  alt="Төв Цэнгэлдэх Хүрээлэн"
                />
              </span>
            </Link>

            <ul className={NAV_LINKS_CLS}>
              <li className={HAS_DROPDOWN_LI_CLS}>
                <a href="#about" className={NAV_LINK_DROPDOWN_TRIGGER_CLS}>
                  Бидний тухай
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
                </a>
                <div className={DROPDOWN_CLS} role="menu">
                  <a className={DROPDOWN_A_CLS} href="#about">
                    Танилцуулга
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#events">
                    Түүхэн замнал
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#about">
                    Байгууллагын бүтэц
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#about">
                    Эрхэм зорилго
                  </a>
                </div>
              </li>
              <li>
                <Link to="/events" className={NAV_LINK_A_CLS}>
                  Үйл ажиллагаа &amp; Арга хэмжээ
                </Link>
              </li>
              <li className={HAS_DROPDOWN_LI_CLS}>
                <a
                  href="#certificates"
                  className={NAV_LINK_DROPDOWN_TRIGGER_CLS}
                >
                  Ил тод байдал
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
                </a>
                <div className={DROPDOWN_CLS} role="menu">
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    Гүйцэтгэлийн тайлан
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    НИТХ-ын тогтоол
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#contact">
                    Өргөдөл хүсэлт
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    Хүний нөөцийн бодлого
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    Сонгон шалгаруулах журам
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    Гүйцэтгэлийг үнэлэх журам
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    Ёс зүйн дүрэм
                  </a>
                  <a className={DROPDOWN_A_CLS} href="#certificates">
                    Зөвлөмжийн хэрэгжилт
                  </a>
                </div>
              </li>
              <li>
                <a href="#certificates" className={NAV_LINK_A_CLS}>
                  Хууль, эрх зүй
                </a>
              </li>
              <li>
                <a href="#certificates" className={NAV_LINK_A_CLS}>
                  Шилэн
                </a>
              </li>
              <li>
                <a href="#news" className={NAV_LINK_A_CLS}>
                  Мэдээ мэдээлэл
                </a>
              </li>
              <li>
                <a href="#contact" className={NAV_LINK_A_CLS}>
                  Холбоо барих
                </a>
              </li>
            </ul>

            <div className={HEADER_AUTH_CLS}>
              {session && session.identifier ? (
                <UserMenu />
              ) : (
                <Link to="/login" className={AUTH_BTN_CLS} aria-label="Нэвтрэх">
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
                  <span>Нэвтрэх</span>
                </Link>
              )}
              <button
                type="button"
                className={HAMBURGER_BTN_CLS}
                aria-label="Цэс нээх"
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
        aria-label="Үндсэн цэс"
      >
        <div className={DRAWER_HEADER_CLS}>
          <Link to="/" className={DRAWER_LOGO_CLS} onClick={closeDrawer}>
            <img
              src="/assets/images/brand/logo.png"
              alt="Төв Цэнгэлдэх Хүрээлэн"
            />
          </Link>
          <button
            type="button"
            className={DRAWER_CLOSE_CLS}
            aria-label="Цэс хаах"
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
                  {group.children.map((child) => (
                    <a
                      key={child.label}
                      href={child.href}
                      className={DRAWER_SUBLINK_CLS}
                      onClick={closeDrawer}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>

        <div className={DRAWER_FOOTER_CLS}>
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
