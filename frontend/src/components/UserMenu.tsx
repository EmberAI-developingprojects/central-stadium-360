import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth';
import type { Session } from '../auth';

const TICKETS_KEY = 'tsengeldekh_tickets';

type Ticket = { user?: string } & Record<string, unknown>;

function ticketCountFor(session: Session | null): number {
  if (!session) return 0;
  try {
    const all = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]') as Ticket[];
    return all.filter((t) => !t.user || t.user === session.identifier).length;
  } catch {
    return 0;
  }
}

const TRIGGER_BASE_CLS =
  "inline-flex items-center gap-2.5 bg-white rounded-full cursor-pointer text-ink pt-[5px] pr-[14px] pb-[5px] pl-[6px] border border-solid border-[rgba(31,41,55,0.10)] font-[inherit] shrink min-w-0 max-[540px]:gap-2 max-[540px]:pr-[10px] max-[420px]:pr-[6px] [transition:border-color_.15s_ease,box-shadow_.2s_ease,transform_.15s_ease] hover:border-[rgba(34,48,198,0.30)] hover:shadow-[0_6px_18px_-10px_rgba(34,48,198,.45)] [.is-scrolled_&]:bg-[rgba(255,255,255,0.92)] [.watch-header_&]:bg-[rgba(255,255,255,0.08)] [.watch-header_&]:border-[rgba(255,255,255,0.14)] [.watch-header_&]:text-[rgba(255,255,255,0.92)] [.watch-header_&]:hover:bg-[rgba(255,255,255,0.14)] [.watch-header_&]:hover:border-[rgba(255,255,255,0.30)]";
const TRIGGER_OPEN_CLS =
  "!border-[rgba(34,48,198,0.45)] shadow-[0_8px_22px_-10px_rgba(34,48,198,.55)] [.watch-header_&]:!bg-[rgba(255,255,255,0.16)] [.watch-header_&]:!border-[rgba(255,255,255,0.40)]";

const AVATAR_BASE_CLS =
  "w-[30px] h-[30px] rounded-full text-white text-[13px] font-bold inline-flex items-center justify-center uppercase tracking-[0.02em] shrink-0 [background:linear-gradient(135deg,#2230C6_0%,#1A26A0_100%)]";
const AVATAR_LG_CLS =
  "w-11 h-11 rounded-full text-white text-[17px] font-bold inline-flex items-center justify-center uppercase tracking-[0.02em] shrink-0 [background:linear-gradient(135deg,#2230C6_0%,#1A26A0_100%)]";
const AVATAR_IMG_OVERRIDE =
  "!bg-[#e5e7eb] !text-transparent overflow-hidden [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:block";

const NAME_CLS =
  "text-sm font-semibold max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis max-[540px]:max-w-[90px] max-[540px]:text-[13px] max-[420px]:hidden";

const CARET_CLS =
  "w-2.5 h-2.5 text-ink-soft [transition:transform_.2s_ease] [.watch-header_&]:text-[rgba(255,255,255,0.65)]";
const CARET_OPEN_CLS = "[transform:rotate(180deg)]";

const PANEL_CLS =
  "absolute right-0 min-w-[280px] p-2.5 rounded-[14px] z-[120] top-[calc(100%+10px)] bg-[rgba(255,255,255,0.96)] [backdrop-filter:blur(20px)_saturate(170%)] [-webkit-backdrop-filter:blur(20px)_saturate(170%)] border border-solid border-[rgba(31,41,55,0.08)] shadow-[0_20px_50px_-14px_rgba(31,41,55,0.25)] [animation:userMenuIn_.14s_ease]";

const HEAD_CLS = "flex items-center gap-3 pt-2 pr-2.5 pb-3 pl-2.5 [&>div]:flex [&>div]:flex-col [&>div]:min-w-0";
const FULLNAME_CLS =
  "text-sm font-bold text-ink leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis";
const ID_CLS =
  "text-xs text-ink-soft mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis";
const SEP_CLS = "h-px my-1 mx-0 bg-[rgba(31,41,55,0.08)]";

const ITEM_CLS =
  "flex items-center gap-3 w-full bg-transparent border-0 rounded-[9px] cursor-pointer text-sm font-medium text-ink text-left py-2.5 px-3 font-[inherit] [transition:background_.15s_ease,color_.15s_ease] hover:bg-brand-blue-tint hover:text-brand-blue [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:text-ink-soft [&_svg]:shrink-0 hover:[&_svg]:text-brand-blue";
const ITEM_DANGER_CLS =
  "!text-[#B91C1C] [&_svg]:!text-[#B91C1C] hover:!bg-[rgba(185,28,28,0.08)] hover:!text-[#991B1B] hover:[&_svg]:!text-[#991B1B]";

const BADGE_CLS =
  "ml-auto min-w-[22px] rounded-full bg-brand-blue text-white text-[11px] font-bold text-center py-0.5 px-[7px]";

export default function UserMenu() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session || !session.identifier) return null;

  const label = session.fullname || session.identifier;
  const initial = (label || '?').trim().charAt(0).toUpperCase();
  const avatar = session.avatar;
  const ticketCount = ticketCountFor(session);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const onLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`${TRIGGER_BASE_CLS}${open ? ' ' + TRIGGER_OPEN_CLS : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`${AVATAR_BASE_CLS}${avatar ? ' ' + AVATAR_IMG_OVERRIDE : ''}`} aria-hidden="true">
          {avatar ? <img src={avatar} alt="" /> : initial}
        </span>
        <span className={NAME_CLS}>{label}</span>
        <svg
          className={`${CARET_CLS}${open ? ' ' + CARET_OPEN_CLS : ''}`}
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4"/>
        </svg>
      </button>

      <div className={PANEL_CLS} role="menu" hidden={!open}>
        <div className={HEAD_CLS}>
          <span className={`${AVATAR_LG_CLS}${avatar ? ' ' + AVATAR_IMG_OVERRIDE : ''}`} aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : initial}
          </span>
          <div>
            <strong className={FULLNAME_CLS}>{label}</strong>
            <span className={ID_CLS}>{session.identifier}</span>
          </div>
        </div>

        <div className={SEP_CLS} role="separator"></div>

        <button type="button" className={ITEM_CLS} role="menuitem" onClick={() => go('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>
          </svg>
          <span>{t('user_menu_profile')}</span>
        </button>

        <button type="button" className={ITEM_CLS} role="menuitem" onClick={() => go('/watch#tickets')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
            <line x1="13" y1="5" x2="13" y2="7"/>
            <line x1="13" y1="11" x2="13" y2="13"/>
            <line x1="13" y1="17" x2="13" y2="19"/>
          </svg>
          <span>{t('user_menu_orders')}</span>
          {ticketCount > 0 && <span className={BADGE_CLS}>{ticketCount}</span>}
        </button>

        <button type="button" className={ITEM_CLS} role="menuitem" onClick={() => go('/settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
          </svg>
          <span>{t('user_menu_settings')}</span>
        </button>

        <div className={SEP_CLS} role="separator"></div>

        <button type="button" className={`${ITEM_CLS} ${ITEM_DANGER_CLS}`} role="menuitem" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>{t('user_menu_logout')}</span>
        </button>
      </div>
    </div>
  );
}
