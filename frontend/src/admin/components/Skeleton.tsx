import type { CSSProperties } from "react";

const BASE_CLS =
  "block rounded-md bg-gradient-to-r from-zinc-100 via-zinc-200/70 to-zinc-100 bg-[length:200%_100%] animate-admin-shimmer";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={`${BASE_CLS} ${className}`} style={style} />;
}

export function SkeletonStatGrid({ count = 3 }: { count?: number }) {
  return (
    <div
      className={
        "grid gap-3 mb-5 " +
        (count === 4
          ? "[grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]"
          : count === 2
            ? "[grid-template-columns:repeat(2,minmax(0,1fr))] max-[980px]:[grid-template-columns:1fr]"
            : "[grid-template-columns:repeat(3,minmax(0,1fr))] max-[980px]:[grid-template-columns:repeat(2,minmax(0,1fr))]")
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#ececef] rounded-xl p-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24 mt-3" />
          <Skeleton className="h-3 w-32 mt-2.5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFilters() {
  return (
    <div className="flex gap-2.5 items-center flex-wrap mb-4">
      <Skeleton className="h-9 w-[260px]" />
      <Skeleton className="h-9 w-[280px]" />
      <Skeleton className="h-3 w-16 ml-auto" />
    </div>
  );
}

export function SkeletonTable({
  columns = 6,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="bg-white border border-[#ececef] rounded-xl overflow-hidden">
      <div className="grid gap-4 px-4 py-3 border-b border-[#ececef] bg-[#fafafa]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 px-4 py-4 border-b border-[#f4f4f5] last:border-b-0 items-center"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="flex items-center gap-2">
              {c === 0 && <Skeleton className="h-9 w-9 rounded-lg shrink-0" />}
              <Skeleton
                className="h-3"
                style={{ width: `${50 + ((r + c) % 4) * 10}%` }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label = "Уншиж байна…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="py-14 px-6 text-center bg-white border border-dashed border-[#e4e4e7] rounded-xl text-zinc-500 text-[13.5px]"
    >
      <span className="inline-flex items-center gap-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
          className="animate-spin text-zinc-400"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        {label}
      </span>
    </div>
  );
}

export function SkeletonCardList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 pr-4 bg-white border border-[#ececef] rounded-xl"
        >
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2 mt-2" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
