/** One renderable block of a thermal-printer document (consumed by winprint.ts / print_doc.ps1). */
export type PrintBlock =
    | { type: 'text'; text: string; align?: 'left' | 'center' | 'right'; size?: 'sm' | 'md' | 'lg' | 'xl'; bold?: boolean }
    | { type: 'kv'; k: string; v: string }
    | { type: 'rule' }
    | { type: 'space'; mm: number }
    | { type: 'qr'; data: string; sizeMm?: number };

/** A full printable document: title (spooler job name) + ordered blocks. */
export interface PrintSpec {
    title: string;
    blocks: PrintBlock[];
}

/** Input for the entry ticket (routes/print.ts TicketBody, cloudprint.ts). */
export interface TicketInput {
    orderRef: string;
    /** Short human-readable ticket code (the QR payload) printed under the QR. */
    code?: string;
    event: string;
    zone: string;
    quantity: number;
    /** "n / total" label for one physical ticket of a multi-ticket order. */
    seq?: string;
    price?: number | null;
    startsAt: string;
    purchasedAt?: string;
    venue: string;
    qrData: string;
}

/** Full receipt item as issued by POSAPI / built by cloudprint.ts. */
export interface ReceiptItem {
    name: string;
    qty: number;
    unitPrice: number;
    totalAmount?: number;
    totalVAT?: number;
    measureUnit?: string;
}

/** Minimal line shape accepted by routes/print.ts /receipt (no VAT breakdown). */
export interface ReceiptLine {
    name: string;
    qty: number;
    unitPrice: number;
}

/** Input for the И-Баримт fiscal receipt (routes/print.ts, routes/ebarimt.ts, cloudprint.ts). */
export interface ReceiptInput {
    orderRef?: string;
    /** ДДТД — fiscal receipt id from POSAPI. */
    id?: string;
    date?: string;
    merchantName?: string;
    merchantTin?: string;
    posNo?: string;
    districtCode?: string;
    branchNo?: string;
    customerTin?: string;
    items?: ReceiptItem[];
    lines?: ReceiptLine[];
    subtotal?: number;
    totalVAT?: number;
    totalCityTax?: number;
    total?: number;
    paymentLabel?: string;
    ebarimtQrData?: string;
    ebarimtLottery?: string;
}

function mnt(n: number): string {
    return `${Math.round(n).toLocaleString('en-US')}₮`;
}
function dt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function ticketSpec(t: TicketInput): PrintSpec {
    const blocks: PrintBlock[] = [
        { type: 'text', text: t.venue, align: 'center', size: 'lg', bold: true },
        { type: 'text', text: 'НЭВТРЭХ ТАСАЛБАР', align: 'center', size: 'sm' },
        { type: 'rule' },
        { type: 'kv', k: 'Арга хэмжээ', v: t.event },
        { type: 'kv', k: 'Бүс', v: t.zone },
        // Single-ticket orders read "1 ширхэг"; multi-ticket orders keep the
        // "2 / 3" numbering so gate staff can tell the physical tickets apart.
        { type: 'kv', k: 'Тасалбар', v: t.seq ?? `${t.quantity} ширхэг` },
    ];
    if (t.price != null)
        blocks.push({ type: 'kv', k: 'Үнэ', v: mnt(t.price) });
    blocks.push({ type: 'kv', k: 'Тоглолтын огноо', v: dt(t.startsAt) });
    if (t.purchasedAt)
        blocks.push({ type: 'kv', k: 'Худалдан авсан', v: dt(t.purchasedAt) });
    // Below the QR: the short ticket code only. The trailing space is deliberately
    // large — a thermal printer's cutter sits ~12mm past the print head, so a
    // short tail gets the last printed lines guillotined mid-document.
    blocks.push({ type: 'space', mm: 2 }, { type: 'qr', data: t.qrData, sizeMm: 38 }, { type: 'text', text: t.code ?? t.qrData, align: 'center', size: 'md', bold: true }, { type: 'space', mm: 14 });
    return { title: `Ticket ${t.orderRef}`, blocks };
}
export function receiptSpec(r: ReceiptInput): PrintSpec {
    const items: ReceiptItem[] = r.items ?? (r.lines ?? []).map((l) => ({
        name: l.name, qty: l.qty, unitPrice: l.unitPrice,
        totalAmount: l.qty * l.unitPrice, totalVAT: 0, measureUnit: 'ширхэг',
    }));
    const subtotal = r.subtotal ?? items.reduce((s, i) => s + (i.totalAmount ?? i.qty * i.unitPrice), 0);
    const totalVAT = r.totalVAT ?? items.reduce((s, i) => s + (i.totalVAT ?? 0), 0);
    const total = r.total ?? subtotal;
    const paymentLabel = r.paymentLabel ?? 'Карт';
    const billTypeLabel = r.customerTin ? 'ААН (B2B)' : 'Иргэн (B2C)';

    const blocks: PrintBlock[] = [];

    if (r.merchantName) {
        blocks.push({ type: 'text', text: r.merchantName.toUpperCase(), align: 'center', size: 'lg', bold: true });
    }
    blocks.push({ type: 'text', text: 'И-БАРИМТ', align: 'center', size: 'md', bold: true });
    blocks.push({ type: 'text', text: billTypeLabel, align: 'center', size: 'sm' });
    blocks.push({ type: 'rule' });
    if (r.merchantTin)
        blocks.push({ type: 'kv', k: 'ТТД', v: r.merchantTin });
    if (r.districtCode || r.branchNo) {
        blocks.push({ type: 'kv', k: 'Салбар', v: `${r.districtCode ?? ''}-${r.branchNo ?? ''}` });
    }
    if (r.posNo)
        blocks.push({ type: 'kv', k: 'Кассын №', v: r.posNo });
    if (r.customerTin)
        blocks.push({ type: 'kv', k: 'Худ.авагч ТТД', v: r.customerTin });
    blocks.push({ type: 'rule' });

    blocks.push({ type: 'kv', k: 'Огноо', v: dt(r.date ?? new Date().toISOString()) });
    if (r.id)
        blocks.push({ type: 'kv', k: 'ДДТД', v: r.id });
    blocks.push({ type: 'rule' });

    for (const it of items) {
        const unit = it.measureUnit ?? 'ширхэг';
        const line = `${it.name}`;
        const breakdown = `${it.qty} ${unit} × ${mnt(it.unitPrice)}`;
        blocks.push({ type: 'kv', k: line, v: mnt(it.totalAmount ?? it.qty * it.unitPrice) });
        blocks.push({ type: 'text', text: breakdown, align: 'right', size: 'sm' });
    }
    blocks.push({ type: 'rule' });

    blocks.push({ type: 'kv', k: 'Барааны дүн', v: mnt(subtotal) });
    if (totalVAT > 0)
        blocks.push({ type: 'kv', k: 'НӨАТ (10%)', v: mnt(totalVAT) });
    if (r.totalCityTax && r.totalCityTax > 0)
        blocks.push({ type: 'kv', k: 'НХАТ', v: mnt(r.totalCityTax) });
    blocks.push({ type: 'rule' });
    blocks.push({ type: 'text', text: `НИЙТ ДҮН   ${mnt(total)}`, align: 'right', size: 'md', bold: true });
    blocks.push({ type: 'space', mm: 1 });
    blocks.push({ type: 'kv', k: 'Төлбөрийн хэлбэр', v: paymentLabel });
    blocks.push({ type: 'space', mm: 2 });

    if (r.ebarimtQrData)
        blocks.push({ type: 'qr', data: r.ebarimtQrData, sizeMm: 40 });
    if (r.ebarimtLottery) {
        blocks.push({ type: 'space', mm: 1 });
        blocks.push({ type: 'text', text: 'Сугалааны дугаар', align: 'center', size: 'sm' });
        blocks.push({ type: 'text', text: r.ebarimtLottery, align: 'center', size: 'xl', bold: true });
    }

    blocks.push({ type: 'space', mm: 2 });
    blocks.push({ type: 'text', text: 'И-Баримт аппаар уншуулж', align: 'center', size: 'sm' });
    blocks.push({ type: 'text', text: 'баталгаажуулна уу', align: 'center', size: 'sm' });
    if (r.orderRef) {
        blocks.push({ type: 'space', mm: 1 });
        blocks.push({ type: 'text', text: `Захиалга: ${r.orderRef}`, align: 'center', size: 'sm' });
    }
    // Cutter offset — see ticketSpec: a short tail loses the last lines.
    blocks.push({ type: 'space', mm: 14 });

    return { title: `И-Баримт ${r.orderRef ?? r.id ?? ''}`.trim(), blocks };
}
