// node --test test/  (runs against the built dist/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ticketSpec } from '../dist/print/layout.js';

const base = {
    orderRef: 'ORD-1',
    code: 'NS-ABCDEF0123456789',
    event: 'Мөсөн гулгуур',
    zone: '38',
    quantity: 1,
    price: 15000,
    startsAt: '2026-11-26T02:00:00Z',
    purchasedAt: '2026-11-26T02:05:00Z',
    venue: 'Төв цэнгэлдэх',
    qrData: 'NS-ABCDEF0123456789',
};
const kv = (spec) => Object.fromEntries(spec.blocks.filter((b) => b.type === 'kv').map((b) => [b.k, b.v]));
const texts = (spec) => spec.blocks.filter((b) => b.type === 'text').map((b) => b.text);

test('a rink slip shows size, duration and the masked phone, not a match date', () => {
    const spec = ticketSpec({ ...base, rink: { durationMinutes: 120, phoneMasked: '99**22 34' } });
    const rows = kv(spec);
    assert.equal(rows['Гутлын размер'], '38');
    assert.equal(rows['Гулгах хугацаа'], '2 цаг');
    assert.equal(rows['Утас'], '99**22 34');
    assert.equal(rows['Тоглолтын огноо'], undefined);
    assert.equal(rows['Бүс'], undefined);
    assert.ok(texts(spec).includes('МӨСӨН ГУЛГУУРЫН ТАСАЛБАР'));
    assert.ok(texts(spec).some((t) => t.includes('уншуулснаас эхэлнэ')));
    const qr = spec.blocks.find((b) => b.type === 'qr');
    assert.equal(qr.data, base.qrData);
});

test('a rink slip handles odd durations and a missing phone', () => {
    const rows = kv(ticketSpec({ ...base, rink: { durationMinutes: 90, phoneMasked: null } }));
    assert.equal(rows['Гулгах хугацаа'], '90 минут');
    assert.equal(rows['Утас'], undefined);
});

test('the compact rink slip drops price and purchase time (the receipt repeats them)', () => {
    const rows = kv(ticketSpec({ ...base, compact: true, rink: { durationMinutes: 60, phoneMasked: '88**22 33' } }));
    assert.equal(rows['Үнэ'], undefined);
    assert.equal(rows['Худалдан авсан'], undefined);
    assert.equal(rows['Гулгах хугацаа'], '1 цаг');
});

test('a match ticket is unchanged', () => {
    const spec = ticketSpec({ ...base, event: 'Наадам', zone: 'VIP' });
    const rows = kv(spec);
    assert.equal(rows['Арга хэмжээ'], 'Наадам');
    assert.equal(rows['Бүс'], 'VIP');
    assert.ok(rows['Тоглолтын огноо']);
    assert.ok(texts(spec).includes('НЭВТРЭХ ТАСАЛБАР'));
    assert.equal(rows['Гутлын размер'], undefined);
});
