

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'text';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'mt-1 h-12 inline-flex items-center justify-center gap-2.5 ' +
    'bg-brand-blue text-white border-0 rounded-xl text-[15px] font-bold tracking-[.01em] cursor-pointer ' +
    'shadow-[0_10px_24px_-10px_rgba(34,48,198,0.55)] ' +
    'transition-[background,transform,box-shadow] duration-200 ' +
    'hover:bg-brand-blue-soft hover:-translate-y-px hover:shadow-[0_16px_28px_-10px_rgba(34,48,198,0.65)] ' +
    'active:translate-y-0 ' +
    'disabled:opacity-75 disabled:cursor-default disabled:translate-y-0 disabled:shadow-none ' +
    '[&_svg]:w-4 [&_svg]:h-4 [&_svg]:transition-transform [&_svg]:duration-200 ' +
    'hover:[&_svg]:translate-x-[3px]',

  outline:
    'inline-flex items-center justify-center w-full h-[46px] ' +
    'rounded-xl border-[1.5px] border-brand-blue text-brand-blue bg-transparent ' +
    'text-[14.5px] font-bold no-underline cursor-pointer ' +
    'transition-[background,color,transform] duration-200 ' +
    'hover:bg-brand-blue hover:text-white hover:-translate-y-px ' +
    'disabled:opacity-60 disabled:cursor-default',

  ghost:
    'inline-flex items-center gap-2 text-sm font-semibold text-ink no-underline ' +
    'px-4 py-[9px] rounded-full bg-white/75 border border-ink/[0.08] ' +
    'backdrop-blur cursor-pointer ' +
    'transition-[background,color,transform,border-color] duration-200 ' +
    'hover:text-brand-blue hover:border-brand-blue/25 hover:bg-white hover:-translate-x-0.5 ' +
    '[&_svg]:w-[14px] [&_svg]:h-[14px]',

  text:
    'inline-block mt-[22px] text-[13px] text-ink-soft no-underline ' +
    'transition-colors duration-150 ' +
    'hover:text-brand-blue hover:underline',
};

export function buttonClass(variant: ButtonVariant, extra?: string): string {
  return extra ? `${VARIANT_CLASSES[variant]} ${extra}` : VARIANT_CLASSES[variant];
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
});

type ButtonLinkProps = Omit<LinkProps, 'className'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: ButtonVariant;
    className?: string;
    children?: ReactNode;
  };

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', className, children, to, ...rest },
  ref,
) {
  return (
    <Link ref={ref} to={to} className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  );
});
