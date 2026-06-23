import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { KioskEvent, KioskScanResult, ScanVerdict } from "@cs360/shared";
import { gate } from "../../lib/gate";

const KEY_LS = "gate.key";
const EVENT_LS = "gate.eventId";

type Verdict = {
  title: string;
  tone: "ok" | "warn" | "bad";
};

const VERDICTS: Record<ScanVerdict, Verdict> = {
  admitted: { title: "ОРОХ ЗӨВШӨӨРӨЛ", tone: "ok" },
  already_used: { title: "АЛЬ ХЭДИЙН НЭВТЭРСЭН", tone: "warn" },
  voided: { title: "ХҮЧИНГҮЙ ТАСАЛБАР", tone: "bad" },
  not_found: { title: "ТАСАЛБАР ОЛДСОНГҮЙ", tone: "bad" },
  wrong_event: { title: "ӨӨР АРГА ХЭМЖЭЭ", tone: "bad" },
};

const TONE_CLS: Record<Verdict["tone"], string> = {
  ok: "bg-emerald-500 text-white",
  warn: "bg-amber-400 text-amber-950",
  bad: "bg-red-500 text-white",
};

function clockTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

export default function Gate() {
  const [key, setKey] = useState<string>(
    () => localStorage.getItem(KEY_LS) ?? "",
  );
  const [events, setEvents] = useState<KioskEvent[] | null>(null);
  const [eventId, setEventId] = useState<string>(
    () => localStorage.getItem(EVENT_LS) ?? "",
  );
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [setupError, setSetupError] = useState("");

  const connect = useCallback(async (k: string) => {
    setConnecting(true);
    setSetupError("");
    const res = await gate.events(k);
    setConnecting(false);
    if (!res.ok) {
      setSetupError(
        res.status === 401
          ? "Түлхүүр буруу байна."
          : `Холбогдож чадсангүй (${res.error}).`,
      );
      return false;
    }
    localStorage.setItem(KEY_LS, k);
    setKey(k);
    setEvents(res.data);
    setEventId((cur) => {
      const next = cur && res.data.some((e) => e.id === cur) ? cur : res.data[0]?.id ?? "";
      if (next) localStorage.setItem(EVENT_LS, next);
      return next;
    });
    setReady(true);
    return true;
  }, []);

  // Auto-connect if a key was already stored on this device.
  useEffect(() => {
    if (key && !ready) void connect(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = () => {
    localStorage.removeItem(KEY_LS);
    setKey("");
    setReady(false);
    setEvents(null);
  };

  const onPickEvent = (id: string) => {
    setEventId(id);
    localStorage.setItem(EVENT_LS, id);
  };

  if (!ready) {
    return (
      <GateSetup
        connecting={connecting}
        error={setupError}
        onConnect={connect}
      />
    );
  }

  return (
    <Scanner
      gateKey={key}
      events={events ?? []}
      eventId={eventId}
      onPickEvent={onPickEvent}
      onDisconnect={disconnect}
    />
  );
}

function GateSetup({
  connecting,
  error,
  onConnect,
}: {
  connecting: boolean;
  error: string;
  onConnect: (key: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-[380px] flex flex-col gap-5">
        <div className="text-center">
          <div className="text-[13px] uppercase tracking-[.2em] text-zinc-500">
            Төв Цэнгэлдэх
          </div>
          <h1 className="text-[22px] font-semibold mt-1">Хаалга — тасалбар уншуулах</h1>
          <p className="text-[13px] text-zinc-400 mt-2">
            Энэ төхөөрөмжийн хаалганы түлхүүрийг оруулна уу.
          </p>
        </div>
        <input
          type="password"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) onConnect(draft.trim());
          }}
          placeholder="Хаалганы түлхүүр"
          className="h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-[15px] outline-none focus:border-zinc-600"
        />
        {error && (
          <div className="text-[13px] text-red-400 text-center">{error}</div>
        )}
        <button
          type="button"
          disabled={connecting || !draft.trim()}
          onClick={() => onConnect(draft.trim())}
          className="h-12 rounded-xl bg-white text-zinc-950 font-semibold text-[15px] disabled:opacity-40"
        >
          {connecting ? "Холбогдож байна…" : "Холбогдох"}
        </button>
      </div>
    </div>
  );
}

function Scanner({
  gateKey,
  events,
  eventId,
  onPickEvent,
  onDisconnect,
}: {
  gateKey: string;
  events: KioskEvent[];
  eventId: string;
  onPickEvent: (id: string) => void;
  onDisconnect: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<KioskScanResult | null>(null);
  const [history, setHistory] = useState<KioskScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => {
    focusInput();
  }, [focusInput, eventId]);

  const submit = async () => {
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    const res = await gate.scan(gateKey, value, eventId || null);
    setBusy(false);
    setCode("");
    focusInput();
    if (!res.ok) {
      // Surface transport/auth failures as a synthetic bad verdict.
      const synthetic: KioskScanResult = {
        verdict: "not_found",
        code: value,
        zone_name_mn: null,
        event_title: res.error === "unauthorized" ? "Түлхүүр буруу" : "Сүлжээний алдаа",
        used_at: null,
        admitted: 0,
        sold: 0,
      };
      setLast(synthetic);
      return;
    }
    const result = res.data;
    setLast(result);
    setHistory((h) => [result, ...h].slice(0, 10));
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(result.verdict === "admitted" ? 60 : [70, 40, 70]);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const v = last ? VERDICTS[last.verdict] : null;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      {/* Top bar: event binding + tally */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800 shrink-0">
        <span className="text-[12px] uppercase tracking-[.18em] text-zinc-500 hidden sm:inline">
          Хаалга
        </span>
        <select
          value={eventId}
          onChange={(e) => onPickEvent(e.target.value)}
          className="h-9 max-w-[60vw] px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[13px] text-white outline-none focus:border-zinc-600"
        >
          {events.length === 0 && <option value="">Арга хэмжээ алга</option>}
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-4">
          {last && last.sold > 0 && (
            <div className="text-right tabular-nums">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
                Нэвтэрсэн
              </div>
              <div className="text-[15px] font-semibold">
                {last.admitted}/{last.sold}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onDisconnect}
            className="h-9 px-3 rounded-lg border border-zinc-800 text-[12.5px] text-zinc-400 hover:text-white hover:border-zinc-600"
          >
            Салгах
          </button>
        </div>
      </header>

      {/* Result */}
      <main className="flex-1 grid place-items-center p-5">
        <div className="w-full max-w-[460px] flex flex-col gap-5">
          <div
            className={`rounded-2xl px-6 py-8 text-center transition-colors ${
              v ? TONE_CLS[v.tone] : "bg-zinc-900 text-zinc-500"
            }`}
          >
            {v && last ? (
              <>
                <div className="text-[26px] font-bold leading-tight tracking-tight">
                  {v.title}
                </div>
                <div className="text-[14px] opacity-90 mt-2">
                  {last.zone_name_mn ? `${last.zone_name_mn} · ` : ""}
                  {last.event_title ?? ""}
                </div>
                {last.verdict === "already_used" && last.used_at && (
                  <div className="text-[13px] opacity-90 mt-1">
                    Нэвтэрсэн: {clockTime(last.used_at)}
                  </div>
                )}
                <div className="font-mono text-[12px] opacity-75 mt-3 break-all">
                  {last.code}
                </div>
              </>
            ) : (
              <div className="text-[16px]">Тасалбар уншуулна уу</div>
            )}
          </div>

          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKey}
            onBlur={focusInput}
            disabled={!eventId}
            autoFocus
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Тасалбарын код…"
            className="h-14 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-[18px] font-mono tracking-wide text-center outline-none focus:border-zinc-600 disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !code.trim() || !eventId}
            className="h-12 rounded-xl bg-white text-zinc-950 font-semibold text-[15px] disabled:opacity-30"
          >
            {busy ? "Шалгаж байна…" : "Уншуулах"}
          </button>

          {history.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {history.map((h, i) => {
                const hv = VERDICTS[h.verdict];
                return (
                  <div
                    key={`${h.code}-${i}`}
                    className="flex items-center gap-2 text-[12.5px] py-1.5 px-3 rounded-lg bg-zinc-900/60"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        hv.tone === "ok"
                          ? "bg-emerald-400"
                          : hv.tone === "warn"
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                    />
                    <span className="font-mono text-zinc-400 truncate">{h.code}</span>
                    <span className="ml-auto text-zinc-500">{hv.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
