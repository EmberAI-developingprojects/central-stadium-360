// AuthCard — the white-glass card that holds the auth form / verification view.
// Pixel-targeted port of .login-card + .login-eyebrow + .login-title +
// .login-subtitle from styles.css.

import type { ReactNode } from 'react';

type Props = {
  /** Small uppercased pill above the title, e.g. "Хувийн булан". */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Card body. */
  children: ReactNode;
  className?: string;
};

const CARD_CLASS =
  'w-full max-w-[440px] bg-white/[0.96] border border-ink/[0.06] rounded-[22px] ' +
  'pt-10 pl-[38px] pr-[38px] pb-8 ' +
  'shadow-[0_30px_60px_-28px_rgba(31,41,55,0.25)] ' +
  'backdrop-blur-[14px] backdrop-saturate-150 text-center ' +
  'animate-login-pop ' +
  'max-[540px]:pt-8 max-[540px]:pl-[22px] max-[540px]:pr-[22px] max-[540px]:pb-[26px] max-[540px]:rounded-[18px]';

const EYEBROW_CLASS =
  'inline-flex items-center gap-2 bg-brand-blue-tint text-brand-blue ' +
  'py-1.5 pl-2.5 pr-3 rounded-full text-xs font-bold tracking-[.12em] uppercase mb-[18px]';

export function AuthCard({ eyebrow, title, subtitle, children, className }: Props) {
  return (
    <section className={`${CARD_CLASS} ${className ?? ''}`}>
      {eyebrow && (
        <span className={EYEBROW_CLASS}>
          <span className="inline-block w-2 h-2 rounded-full bg-brand-blue" aria-hidden="true" />
          {eyebrow}
        </span>
      )}
      <h1 className="text-[32px] font-extrabold text-ink tracking-[-0.02em] m-0 mb-2.5 max-[540px]:text-[26px]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14.5px] leading-[1.65] text-ink-soft m-0 mb-7">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

// Divider with optional center label, used between card actions.
// Mirrors .login-divider + its ::before/::after lines.
type DividerProps = { children?: ReactNode };
export function Divider({ children }: DividerProps) {
  return (
    <div className="flex items-center gap-3 mt-[22px] mb-4 text-ink-soft text-xs tracking-[.12em] uppercase">
      <span aria-hidden="true" className="flex-1 h-px bg-ink/10" />
      {children && <span>{children}</span>}
      <span aria-hidden="true" className="flex-1 h-px bg-ink/10" />
    </div>
  );
}
