import type { PrintBlock, PrintSpec } from './winprint.js';

/** Format MNT as a grouped integer with the tugrik sign. */
function mnt(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')}₮`;
}

/** Compact local date-time for the kiosk (Mongolia). */
function dt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface TicketInput {
  orderRef: string;
  event: string;
  zone: string;
  quantity: number;
  startsAt: string;
  venue: string;
  qrData: string;
}

/** The stadium entry ticket (gate-validation QR). */
export function ticketSpec(t: TicketInput): PrintSpec {
  const blocks: PrintBlock[] = [
    { type: 'text', text: t.venue, align: 'center', size: 'lg', bold: true },
    { type: 'text', text: 'ОРЦНЫ ТАСАЛБАР', align: 'center', size: 'sm' },
    { type: 'rule' },
    { type: 'kv', k: 'Арга хэмжээ', v: t.event },
    { type: 'kv', k: 'Бүс', v: t.zone },
    { type: 'kv', k: 'Тоо ширхэг', v: String(t.quantity) },
    { type: 'kv', k: 'Огноо', v: dt(t.startsAt) },
    { type: 'space', mm: 2 },
    { type: 'qr', data: t.qrData, sizeMm: 38 },
    { type: 'text', text: t.orderRef, align: 'center', size: 'sm' },
    { type: 'text', text: 'Хаалган дээр уг QR кодыг уншуулна уу', align: 'center', size: 'sm' },
    { type: 'space', mm: 4 },
  ];
  return { title: `Ticket ${t.orderRef}`, blocks };
}

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ReceiptInput {
  orderRef: string;
  lines: ReceiptLine[];
  total: number;
  ebarimtQrData: string;
  ebarimtLottery: string;
}

/** The И-Баримт fiscal receipt. */
export function receiptSpec(r: ReceiptInput): PrintSpec {
  const blocks: PrintBlock[] = [
    { type: 'text', text: 'И-БАРИМТ', align: 'center', size: 'lg', bold: true },
    { type: 'rule' },
  ];
  for (const l of r.lines) {
    blocks.push({ type: 'kv', k: `${l.name} × ${l.qty}`, v: mnt(l.qty * l.unitPrice) });
  }
  blocks.push(
    { type: 'rule' },
    { type: 'text', text: `Нийт: ${mnt(r.total)}`, align: 'right', size: 'md', bold: true },
    { type: 'space', mm: 2 },
    { type: 'qr', data: r.ebarimtQrData, sizeMm: 36 },
  );
  if (r.ebarimtLottery) {
    blocks.push({ type: 'text', text: `Сугалаа: ${r.ebarimtLottery}`, align: 'center', size: 'md', bold: true });
  }
  blocks.push(
    { type: 'text', text: 'И-Баримт аппаар уншуулж баталгаажуулна уу', align: 'center', size: 'sm' },
    { type: 'space', mm: 4 },
  );
  return { title: `И-Баримт ${r.orderRef}`, blocks };
}
