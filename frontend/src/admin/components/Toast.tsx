import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
};

type ToastApi = {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback(
    (kind: ToastKind, message: string, duration?: number) => {
      const fallback = kind === "error" ? 5200 : 3200;
      const finalDuration = duration ?? fallback;
      const id = Date.now() + Math.random();
      setToasts((arr) => [...arr, { id, kind, message, duration: finalDuration }]);
    },
    [],
  );

  const remove = useCallback((id: number) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const api: ToastApi = {
    success: (m, d) => push("success", m, d),
    error: (m, d) => push("error", m, d),
    info: (m, d) => push("info", m, d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-4 right-4 z-[500] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastItemView key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemView({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  useEffect(() => {
    if (item.duration <= 0) return;
    const id = window.setTimeout(onClose, item.duration);
    return () => window.clearTimeout(id);
  }, [item.duration, onClose]);

  const style =
    item.kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : item.kind === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-zinc-200 bg-white text-zinc-800";

  const iconBg =
    item.kind === "success"
      ? "bg-emerald-100 text-emerald-700"
      : item.kind === "error"
        ? "bg-red-100 text-red-700"
        : "bg-zinc-100 text-zinc-700";

  const barColor =
    item.kind === "success"
      ? "bg-emerald-400/70"
      : item.kind === "error"
        ? "bg-red-400/70"
        : "bg-zinc-400/70";

  return (
    <div
      role="status"
      className={`pointer-events-auto relative flex items-start gap-2.5 min-w-[280px] max-w-[360px] rounded-lg border ${style} shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-2.5 pl-3 pr-2.5 animate-admin-slide-in-right overflow-hidden`}
    >
      <span
        className={`shrink-0 mt-px inline-flex h-5 w-5 items-center justify-center rounded-full ${iconBg}`}
        aria-hidden="true"
      >
        <ToastIcon kind={item.kind} />
      </span>
      <p className="flex-1 m-0 text-[13px] leading-[1.45] font-medium">
        {item.message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 -m-1 p-1 rounded text-current/60 hover:text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Хаах"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {item.duration > 0 && (
        <span
          aria-hidden="true"
          className={`absolute left-0 bottom-0 h-[2px] w-full origin-left ${barColor} animate-admin-toast-progress`}
          style={
            {
              ["--toast-duration" as string]: `${item.duration}ms`,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === "success") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (kind === "error") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
