import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import UserMenu from './UserMenu';

const HEADER_BASE_CLS =
  "w-full pt-[18px] px-6 pb-0 sticky top-0 z-[100] [backdrop-filter:blur(18px)_saturate(160%)] [-webkit-backdrop-filter:blur(18px)_saturate(160%)] border-b border-solid border-[rgba(31,41,55,0.08)] [transition:background_0.25s_ease,box-shadow_0.25s_ease]";
const HEADER_BG_CLS = "bg-[rgba(255,255,255,0.55)]";
const HEADER_SCROLLED_CLS = "!bg-[rgba(255,255,255,0.78)] shadow-[0_8px_24px_-16px_rgba(31,41,55,0.18)]";

const HEADER_INNER_CLS = "max-w-screen-page mx-auto";

const TOPBAR_BASE_CLS =
  "flex items-stretch relative overflow-hidden [transition:max-height_.35s_ease,opacity_.25s_ease,margin_.35s_ease] max-[720px]:flex-col max-[720px]:items-stretch";
const TOPBAR_OPEN_CLS = "max-h-[80px] opacity-100";
const TOPBAR_CLOSED_CLS = "max-h-0 opacity-0 -mt-2";

const TOPBAR_MAIN_CLS =
  "flex-1 text-ink rounded-[28px] flex items-center z-[1] min-w-0 py-3 px-7 gap-7 -mr-[34px] bg-[rgba(255,255,255,0.55)] [backdrop-filter:blur(14px)_saturate(160%)] [-webkit-backdrop-filter:blur(14px)_saturate(160%)] border border-solid border-[rgba(31,41,55,0.08)] max-[920px]:gap-[18px] max-[720px]:mr-0 max-[720px]:-mb-4 max-[720px]:pb-6 max-[720px]:flex-wrap max-[720px]:gap-[14px]";

const TOPBAR_ACCENT_CLS =
  "bg-brand-blue-tint rounded-[28px] flex items-center gap-2.5 z-[2] py-2.5 px-[22px] border border-solid border-[rgba(34,48,198,0.12)] max-[720px]:self-end max-[720px]:mr-3";

const CONTACT_ITEM_CLS =
  "inline-flex items-center gap-2.5 text-[13px] font-medium whitespace-nowrap text-ink max-[920px]:text-xs [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:flex-none [&_svg]:opacity-100 [&_svg]:text-brand-blue";

const SOCIAL_LINK_CLS =
  "w-[26px] h-[26px] rounded-full bg-white text-brand-blue inline-flex items-center justify-center no-underline [transition:transform_0.15s_ease] hover:bg-brand-blue hover:text-white hover:-translate-y-px [&_svg]:w-[13px] [&_svg]:h-[13px]";

const MAINNAV_CLS =
  "flex items-center justify-between gap-6 py-[14px] px-3 max-[720px]:flex-wrap max-[720px]:gap-4";

const LOGO_CLS =
  "inline-flex items-center gap-2.5 no-underline text-ink";
const LOGO_MARK_CLS =
  "w-auto h-11 rounded-none bg-transparent border-0 flex-none [&_img]:block [&_img]:h-full [&_img]:w-auto";

const NAV_LINKS_CLS =
  "flex items-center list-none m-0 p-0 gap-8 max-[920px]:gap-5 max-[720px]:order-3 max-[720px]:w-full max-[720px]:justify-center";
const NAV_LINK_A_CLS =
  "no-underline text-ink text-sm font-semibold [transition:color_0.15s_ease] hover:text-brand-blue";
const NAV_LINK_DROPDOWN_TRIGGER_CLS = `${NAV_LINK_A_CLS} inline-flex items-center gap-1.5`;

const HAS_DROPDOWN_LI_CLS = "group relative";

const CARET_CLS =
  "w-[9px] h-[9px] [transition:transform_.2s_ease] group-hover:[transform:rotate(180deg)] group-focus-within:[transform:rotate(180deg)]";

const DROPDOWN_CLS =
  "absolute top-full min-w-[240px] mt-3 p-2 rounded-xl invisible opacity-0 z-[110] left-[-14px] bg-[rgba(255,255,255,0.92)] [backdrop-filter:blur(20px)_saturate(170%)] [-webkit-backdrop-filter:blur(20px)_saturate(170%)] border border-solid border-[rgba(31,41,55,0.08)] shadow-[0_18px_40px_-12px_rgba(31,41,55,0.18)] [transform:translateY(6px)] [transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_.18s] group-hover:opacity-100 group-hover:visible group-hover:[transform:translateY(0)] group-hover:[transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_0s] group-focus-within:opacity-100 group-focus-within:visible group-focus-within:[transform:translateY(0)] group-focus-within:[transition:opacity_.18s_ease,transform_.18s_ease,visibility_0s_linear_0s]";

const DROPDOWN_A_CLS =
  "block text-[13.5px] font-medium text-ink rounded-lg whitespace-nowrap py-[9px] px-[14px] no-underline hover:bg-brand-blue-tint hover:text-brand-blue";

const HEADER_AUTH_CLS = "inline-flex items-center gap-[14px]";

const AUTH_BTN_ICON_CLS =
  "inline-flex items-center justify-center gap-0 rounded-full bg-brand-blue text-white text-sm font-semibold no-underline w-10 h-10 p-0 [transition:background_.15s_ease,transform_.15s_ease,box-shadow_.2s_ease] shadow-[0_6px_18px_-8px_rgba(34,48,198,.55)] hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(34,48,198,.65)] [&_svg]:w-[18px] [&_svg]:h-[18px]";

export default function SiteHeader() {
  const { session } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`${HEADER_BASE_CLS} ${scrolled ? HEADER_SCROLLED_CLS : HEADER_BG_CLS} ${scrolled ? 'is-scrolled' : ''}`}
    >
      <div className={HEADER_INNER_CLS}>

        <div className={`${TOPBAR_BASE_CLS} ${scrolled ? TOPBAR_CLOSED_CLS : TOPBAR_OPEN_CLS}`}>
          <div className={TOPBAR_MAIN_CLS}>
            <span className={CONTACT_ITEM_CLS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
              </svg>
              +976 7700 0000
            </span>
            <span className={CONTACT_ITEM_CLS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              info@tsengeldekh.mn
            </span>
            <span className={CONTACT_ITEM_CLS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Ulaanbaatar, Mongolia
            </span>
          </div>

          <div className={TOPBAR_ACCENT_CLS} aria-label="Social media links">
            <a href="#" aria-label="Facebook" className={SOCIAL_LINK_CLS}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 22v-8h3l1-4h-4V7c0-1 .3-1.7 1.8-1.7H17V1.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H7v4h3.6v8z"/></svg></a>
            <a href="#" aria-label="Instagram" className={SOCIAL_LINK_CLS}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
            <a href="#" aria-label="Twitter" className={SOCIAL_LINK_CLS}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.8c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 12 9c0 .3 0 .6.1.9A11.6 11.6 0 0 1 3.4 5a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4 4 0 0 1-1.9.1c.5 1.6 2 2.8 3.8 2.9A8.2 8.2 0 0 1 2 18.6 11.6 11.6 0 0 0 8.3 20.5c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.1z"/></svg></a>
            <a href="#" aria-label="LinkedIn" className={SOCIAL_LINK_CLS}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM19 19h-3v-4.7c0-1.1 0-2.6-1.6-2.6S12.6 13 12.6 14.2V19h-3v-9h2.9v1.2h.1A3.2 3.2 0 0 1 15.5 10c3.1 0 3.7 2 3.7 4.7z"/></svg></a>
            <a href="#" aria-label="YouTube" className={SOCIAL_LINK_CLS}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8a26 26 0 0 0-.4-4.8zM10 15V9l5 3z"/></svg></a>
          </div>
        </div>

        <nav className={MAINNAV_CLS} aria-label="Үндсэн цэс">
          <Link className={LOGO_CLS} to="/" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
            <span className={LOGO_MARK_CLS} aria-hidden="true">
              <img src="/assets/images/brand/logo.png" alt="Төв Цэнгэлдэх Хүрээлэн" />
            </span>
          </Link>

          <ul className={NAV_LINKS_CLS}>
            <li className={HAS_DROPDOWN_LI_CLS}>
              <a href="#about" className={NAV_LINK_DROPDOWN_TRIGGER_CLS}>
                Бидний тухай
                <svg className={CARET_CLS} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>
              </a>
              <div className={DROPDOWN_CLS} role="menu">
                <a className={DROPDOWN_A_CLS} href="#about">Танилцуулга</a>
                <a className={DROPDOWN_A_CLS} href="#events">Түүхэн замнал</a>
                <a className={DROPDOWN_A_CLS} href="#about">Байгууллагын бүтэц</a>
                <a className={DROPDOWN_A_CLS} href="#about">Эрхэм зорилго</a>
              </div>
            </li>
            <li><a href="#events" className={NAV_LINK_A_CLS}>Үйл ажиллагаа &amp; Арга хэмжээ</a></li>
            <li className={HAS_DROPDOWN_LI_CLS}>
              <a href="#certificates" className={NAV_LINK_DROPDOWN_TRIGGER_CLS}>
                Ил тод байдал
                <svg className={CARET_CLS} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>
              </a>
              <div className={DROPDOWN_CLS} role="menu">
                <a className={DROPDOWN_A_CLS} href="#certificates">Гүйцэтгэлийн тайлан</a>
                <a className={DROPDOWN_A_CLS} href="#certificates">НИТХ-ын тогтоол</a>
                <a className={DROPDOWN_A_CLS} href="#contact">Өргөдөл хүсэлт</a>
                <a className={DROPDOWN_A_CLS} href="#certificates">Хүний нөөцийн бодлого</a>
                <a className={DROPDOWN_A_CLS} href="#certificates">Сонгон шалгаруулах журам</a>
                <a className={DROPDOWN_A_CLS} href="#certificates">Гүйцэтгэлийг үнэлэх журам</a>
                <a className={DROPDOWN_A_CLS} href="#certificates">Ёс зүйн дүрэм</a>
                <a className={DROPDOWN_A_CLS} href="#certificates">Зөвлөмжийн хэрэгжилт</a>
              </div>
            </li>
            <li><a href="#certificates" className={NAV_LINK_A_CLS}>Хууль, эрх зүй</a></li>
            <li><a href="#certificates" className={NAV_LINK_A_CLS}>Шилэн</a></li>
            <li><a href="#news" className={NAV_LINK_A_CLS}>Мэдээ мэдээлэл</a></li>
            <li><a href="#contact" className={NAV_LINK_A_CLS}>Холбоо барих</a></li>
          </ul>

          <div className={HEADER_AUTH_CLS}>
            {session && session.identifier ? (
              <UserMenu />
            ) : (
              <Link to="/login" className={AUTH_BTN_ICON_CLS} aria-label="Нэвтрэх">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>
                </svg>
                <span>Нэвтрэх</span>
              </Link>
            )}
          </div>
        </nav>

      </div>
    </header>
  );
}
