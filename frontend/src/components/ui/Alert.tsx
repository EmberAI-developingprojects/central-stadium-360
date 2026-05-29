// Alert primitive — mirrors .reg-alert / .reg-alert.is-ok.

import type { ReactNode } from 'react';

type Props = {
  kind?: 'error' | 'ok';
  /** When true the alert is rendered hidden (matches the existing `hidden` attr pattern). */
  hidden?: boolean;
  /** "alert" (default for errors) or "status" (for non-interrupting confirmations). */
  role?: 'alert' | 'status';
  className?: string;
  children: ReactNode;
};

const BASE =
  'block px-3.5 py-2.5 rounded-[10px] text-[13px] leading-[1.45] ' +
  'border';

const KIND: Record<'error' | 'ok', string> = {
  error:
    'bg-[#FEE7E7] border-[#F5C2C2] text-[#9B1C1C]',
  ok:
    'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
};

export function Alert({ kind = 'error', hidden, role, className, children }: Props) {
  return (
    <div
      role={role ?? (kind === 'ok' ? 'status' : 'alert')}
      hidden={hidden}
      className={`${BASE} ${KIND[kind]} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
