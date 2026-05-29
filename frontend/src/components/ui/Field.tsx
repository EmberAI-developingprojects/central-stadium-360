// Field primitive — wraps the .login-field label / input / hint structure.
//
// Layout-only: the caller supplies the actual <input> / <textarea> / <select>
// as children so password toggles, phone prefixes, etc. can live alongside.

import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, className, children }: Props) {
  return (
    <label className={`flex flex-col gap-1.5 text-left ${className ?? ''}`}>
      <span className="text-[12.5px] font-semibold text-ink tracking-[.02em]">{label}</span>
      {children}
      {hint && (
        <span className="text-[11.5px] text-ink-soft mt-0.5 leading-[1.4]">{hint}</span>
      )}
    </label>
  );
}

// Shared input class so a bare <input> matches .login-input visually.
// Phase 2 will likely fold this into a <TextInput> component.
export const INPUT_CLASS =
  'w-full h-[46px] px-4 rounded-xl border border-ink/[0.14] bg-white font-[inherit] ' +
  'text-[14.5px] text-ink outline-none ' +
  'transition-[border-color,box-shadow] duration-200 ' +
  'placeholder:text-[#b3b8c2] ' +
  'hover:border-brand-blue/30 ' +
  'focus:border-brand-blue focus:shadow-[0_0_0_4px_rgba(34,48,198,0.12)]';
