import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Variant = "default" | "danger" | "warning";

type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
  resolve?: (value: boolean) => void;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    title: "",
    open: false,
  });

  const confirm: ConfirmFn = useCallback((options) => {
    return new Promise((resolve) => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const handleClose = useCallback(
    (value: boolean) => {
      state.resolve?.(value);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    },
    [state.resolve],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant ?? "default"}
        onCancel={() => handleClose(false)}
        onConfirm={() => handleClose(true)}
      />
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant: Variant;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    // focus confirm button shortly after mount so layout is settled
    const id = window.setTimeout(() => confirmRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const accent =
    variant === "danger"
      ? "bg-red-50 text-red-600 ring-red-100"
      : variant === "warning"
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : "bg-zinc-100 text-zinc-700 ring-zinc-200";

  const confirmBtn =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-600"
      : variant === "warning"
        ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-amber-600"
        : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white border-zinc-900";

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-4 animate-admin-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-6 animate-admin-scale-in">
        <div className="flex items-start gap-4">
          <span
            className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset ${accent}`}
            aria-hidden="true"
          >
            <ConfirmIcon variant={variant} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="confirm-title"
              className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-zinc-900"
            >
              {title}
            </h3>
            {message ? (
              <div className="mt-1.5 text-[13.5px] leading-[1.55] text-zinc-600">
                {message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#e4e4e7] bg-white px-3.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-300"
          >
            {cancelLabel || "Болих"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-9 items-center justify-center rounded-md border px-3.5 text-[13px] font-medium transition-colors ${confirmBtn}`}
          >
            {confirmLabel || "Тийм"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmIcon({ variant }: { variant: Variant }) {
  if (variant === "danger") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
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
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
