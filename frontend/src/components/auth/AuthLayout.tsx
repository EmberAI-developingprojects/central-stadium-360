// AuthLayout — full-page shell for /login, /register, /settings, etc.
// Renders the brand logo at the top-left and an optional back affordance at
// the top-right; the page-specific card goes in `children`.
//
// Pixel-targeted port of:
//   .login-page  (radial gradients + surface-1 base)
//   .login-header
//   .login-main
// from styles.css. Existing CSS classes remain on the elements so the old
// rules still apply during the Phase 1 coexistence window — any divergence
// between the Tailwind utilities and styles.css surfaces as a regression we
// can spot immediately.

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '../ui/Button';

const PAGE_BG: string =
  'radial-gradient(60% 50% at 100% 0%, rgba(34, 48, 198, 0.08) 0%, transparent 70%),' +
  'radial-gradient(50% 50% at 0% 100%, rgba(168, 153, 104, 0.10) 0%, transparent 70%),' +
  '#F6F7F9';

const BACK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

type BackLinkProps = { to: string; children: ReactNode };
export function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link to={to} className={buttonClass('ghost')}>
      {BACK_ICON}
      {children}
    </Link>
  );
}

type BackButtonProps = { onClick: () => void; children: ReactNode };
export function BackButton({ onClick, children }: BackButtonProps) {
  return (
    <button type="button" onClick={onClick} className={buttonClass('ghost')}>
      {BACK_ICON}
      {children}
    </button>
  );
}

type Props = {
  /** Right-side affordance in the header. Use <BackLink>/<BackButton> or any custom node. */
  back?: ReactNode;
  /** Card content. */
  children: ReactNode;
};

export function AuthLayout({ back, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: PAGE_BG }}>
      <header className="flex items-center justify-between px-8 py-6 max-w-[1300px] w-full mx-auto max-[540px]:px-5 max-[540px]:py-[18px]">
        <Link to="/" className="inline-flex items-center no-underline" aria-label="Төв Цэнгэлдэх Хүрээлэн — Нүүр">
          <img
            src="/assets/images/brand/logo.png"
            alt="Төв Цэнгэлдэх Хүрээлэн"
            className="block h-12 w-auto max-[540px]:h-10"
          />
        </Link>
        {back}
      </header>
      <main className="flex-1 grid place-items-center px-6 pt-6 pb-[72px]">
        {children}
      </main>
    </div>
  );
}
