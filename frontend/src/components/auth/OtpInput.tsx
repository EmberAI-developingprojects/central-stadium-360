import {
  useRef,
  useEffect,
  type ClipboardEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
};

const BOX_CLS =
  "w-12 h-14 max-[420px]:w-10 max-[420px]:h-12 rounded-xl bg-white text-ink text-center text-[22px] font-bold tabular-nums outline-none border border-solid border-[rgba(31,41,55,0.14)] [transition:border-color_.2s_ease,box-shadow_.2s_ease,transform_.1s_ease] hover:border-[rgba(34,48,198,0.30)] focus:border-brand-blue focus:shadow-[0_0_0_4px_rgba(34,48,198,0.12)] focus:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed";

const BOX_FILLED_CLS = "!border-brand-blue/50 bg-brand-blue-tint/40";

const WRAP_CLS = "flex justify-center gap-2 max-[420px]:gap-1.5";

export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = false,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const setDigit = (idx: number, ch: string) => {
    const arr = value.padEnd(length, " ").slice(0, length).split("");
    arr[idx] = ch;
    const next = arr.join("").replace(/ /g, "").slice(0, length);
    onChange(next);
    if (next.length === length && onComplete) onComplete(next);
  };

  const focusIdx = (idx: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, idx))];
    el?.focus();
    el?.select();
  };

  const onInputChange = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(idx, " ");
      return;
    }
    if (raw.length === 1) {
      setDigit(idx, raw);
      if (idx < length - 1) focusIdx(idx + 1);
      return;
    }
    const slice = raw.slice(0, length - idx);
    const arr = value.padEnd(length, " ").slice(0, length).split("");
    for (let i = 0; i < slice.length; i++) arr[idx + i] = slice[i];
    const next = arr.join("").replace(/ /g, "").slice(0, length);
    onChange(next);
    const nextIdx = Math.min(length - 1, idx + slice.length);
    focusIdx(nextIdx);
    if (next.length === length && onComplete) onComplete(next);
  };

  const onKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[idx] !== " ") {
        setDigit(idx, " ");
        return;
      }
      if (idx > 0) {
        e.preventDefault();
        setDigit(idx - 1, " ");
        focusIdx(idx - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusIdx(idx - 1);
      return;
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      focusIdx(idx + 1);
      return;
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const next = text.slice(0, length);
    onChange(next);
    focusIdx(Math.min(length - 1, next.length));
    if (next.length === length && onComplete) onComplete(next);
  };

  return (
    <div className={WRAP_CLS} role="group" aria-label={`${length}-digit code`}>
      {Array.from({ length }).map((_, idx) => {
        const ch = digits[idx];
        const filled = ch && ch !== " ";
        return (
          <input
            key={idx}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={idx === 0 ? "one-time-code" : "off"}
            maxLength={1}
            pattern="[0-9]"
            disabled={disabled}
            value={filled ? ch : ""}
            onChange={(e) => onInputChange(idx, e)}
            onKeyDown={(e) => onKeyDown(idx, e)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            className={`${BOX_CLS}${filled ? " " + BOX_FILLED_CLS : ""}`}
            aria-label={`Digit ${idx + 1}`}
          />
        );
      })}
    </div>
  );
}
