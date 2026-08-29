/** Format MNT as a grouped integer with the tugrik sign. */
function mnt(n) {
    return `${Math.round(n).toLocaleString('en-US')}₮`;
}
/** Compact local date-time for the kiosk (Mongolia). */
function dt(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
/** The stadium entry ticket (gate-validation QR). */
export function ticketSpec(t) {
    const blocks = [
        { type: 'text', text: t.venue, align: 'center', size: 'lg', bold: true },
        { type: 'text', text: 'ОРЦНЫ ТАСАЛБАР', align: 'center', size: 'sm' },
        { type: 'rule' },
        { type: 'kv', k: 'Арга хэмжээ', v: t.event },
        { type: 'kv', k: 'Бүс', v: t.zone },
        // seq ("2/3") reads better for the buyer than a bare quantity when the
        // order printed several tickets; falls back to the legacy count.
        { type: 'kv', k: 'Тасалбар', v: t.seq ?? String(t.quantity) },
    ];
    if (t.price != null)
        blocks.push({ type: 'kv', k: 'Үнэ', v: mnt(t.price) });
    blocks.push({ type: 'kv', k: 'Тоглолтын огноо', v: dt(t.startsAt) });
    if (t.purchasedAt)
        blocks.push({ type: 'kv', k: 'Худалдан авсан', v: dt(t.purchasedAt) });
    blocks.push({ type: 'space', mm: 2 }, { type: 'qr', data: t.qrData, sizeMm: 38 }, { type: 'text', text: t.orderRef, align: 'center', size: 'sm' }, { type: 'text', text: 'Хаалган дээр уг QR кодыг уншуулна уу', align: 'center', size: 'sm' }, { type: 'space', mm: 4 });
    return { title: `Ticket ${t.orderRef}`, blocks };
}
/**
 * И-Баримт fiscal receipt, laid out to Татварын Ерөнхий Газар's mandatory
 * template for POS-issued receipts. The receipt already has legal force at the
 * moment POSAPI 3.0 returns SUCCESS — this paper copy is what the buyer scans
 * with the E-Barimt mobile app or checks visually against.
 *
 * TEG's paper receipt requires:
 *   HEADER  : merchant legal name, TIN (ТТД), branch/district (5-digit), POS №
 *   META    : issue date+time, bill id (ДДТД), receipt type (B2C / B2B)
 *   ITEMS   : per-line — name, unit, qty × unitPrice = lineTotal, incl. VAT
 *   TOTALS  : subtotal, VAT (НӨАТ, 10%), city tax if any, grand total
 *   PAYMENT : method (card / cash / qpay)
 *   QR      : bill-verification QR (bill id + confirmation code embedded)
 *   LOTTERY : 5-digit сугалаа number (bold, large)
 *   FOOTER  : the "И-Баримт аппаар уншуулж баталгаажуулна уу" reminder
 *
 * `r.items` are the POSAPI-signed lines (each already carries totalAmount +
 * totalVAT). We print exactly what POSAPI accepted so the paper matches the
 * fiscal record byte-for-byte.
 */
export function receiptSpec(r) {
    // Fall back to legacy `lines` shape (unit + qty only) if the caller has not
    // been upgraded yet, so a mid-deploy request never crashes the printer.
    const items = r.items ?? (r.lines ?? []).map((l) => ({
        name: l.name, qty: l.qty, unitPrice: l.unitPrice,
        totalAmount: l.qty * l.unitPrice, totalVAT: 0, measureUnit: 'ширхэг',
    }));
    const subtotal = r.subtotal ?? items.reduce((s, i) => s + (i.totalAmount ?? i.qty * i.unitPrice), 0);
    const totalVAT = r.totalVAT ?? items.reduce((s, i) => s + (i.totalVAT ?? 0), 0);
    const total = r.total ?? subtotal;
    const paymentLabel = r.paymentLabel ?? 'Карт';
    const billTypeLabel = r.customerTin ? 'ААН (B2B)' : 'Иргэн (B2C)';

    const blocks = [];

    // --- Header: merchant identity -----------------------------------------
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

    // --- Meta: date + bill id ----------------------------------------------
    blocks.push({ type: 'kv', k: 'Огноо', v: dt(r.date ?? new Date().toISOString()) });
    if (r.id)
        blocks.push({ type: 'kv', k: 'ДДТД', v: r.id });
    blocks.push({ type: 'rule' });

    // --- Items: two-line per item for readability on 72mm paper ------------
    for (const it of items) {
        const unit = it.measureUnit ?? 'ширхэг';
        const line = `${it.name}`;
        const breakdown = `${it.qty} ${unit} × ${mnt(it.unitPrice)}`;
        blocks.push({ type: 'kv', k: line, v: mnt(it.totalAmount ?? it.qty * it.unitPrice) });
        blocks.push({ type: 'text', text: breakdown, align: 'right', size: 'sm' });
    }
    blocks.push({ type: 'rule' });

    // --- Totals ------------------------------------------------------------
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

    // --- QR + lottery ------------------------------------------------------
    if (r.ebarimtQrData)
        blocks.push({ type: 'qr', data: r.ebarimtQrData, sizeMm: 40 });
    if (r.ebarimtLottery) {
        blocks.push({ type: 'space', mm: 1 });
        blocks.push({ type: 'text', text: 'Сугалааны дугаар', align: 'center', size: 'sm' });
        blocks.push({ type: 'text', text: r.ebarimtLottery, align: 'center', size: 'xl', bold: true });
    }

    // --- Footer ------------------------------------------------------------
    blocks.push({ type: 'space', mm: 2 });
    blocks.push({ type: 'text', text: 'И-Баримт аппаар уншуулж', align: 'center', size: 'sm' });
    blocks.push({ type: 'text', text: 'баталгаажуулна уу', align: 'center', size: 'sm' });
    if (r.orderRef) {
        blocks.push({ type: 'space', mm: 1 });
        blocks.push({ type: 'text', text: `Захиалга: ${r.orderRef}`, align: 'center', size: 'sm' });
    }
    blocks.push({ type: 'space', mm: 4 });

    return { title: `И-Баримт ${r.orderRef ?? r.id ?? ''}`.trim(), blocks };
}
//# sourceMappingURL=layout.js.map
