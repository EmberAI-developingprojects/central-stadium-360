import { QRCodeSVG } from "qrcode.react";

/**
 * Scannable eBarimt (PosAPI 3.0) fiscal-receipt QR for the buyer's 360 ticket.
 * `value` is the raw `qrData` string from the receipt; a customer scans it with
 * the e-barimt app to claim the receipt + lottery. Always rendered on a white
 * card so it stays scannable on the dark ticket pages and when printed.
 */
export function EbarimtQR({
  value,
  lottery,
  size = 132,
  onLight = false,
}: {
  value: string;
  lottery?: string | null;
  size?: number;
  /** Set on light-background pages (e.g. admin) so the caption stays legible. */
  onLight?: boolean;
}) {
  const labelCls = onLight
    ? "text-zinc-500"
    : "text-[rgba(255,255,255,0.55)] print:text-[#555]";
  const lotteryCls = onLight
    ? "text-zinc-900"
    : "text-[rgba(255,255,255,0.92)] print:text-black";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl bg-white p-3 print:border print:border-[#ccc]">
        <QRCodeSVG value={value} size={size} level="M" marginSize={0} />
      </div>
      <div className="text-center leading-tight">
        <div
          className={`text-[11px] uppercase tracking-[0.06em] ${labelCls}`}
        >
          И-баримт
        </div>
        {lottery && (
          <div className={`font-mono text-[13px] font-semibold ${lotteryCls}`}>
            {lottery}
          </div>
        )}
      </div>
    </div>
  );
}
