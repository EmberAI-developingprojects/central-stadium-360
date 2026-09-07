import { QRCodeSVG } from "qrcode.react";

export function EbarimtQR({
  value,
  lottery,
  size = 132,
  onLight = false,
}: {
  value: string;
  lottery?: string | null;
  size?: number;
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
