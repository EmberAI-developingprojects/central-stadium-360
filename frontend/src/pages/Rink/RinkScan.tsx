import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import type { RinkOvertimeInvoice, RinkScanResult, RinkScanVerdict, RinkTicketView } from "@cs360/shared";
import { api } from "../../lib/api";
import { useQrCamera } from "../../lib/useQrCamera";
import { mnt, ubClock } from "./format";

type Tone = "ok" | "warn" | "bad" | "info";

const VERDICTS: Record<RinkScanVerdict, { title: string; tone: Tone }> = {
  started: { title: "ЦАГ ЭХЭЛЛЭЭ", tone: "ok" },
  just_started: { title: "САЯХАН ЭХЭЛСЭН", tone: "info" },
  finished: { title: "ЦАГТАА ДУУСЛАА", tone: "ok" },
  overdue: { title: "ЦАГ ХЭТЭРСЭН", tone: "warn" },
  already_done: { title: "ДУУССАН ТАСАЛБАР", tone: "bad" },
  expired: { title: "ХҮЧИНТЭЙ ХУГАЦАА ДУУССАН", tone: "bad" },
  voided: { title: "ХҮЧИНГҮЙ ТАСАЛБАР", tone: "bad" },
  not_found: { title: "ТАСАЛБАР ОЛДСОНГҮЙ", tone: "bad" },
  not_rink: { title: "МӨСӨН ГУЛГУУРЫН ТАСАЛБАР БИШ", tone: "bad" },
};

const TONE_CLS: Record<Tone, string> = {
  ok: "bg-emerald-500 text-white",
  warn: "bg-amber-400 text-amber-950",
  bad: "bg-red-500 text-white",
  info: "bg-sky-500 text-white",
};

function detail(verdict: RinkScanVerdict, t: RinkTicketView | null): string {
  if (!t) return "";
  switch (verdict) {
    case "started":
      return `${ubClock(t.ends_at)}-д дуусна · ${t.duration_minutes} минут`;
    case "just_started":
      return `Цаг нь ${ubClock(t.started_at)}-д эхэлсэн. Гарахдаа дахин уншуулна.`;
    case "finished":
      return "Гутлыг хүлээн авна уу.";
    case "overdue":
      return `${t.overtime_minutes} минут хэтэрсэн · ${mnt(t.overtime_amount)}`;
    case "already_done":
      return t.overtime_paid_via
        ? `${ubClock(t.ended_at)}-д дууссан · нэмэлт ${mnt(t.overtime_amount)} (${t.overtime_paid_via === "cash" ? "бэлэн" : "QPay"})`
        : `${ubClock(t.ended_at)}-д дууссан`;
    case "expired":
      return "Худалдаж авсан өдөртөө уншуулаагүй тасалбар.";
    default:
      return "";
  }
}

function errorText(status: number): string {
  if (status === 0) return "Сүлжээнд холбогдож чадсангүй. Дахин оролдоно уу.";
  if (status === 401 || status === 403) return "Эрх хүрэлцэхгүй байна. Дахин нэвтэрнэ үү.";
  return "Алдаа гарлаа. Дахин оролдоно уу.";
}

type Payment =
  | { kind: "none" }
  | { kind: "qpay"; invoice: RinkOvertimeInvoice }
  | { kind: "confirm_cash" };

export default function RinkScan() {
  const [result, setResult] = useState<RinkScanResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [payment, setPayment] = useState<Payment>({ kind: "none" });
  const busyRef = useRef(false);

  const submit = useCallback(async (code: string) => {
    if (busyRef.current || !code) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setPayment({ kind: "none" });
    const res = await api.scanner.scan(code);
    busyRef.current = false;
    setBusy(false);
    if (!res.ok) {
      setResult(null);
      setError(res.status === 400 ? "Тасалбарын код буруу байна." : errorText(res.status));
      navigator.vibrate?.([70, 40, 70]);
      return;
    }
    setResult(res.data);
    const tone = VERDICTS[res.data.verdict].tone;
    navigator.vibrate?.(tone === "ok" ? 60 : [70, 40, 70]);
  }, []);

  const cam = useQrCamera((code) => void submit(code));

  const next = () => {
    setResult(null);
    setError("");
    setPayment({ kind: "none" });
    cam.rearm();
  };

  const ticket = result?.ticket ?? null;
  const owes = result?.verdict === "overdue" && ticket?.status === "overdue";

  // While a QPay QR is on screen, poll until the payment lands.
  useEffect(() => {
    if (payment.kind !== "qpay" || !ticket) return;
    let alive = true;
    const timer = setInterval(async () => {
      const res = await api.scanner.overtimeStatus(ticket.code);
      if (!alive || !res.ok) return;
      if (res.data.status === "done") {
        setResult({ verdict: "already_done", code: ticket.code, ticket: res.data });
        setPayment({ kind: "none" });
        navigator.vibrate?.(60);
      }
    }, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [payment.kind, ticket]);

  const payQPay = async () => {
    if (!ticket) return;
    setBusy(true);
    const res = await api.scanner.overtimeQPay(ticket.code);
    setBusy(false);
    if (!res.ok) return setError(res.error === "qpay_not_configured" ? "QPay тохируулагдаагүй байна." : errorText(res.status));
    setPayment({ kind: "qpay", invoice: res.data });
  };

  const payCash = async () => {
    if (!ticket) return;
    setBusy(true);
    const res = await api.scanner.overtimeCash(ticket.code);
    setBusy(false);
    if (!res.ok) return setError(errorText(res.status));
    setResult({ verdict: "already_done", code: ticket.code, ticket: res.data });
    setPayment({ kind: "none" });
  };

  const onManual = (e: FormEvent) => {
    e.preventDefault();
    const code = manual.trim().toUpperCase();
    setManual("");
    void submit(code);
  };

  const v = result ? VERDICTS[result.verdict] : null;
  const settledNow = result?.verdict === "already_done" && ticket?.overtime_paid_via;

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Link to="/scanner" className="rounded-lg border border-solid border-white/15 px-3 py-2 text-[13px] text-white/80 no-underline">
          ← Буцах
        </Link>
        <h1 className="text-[16px] font-semibold m-0">Тасалбар уншуулах</h1>
      </header>

      <main className="flex-1 w-full max-w-[520px] mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
          <video ref={cam.videoRef} playsInline muted className="w-full h-full object-cover" />
          {cam.camera !== "running" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <button
                type="button"
                onClick={() => void cam.start()}
                disabled={cam.camera === "starting"}
                className="rounded-xl bg-white text-zinc-950 border-0 cursor-pointer font-semibold px-6 py-4 text-[16px]"
              >
                {cam.camera === "starting" ? "Камер асааж байна…" : "Камер асаах"}
              </button>
            </div>
          )}
          {cam.camera === "running" && (
            <div className="pointer-events-none absolute inset-[18%] border-[3px] border-white/70 rounded-2xl" />
          )}
        </div>
        {cam.error && <p className="text-[13.5px] text-red-300 m-0">{cam.error}</p>}

        <form onSubmit={onManual} className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Кодыг гараар оруулах (NS-…)"
            autoCapitalize="characters"
            className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-[15px] text-white placeholder:text-white/40"
          />
          <button type="submit" disabled={busy || !manual.trim()} className="rounded-xl bg-white text-zinc-950 border-0 cursor-pointer font-semibold px-5">
            Шалгах
          </button>
        </form>

        {busy && !result && <p className="text-center text-white/60 m-0">Шалгаж байна…</p>}
        {error && (
          <div role="alert" className="rounded-2xl bg-red-500 text-white p-5 text-[15px] font-medium">
            {error}
          </div>
        )}

        {result && v && (
          <section role="status" className="rounded-2xl overflow-hidden bg-white text-zinc-950">
            <div className={`${TONE_CLS[settledNow ? "ok" : v.tone]} px-5 py-5`}>
              <div className="text-[22px] font-extrabold tracking-tight">
                {settledNow ? "ТӨЛБӨР ТӨЛӨГДЛӨӨ" : v.title}
              </div>
              <div className="text-[15px] mt-1 opacity-90">{detail(result.verdict, ticket)}</div>
            </div>
            {ticket && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 text-[14px] m-0">
                <dt className="text-zinc-500">Утас</dt>
                <dd className="m-0 font-semibold">{ticket.phone_masked ?? "—"}</dd>
                <dt className="text-zinc-500">Гутал</dt>
                <dd className="m-0 font-semibold">{ticket.size}</dd>
                <dt className="text-zinc-500">Эхэлсэн</dt>
                <dd className="m-0 font-semibold">{ubClock(ticket.started_at)}</dd>
                <dt className="text-zinc-500">Дуусах</dt>
                <dd className="m-0 font-semibold">{ubClock(ticket.ends_at)}</dd>
                <dt className="text-zinc-500">Код</dt>
                <dd className="m-0 font-mono text-[12.5px]">{ticket.code}</dd>
              </dl>
            )}

            {owes && payment.kind === "none" && (
              <div className="px-5 pb-5 flex flex-col gap-2">
                <div className="text-center text-[30px] font-extrabold my-1">{mnt(ticket?.overtime_amount)}</div>
                <button type="button" onClick={() => void payQPay()} disabled={busy} className="rounded-xl bg-zinc-950 text-white border-0 cursor-pointer font-semibold py-4 text-[16px]">
                  QPay-ээр төлөх
                </button>
                <button type="button" onClick={() => setPayment({ kind: "confirm_cash" })} disabled={busy} className="rounded-xl bg-white border-2 border-solid border-zinc-950 font-semibold py-4 text-[16px] cursor-pointer">
                  Бэлнээр төлсөн
                </button>
                {/* Unpaid sessions stay listed on the admin page until settled. */}
                <button type="button" onClick={next} className="bg-transparent border-0 cursor-pointer text-[13.5px] text-zinc-500 underline mt-1">
                  Хаах (төлбөр хүлээгдэж буй хэвээр үлдэнэ)
                </button>
              </div>
            )}

            {owes && payment.kind === "confirm_cash" && (
              <div className="px-5 pb-5 flex flex-col gap-2">
                <p className="m-0 text-center text-[15px]">
                  <strong>{mnt(ticket?.overtime_amount)}</strong> бэлнээр хүлээн авсан уу?
                </p>
                <button type="button" onClick={() => void payCash()} disabled={busy} className="rounded-xl bg-emerald-600 text-white border-0 cursor-pointer font-semibold py-4 text-[16px]">
                  Тийм, хүлээн авсан
                </button>
                <button type="button" onClick={() => setPayment({ kind: "none" })} className="rounded-xl bg-white border border-solid border-zinc-300 font-medium py-3 cursor-pointer">
                  Болих
                </button>
              </div>
            )}

            {owes && payment.kind === "qpay" && (
              <div className="px-5 pb-5 flex flex-col items-center gap-3">
                <div className="text-[26px] font-extrabold">{mnt(payment.invoice.amount)}</div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <QRCodeSVG value={payment.invoice.qr_text} size={240} level="M" />
                </div>
                <p className="m-0 text-[14px] text-zinc-500 text-center">Банкны аппаар уншуулж төлнө үү. Төлөгдмөгц автоматаар шинэчлэгдэнэ.</p>
                <button type="button" onClick={() => setPayment({ kind: "confirm_cash" })} className="bg-transparent border-0 cursor-pointer text-[14px] underline text-zinc-600">
                  Оронд нь бэлнээр төлсөн
                </button>
              </div>
            )}

            {!owes && (
              <div className="px-5 pb-5">
                <button type="button" onClick={next} className="w-full rounded-xl bg-zinc-950 text-white border-0 cursor-pointer font-semibold py-4 text-[16px]">
                  Дараагийн тасалбар
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
