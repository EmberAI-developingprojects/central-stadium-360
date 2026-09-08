function mnt(n) {
    return `${Math.round(n).toLocaleString('en-US')}₮`;
}
/** Tax lines keep 2 decimals — VAT is 1/11 of an inclusive price, never round. */
function tax(n) {
    return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}₮`;
}
function dt(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function trimTrailingSpace(blocks) {
    let end = blocks.length;
    while (end > 0 && blocks[end - 1].type === 'space')
        end--;
    return blocks.slice(0, end);
}
/**
 * Join several documents onto ONE slip so a purchase comes out as a single
 * piece of paper instead of a ticket plus a separate receipt. Every section but
 * the last loses its trailing cutter margin — that 14mm tail only earns its
 * place at the very end, where the guillotine actually sits.
 */
export function combineSpecs(title, specs) {
    const parts = specs.filter((s) => s.blocks.length > 0);
    const blocks = [];
    parts.forEach((s, i) => {
        const last = i === parts.length - 1;
        blocks.push(...(last ? s.blocks : trimTrailingSpace(s.blocks)));
        if (!last) {
            blocks.push({ type: 'space', mm: 3 }, { type: 'rule' }, { type: 'space', mm: 3 });
        }
    });
    return { title, blocks };
}
export function ticketSpec(t) {
    const blocks = [
        { type: 'text', text: t.venue, align: 'center', size: 'lg', bold: true },
        { type: 'text', text: 'НЭВТРЭХ ТАСАЛБАР', align: 'center', size: 'sm' },
        { type: 'rule' },
        { type: 'kv', k: 'Арга хэмжээ', v: t.event },
        { type: 'kv', k: 'Бүс', v: t.zone },
        // Single-ticket orders read "1 ширхэг"; multi-ticket orders keep the
        // "2 / 3" numbering so gate staff can tell the physical tickets apart.
        { type: 'kv', k: 'Тасалбар', v: t.seq ?? `${t.quantity} ширхэг` },
    ];
    if (t.price != null && !t.compact)
        blocks.push({ type: 'kv', k: 'Үнэ', v: mnt(t.price) });
    blocks.push({ type: 'kv', k: 'Тоглолтын огноо', v: dt(t.startsAt) });
    if (t.purchasedAt && !t.compact)
        blocks.push({ type: 'kv', k: 'Худалдан авсан', v: dt(t.purchasedAt) });
    // Below the QR: the short ticket code only. The trailing space is deliberately
    // large — a thermal printer's cutter sits ~12mm past the print head, so a
    // short tail gets the last printed lines guillotined mid-document.
    blocks.push({ type: 'space', mm: 2 }, { type: 'qr', data: t.qrData, sizeMm: t.compact ? 34 : 38 }, { type: 'text', text: t.code ?? t.qrData, align: 'center', size: 'md', bold: true }, { type: 'space', mm: 14 });
    return { title: `Ticket ${t.orderRef}`, blocks };
}
export function receiptSpec(r) {
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
    if (r.merchantName && !r.compact) {
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
    if (r.id) {
        // Long fiscal ids wrap across the full width, so the key would print
        // over the value in a shared kv row — stack them instead.
        blocks.push({ type: 'text', text: 'ДДТД', align: 'left', size: 'sm' });
        blocks.push({ type: 'text', text: r.id, align: 'left', size: 'sm', bold: true });
    }
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
        blocks.push({ type: 'kv', k: 'НӨАТ (10%)', v: tax(totalVAT) });
    if (r.totalCityTax && r.totalCityTax > 0)
        blocks.push({ type: 'kv', k: 'НХАТ', v: tax(r.totalCityTax) });
    blocks.push({ type: 'rule' });
    blocks.push({ type: 'text', text: `НИЙТ ДҮН   ${mnt(total)}`, align: 'right', size: 'md', bold: true });
    blocks.push({ type: 'space', mm: 1 });
    blocks.push({ type: 'kv', k: 'Төлбөрийн хэлбэр', v: paymentLabel });
    blocks.push({ type: 'space', mm: 2 });
    if (r.ebarimtQrData)
        blocks.push({ type: 'qr', data: r.ebarimtQrData, sizeMm: r.compact ? 36 : 40 });
    if (r.ebarimtLottery) {
        blocks.push({ type: 'space', mm: 1 });
        blocks.push({ type: 'text', text: 'Сугалааны дугаар', align: 'center', size: 'sm' });
        blocks.push({ type: 'text', text: r.ebarimtLottery, align: 'center', size: 'xl', bold: true });
    }
    if (!r.compact) {
        blocks.push({ type: 'space', mm: 2 });
        blocks.push({ type: 'text', text: 'И-Баримт аппаар уншуулж', align: 'center', size: 'sm' });
        blocks.push({ type: 'text', text: 'баталгаажуулна уу', align: 'center', size: 'sm' });
        if (r.orderRef) {
            blocks.push({ type: 'space', mm: 1 });
            blocks.push({ type: 'text', text: `Захиалга: ${r.orderRef}`, align: 'center', size: 'sm' });
        }
    }
    // Cutter offset — see ticketSpec: a short tail loses the last lines.
    blocks.push({ type: 'space', mm: 14 });
    return { title: `И-Баримт ${r.orderRef ?? r.id ?? ''}`.trim(), blocks };
}
//# sourceMappingURL=layout.js.map