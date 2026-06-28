import type { ReactNode } from "react";

type Variant = "default" | "search" | "error";

export function EmptyState({
  title,
  description,
  variant = "default",
  icon,
  action,
}: {
  title: string;
  description?: ReactNode;
  variant?: Variant;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const accent =
    variant === "error"
      ? "bg-red-50 text-red-600 ring-red-100"
      : variant === "search"
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : "bg-zinc-100 text-zinc-500 ring-zinc-200";

  return (
    <div className="py-14 px-6 text-center bg-white border border-dashed border-[#e4e4e7] rounded-xl">
      <div
        className={`mx-auto mb-4 grid place-items-center h-12 w-12 rounded-full ring-1 ring-inset ${accent}`}
        aria-hidden="true"
      >
        {icon || <DefaultIcon variant={variant} />}
      </div>
      <strong className="block text-zinc-900 mb-1.5 font-semibold text-[14.5px] tracking-[-0.01em]">
        {title}
      </strong>
      {description && (
        <p className="m-0 text-zinc-500 text-[13px] leading-[1.55] max-w-[420px] mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 inline-flex items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

function DefaultIcon({ variant }: { variant: Variant }) {
  if (variant === "search") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7h18M3 12h18M3 17h12" />
    </svg>
  );
}
