/* ---------------------------------------------------------------------------
   Central Stadium 360 — kiosk buying flow.

   Runs as a plain page served from the box (run_web_kiosk.ps1) and talks to two
   places, both through the local bridge on 127.0.0.1:1017:

     /cloud/*   → proxied to the cloud kiosk API (the bridge holds KIOSK_KEY,
                  so no credential is ever shipped into this page)
     /pos, /ebarimt, /print → the card terminal, PosAPI and the POS80 printer

   The buyer never sees an error they cannot act on: every failure ends on a
   screen with one large button that goes back to something useful.
   --------------------------------------------------------------------------- */
'use strict';

// The bridge always lives on the box. ?bridge=... exists so the flow can be
// driven against a stub while testing off-box; it is never set in the field.
var BRIDGE = new URLSearchParams(location.search).get('bridge') || 'http://127.0.0.1:1017';
var IDLE_MS = 90000;          // untouched this long → back to the event list
var QPAY_POLL_MS = 2000;
var QPAY_GIVE_UP_MS = 8 * 60 * 1000;
var PRINT_POLL_MS = 1000;
var PRINT_GIVE_UP_MS = 90000;

var app = document.getElementById('app');
var homeBtn = document.getElementById('home-btn');
var statusDot = document.getElementById('status-dot');
var statusText = document.getElementById('status-text');

/* --- tiny helpers -------------------------------------------------------- */

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function money(n) {
  return Number(n || 0).toLocaleString('mn-MN') + '₮';
}

function when(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var p = function (x) { return String(x).padStart(2, '0'); };
  return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function api(path, opts) {
  var o = opts || {};
  var ctl = new AbortController();
  var t = setTimeout(function () { ctl.abort(); }, o.timeoutMs || 25000);
  try {
    var r = await fetch(BRIDGE + path, {
      method: o.body ? 'POST' : 'GET',
      headers: o.body ? { 'Content-Type': 'application/json' } : undefined,
      body: o.body ? JSON.stringify(o.body) : undefined,
      signal: ctl.signal,
    });
    var text = await r.text();
    var json = {};
    try { json = text ? JSON.parse(text) : {}; } catch (_e) { json = {}; }
    if (!r.ok) {
      var e = new Error(json.error || ('HTTP ' + r.status));
      e.status = r.status;
      e.payload = json;
      throw e;
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

/* --- session state ------------------------------------------------------- */

var S = {
  events: [],
  event: null,
  qty: {},            // zone_id → count
  order: null,        // { order_id, reference, total, qr_image, qr_text }
  method: null,       // 'qpay' | 'card'
  customerTin: null,  // set only for a Байгууллага sale
  cancelled: false,   // bumped on every screen change; kills stale pollers
};

var generation = 0;
function newGeneration() {
  generation += 1;
  return generation;
}
function stale(g) {
  return g !== generation;
}

/* --- idle reset ---------------------------------------------------------- */

var idleTimer = null;
function armIdle(on) {
  clearTimeout(idleTimer);
  if (on) idleTimer = setTimeout(goHome, IDLE_MS);
}
['pointerdown', 'keydown'].forEach(function (ev) {
  document.addEventListener(ev, function () {
    if (idleTimer) armIdle(true);
  }, true);
});

/* --- screen plumbing ----------------------------------------------------- */

function render(node, opts) {
  var o = opts || {};
  newGeneration();
  app.innerHTML = '';
  app.appendChild(node);
  app.scrollTop = 0;
  homeBtn.hidden = !o.home;
  armIdle(o.idle !== false && !!o.home);
}

homeBtn.addEventListener('click', goHome);

function goHome() {
  S.event = null;
  S.qty = {};
  S.order = null;
  S.method = null;
  S.customerTin = null;
  screenEvents();
}

/* --- bridge health ------------------------------------------------------- */

async function pollHealth() {
  try {
    await api('/health', { timeoutMs: 4000 });
    statusDot.className = 'dot ok';
    statusText.textContent = 'Систем бэлэн';
  } catch (_e) {
    statusDot.className = 'dot bad';
    statusText.textContent = 'Систем холбогдоогүй — ажилтанд хандана уу';
  }
  setTimeout(pollHealth, 15000);
}

/* --- screen: message ----------------------------------------------------- */

function screenMessage(opts) {
  var box = el('div', 'center');
  if (opts.icon === 'spin') box.appendChild(el('div', 'spin'));
  if (opts.icon === 'ok') box.appendChild(el('div', 'tick', '✓'));
  if (opts.icon === 'bad') box.appendChild(el('div', 'cross', '!'));
  box.appendChild(el('div', 'big', opts.title));
  if (opts.text) box.appendChild(el('div', 'muted', opts.text));
  (opts.actions || []).forEach(function (a) {
    var b = el('button', 'btn' + (a.ghost ? ' ghost' : ''), a.label);
    b.type = 'button';
    b.addEventListener('click', a.onClick);
    box.appendChild(b);
  });
  render(box, { home: !!opts.home, idle: opts.idle !== false });
  return box;
}

/* --- screen 1: events ---------------------------------------------------- */

async function screenEvents() {
  screenMessage({ icon: 'spin', title: 'Тоглолтуудыг ачаалж байна…', home: false });
  var g = generation;
  var res;
  try {
    res = await api('/cloud/events', { timeoutMs: 15000 });
  } catch (e) {
    if (stale(g)) return;
    return screenMessage({
      icon: 'bad',
      title: 'Жагсаалт ачаалж чадсангүй',
      text: 'Интернэт холболтоо шалгаад дахин оролдоно уу. (' + e.message + ')',
      actions: [{ label: 'Дахин оролдох', onClick: screenEvents }],
    });
  }
  if (stale(g)) return;

  S.events = res.data || [];
  if (S.events.length === 0) {
    return screenMessage({
      icon: 'bad',
      title: 'Одоогоор зарагдаж буй тоглолт алга',
      text: 'Дараа дахин оролдоно уу.',
      actions: [{ label: 'Дахин шалгах', onClick: screenEvents }],
    });
  }

  var wrap = el('div');
  wrap.appendChild(el('h1', null, 'Тоглолтоо сонгоно уу'));
  wrap.appendChild(el('p', 'sub', 'Дэлгэц дээр дарж тасалбараа аваарай'));

  var grid = el('div', 'grid');
  S.events.forEach(function (ev) {
    var b = el('button', 'event');
    b.type = 'button';
    var img = el('img');
    img.src = ev.thumbnail_url || ev.image || 'assets/logo.png';
    img.alt = '';
    img.addEventListener('error', function () { img.src = 'assets/logo.png'; });
    var txt = el('div');
    txt.appendChild(el('div', 't', ev.title || ''));
    txt.appendChild(el('div', 'd', when(ev.start_time)));
    b.appendChild(img);
    b.appendChild(txt);
    b.addEventListener('click', function () { screenZones(ev); });
    grid.appendChild(b);
  });
  wrap.appendChild(grid);
  render(wrap, { home: false });
}

/* --- screen 2: zones + quantity ----------------------------------------- */

function orderTotal() {
  var t = 0;
  (S.event.zones || []).forEach(function (z) {
    t += (S.qty[z.id] || 0) * z.price;
  });
  return t;
}

function screenZones(ev) {
  S.event = ev;
  S.qty = {};

  var wrap = el('div');
  wrap.appendChild(el('h1', null, ev.title || ''));
  wrap.appendChild(el('p', 'sub', when(ev.start_time) + ' · Төв цэнгэлдэх хүрээлэн'));

  var totalEl, buyBtn;
  var zones = (ev.zones || []).filter(function (z) { return (z.available || 0) > 0; });

  if (zones.length === 0) {
    return screenMessage({
      icon: 'bad',
      title: 'Тасалбар дууссан байна',
      text: 'Энэ тоглолтод сул суудал үлдээгүй.',
      home: true,
      actions: [{ label: 'Буцах', onClick: screenEvents }],
    });
  }

  zones.forEach(function (z) {
    var row = el('div', 'zone');
    var info = el('div');
    info.appendChild(el('div', 'name', z.name_mn || z.name_en || ''));
    info.appendChild(el('div', 'price', money(z.price)));
    row.appendChild(info);
    row.appendChild(el('div', 'spacer'));

    var st = el('div', 'stepper');
    var minus = el('button', null, '−');
    var n = el('div', 'n', '0');
    var plus = el('button', null, '+');
    minus.type = plus.type = 'button';
    // A single buyer may take at most 10 seats; the cloud caps at 20 per line.
    var cap = Math.min(10, z.available || 0);

    function sync() {
      var v = S.qty[z.id] || 0;
      n.textContent = String(v);
      minus.disabled = v <= 0;
      plus.disabled = v >= cap;
      totalEl.textContent = money(orderTotal());
      buyBtn.disabled = orderTotal() <= 0;
    }
    minus.addEventListener('click', function () {
      S.qty[z.id] = Math.max(0, (S.qty[z.id] || 0) - 1);
      sync();
    });
    plus.addEventListener('click', function () {
      S.qty[z.id] = Math.min(cap, (S.qty[z.id] || 0) + 1);
      sync();
    });
    st.appendChild(minus); st.appendChild(n); st.appendChild(plus);
    row.appendChild(st);
    wrap.appendChild(row);
    row._sync = sync;
  });

  var bar = el('div', 'bar');
  totalEl = el('div', 'total', money(0));
  var back = el('button', 'btn ghost', 'Буцах');
  back.type = 'button';
  back.addEventListener('click', screenEvents);
  buyBtn = el('button', 'btn', 'Үргэлжлүүлэх');
  buyBtn.type = 'button';
  buyBtn.disabled = true;
  buyBtn.addEventListener('click', screenMethod);
  bar.appendChild(totalEl);
  bar.appendChild(back);
  bar.appendChild(buyBtn);
  wrap.appendChild(bar);

  render(wrap, { home: true });
  Array.prototype.forEach.call(wrap.querySelectorAll('.zone'), function (r) { r._sync(); });
}

function orderItems() {
  var items = [];
  Object.keys(S.qty).forEach(function (zid) {
    if (S.qty[zid] > 0) items.push({ zone_id: zid, qty: S.qty[zid] });
  });
  return items;
}

function orderDescription() {
  var names = (S.event.zones || [])
    .filter(function (z) { return (S.qty[z.id] || 0) > 0; })
    .map(function (z) { return (z.name_mn || z.name_en) + ' x' + S.qty[z.id]; })
    .join(', ');
  return [S.event.title, names, 'Төв цэнгэлдэх хүрээлэн'].join(' — ').slice(0, 250);
}

function receiptLines() {
  return (S.event.zones || [])
    .filter(function (z) { return (S.qty[z.id] || 0) > 0; })
    .map(function (z) {
      return {
        name: (S.event.title + ' — ' + (z.name_mn || z.name_en)).slice(0, 120),
        qty: S.qty[z.id],
        unitPrice: z.price,
      };
    });
}

/* --- screen 3: payment method ------------------------------------------- */

function screenMethod() {
  var wrap = el('div');
  wrap.appendChild(el('h1', null, 'Төлбөрөө хэрхэн төлөх вэ?'));
  wrap.appendChild(el('p', 'sub', 'Нийт төлөх дүн: ' + money(orderTotal())));

  var grid = el('div', 'grid');

  var qpay = el('button', 'btn wide', 'QPay-ээр төлөх');
  qpay.type = 'button';
  qpay.style.minHeight = '150px';
  // QPay's cloud stamps the И-Баримт the instant the payment lands, so the
  // buyer type has to be settled BEFORE the invoice is created — after that
  // the receipt can no longer be re-issued to a company.
  qpay.addEventListener('click', function () {
    S.method = 'qpay';
    screenBuyerType(startQpay);
  });

  var card = el('button', 'btn wide ghost', 'Картаар төлөх');
  card.type = 'button';
  card.style.minHeight = '150px';
  // Tapping the card button starts the read immediately — no second button.
  card.addEventListener('click', function () {
    S.method = 'card';
    startCard();
  });

  grid.appendChild(qpay);
  grid.appendChild(card);
  wrap.appendChild(grid);

  var bar = el('div', 'bar');
  var back = el('button', 'btn ghost', 'Буцах');
  back.type = 'button';
  back.addEventListener('click', function () { screenZones(S.event); });
  bar.appendChild(el('div', 'total', ''));
  bar.appendChild(back);
  wrap.appendChild(bar);

  render(wrap, { home: true });
}

/* --- screen 4: Хувь хүн / Байгууллага ------------------------------------ */

function screenBuyerType(next) {
  var wrap = el('div');
  wrap.appendChild(el('h1', null, 'И-Баримт хэнд бичих вэ?'));
  wrap.appendChild(el('p', 'sub', 'Байгууллагын нэр дээр бичүүлэх бол ТТД-аа оруулна'));

  var grid = el('div', 'grid');

  var person = el('button', 'btn wide', 'Хувь хүн');
  person.type = 'button';
  person.style.minHeight = '150px';
  person.addEventListener('click', function () {
    S.customerTin = null;
    next();
  });

  var company = el('button', 'btn wide ghost', 'Байгууллага');
  company.type = 'button';
  company.style.minHeight = '150px';
  company.addEventListener('click', function () { screenTin(next); });

  grid.appendChild(person);
  grid.appendChild(company);
  wrap.appendChild(grid);
  render(wrap, { home: true });
}

/* --- screen 5: ТТД keypad ------------------------------------------------ */

function screenTin(next) {
  var value = '';
  var wrap = el('div', 'center');
  wrap.appendChild(el('div', 'big', 'Байгууллагын ТТД'));
  wrap.appendChild(el('div', 'muted', 'Татвар төлөгчийн дугаар (7–12 орон)'));

  var display = el('div', 'tin empty', 'ТТД оруулна уу');
  wrap.appendChild(display);
  var err = el('div', 'err', '');
  wrap.appendChild(err);

  var keys = el('div', 'keys');
  var ok;
  function sync() {
    display.textContent = value || 'ТТД оруулна уу';
    display.className = value ? 'tin' : 'tin empty';
    ok.disabled = !/^\d{7,12}$/.test(value);
  }
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✕'].forEach(function (k) {
    var b = el('button', null, k);
    b.type = 'button';
    b.addEventListener('click', function () {
      err.textContent = '';
      if (k === '⌫') value = value.slice(0, -1);
      else if (k === '✕') value = '';
      else if (value.length < 12) value += k;
      sync();
    });
    keys.appendChild(b);
  });
  wrap.appendChild(keys);

  var bar = el('div', 'bar');
  var back = el('button', 'btn ghost', 'Буцах');
  back.type = 'button';
  back.addEventListener('click', function () { screenBuyerType(next); });
  ok = el('button', 'btn', 'Үргэлжлүүлэх');
  ok.type = 'button';
  ok.addEventListener('click', function () {
    if (!/^\d{7,12}$/.test(value)) {
      err.textContent = 'ТТД 7–12 оронтой тоо байх ёстой.';
      return;
    }
    S.customerTin = value;
    next();
  });
  bar.appendChild(back);
  bar.appendChild(ok);
  wrap.appendChild(bar);

  render(wrap, { home: true });
  sync();
}

/* --- QPay rail ----------------------------------------------------------- */

async function startQpay() {
  screenMessage({ icon: 'spin', title: 'Нэхэмжлэх үүсгэж байна…', home: true });
  var g = generation;
  var res;
  try {
    res = await api('/cloud/orders', {
      body: {
        event_id: S.event.id,
        items: orderItems(),
        method: 'qpay',
        customer_tin: S.customerTin || undefined,
      },
      timeoutMs: 30000,
    });
  } catch (e) {
    if (stale(g)) return;
    return failScreen('Нэхэмжлэх үүсгэж чадсангүй', e);
  }
  if (stale(g)) return;
  S.order = res.data;
  screenQpay();
}

function screenQpay() {
  var wrap = el('div', 'center');
  wrap.appendChild(el('div', 'big', 'QPay-ээр уншуулна уу'));
  wrap.appendChild(el('div', 'muted',
    'Банкны аппаа нээж доорх QR кодыг уншуулаад ' + money(S.order.total) + ' төлнө үү.'));

  var qr = el('div', 'qr');
  if (S.order.qr_image) {
    var img = el('img');
    img.src = S.order.qr_image.indexOf('data:') === 0
      ? S.order.qr_image
      : 'data:image/png;base64,' + S.order.qr_image;
    img.alt = 'QPay QR';
    qr.appendChild(img);
  } else {
    var t = el('div', null, S.order.qr_text || '');
    t.style.color = '#111';
    t.style.fontSize = '14px';
    t.style.wordBreak = 'break-all';
    qr.appendChild(t);
  }
  wrap.appendChild(qr);

  if (S.customerTin) {
    wrap.appendChild(el('div', 'muted', 'И-Баримт: Байгууллага · ТТД ' + S.customerTin));
  }

  var waiting = el('div', 'muted', 'Төлбөрийг хүлээж байна…');
  wrap.appendChild(waiting);

  var cancel = el('button', 'btn ghost', 'Цуцлах');
  cancel.type = 'button';
  cancel.addEventListener('click', goHome);
  wrap.appendChild(cancel);

  // The buyer is standing at the machine with their phone out; the idle timer
  // must not yank the QR away from under them.
  render(wrap, { home: false, idle: false });
  pollQpay(generation);
}

async function pollQpay(g) {
  var until = Date.now() + QPAY_GIVE_UP_MS;
  while (!stale(g) && Date.now() < until) {
    await sleep(QPAY_POLL_MS);
    if (stale(g)) return;
    try {
      var res = await api('/cloud/orders/' + S.order.order_id + '/status', { timeoutMs: 15000 });
      var d = res.data || {};
      if (stale(g)) return;
      if (d.status === 'paid') return screenPrinting();
      if (d.status === 'failed' || d.status === 'expired') {
        return failScreen('Захиалга цуцлагдлаа', new Error('Хугацаа дууссан байна.'));
      }
    } catch (_e) {
      // A single dropped poll is normal on a venue network; keep waiting.
    }
  }
  if (stale(g)) return;
  failScreen('Төлбөр хийгдсэнгүй', new Error('Хугацаа дууслаа. Дахин оролдоно уу.'));
}

/* --- Card rail ----------------------------------------------------------- */

async function startCard() {
  screenMessage({
    icon: 'spin',
    title: 'Картаа уншуулна уу',
    text: 'Төлөх дүн: ' + money(orderTotal()) + '\nТерминал дээр картаа хүргэнэ үү.',
    home: false,
    idle: false,
  });
  var g = generation;

  var order;
  try {
    order = (await api('/cloud/orders', {
      body: { event_id: S.event.id, items: orderItems(), method: 'card' },
      timeoutMs: 30000,
    })).data;
  } catch (e) {
    if (stale(g)) return;
    return failScreen('Захиалга үүсгэж чадсангүй', e);
  }
  if (stale(g)) return;
  S.order = order;

  var charge;
  try {
    charge = await api('/pos/charge', {
      body: {
        orderRef: order.order_id,
        amount: order.total,
        description: orderDescription(),
      },
      // The terminal waits on a human: PIN entry, a re-tap, a slow host.
      timeoutMs: 240000,
    });
  } catch (e) {
    if (stale(g)) return;
    // The charge may in fact have gone through — never tell the buyer it
    // failed outright, or they will pay a second time.
    return uncertainScreen(order, e);
  }
  if (stale(g)) return;

  if (!charge.approved) {
    try {
      await api('/cloud/orders/' + order.order_id + '/card-result', {
        body: { approved: false },
        timeoutMs: 15000,
      });
    } catch (_e) { /* the cloud expires the pending order on its own */ }
    return failScreen(
      'Төлбөр амжилтгүй',
      new Error(charge.message || charge.responseMessage || 'Карт татгалзсан байна.'),
    );
  }

  // Approved. Now — and only now — ask who the barimt belongs to.
  S.cardCharge = charge;
  screenBuyerType(finishCard);
}

async function finishCard() {
  var order = S.order;
  var charge = S.cardCharge || {};
  screenMessage({ icon: 'spin', title: 'И-Баримт бэлтгэж байна…', home: false, idle: false });
  var g = generation;

  var receipt = null;
  try {
    receipt = await api('/ebarimt/receipt', {
      body: {
        orderRef: order.order_id,
        items: receiptLines(),
        type: S.customerTin ? 'B2B_RECEIPT' : 'B2C_RECEIPT',
        customerTin: S.customerTin || undefined,
        paymentCode: 'PAYMENT_CARD',
      },
      timeoutMs: 60000,
    });
  } catch (_e) {
    // /ebarimt/receipt already fails open; a transport error here must still
    // not lose an approved card payment.
    receipt = null;
  }
  if (stale(g)) return;

  try {
    await api('/cloud/orders/' + order.order_id + '/card-result', {
      body: {
        approved: true,
        payment_ref: charge.authorizationCode || charge.rrn || undefined,
        ebarimt: receipt && receipt.id
          ? { id: receipt.id, qrData: receipt.qrData, lottery: receipt.lottery }
          : undefined,
      },
      timeoutMs: 30000,
    });
  } catch (e) {
    if (stale(g)) return;
    return uncertainScreen(order, e);
  }
  if (stale(g)) return;
  screenPrinting();
}

/* --- screen: printing ---------------------------------------------------- */

function screenPrinting() {
  screenMessage({
    icon: 'spin',
    title: 'Та баримт хэвлэх хүртэл түр хүлээнэ үү',
    text: 'Тасалбар болон И-Баримт хэвлэгдэж байна. Хэвлэгчээс баримтаа авна уу.',
    home: false,
    idle: false,
  });
  pollPrint(generation);
}

async function pollPrint(g) {
  var until = Date.now() + PRINT_GIVE_UP_MS;
  while (!stale(g) && Date.now() < until) {
    try {
      var r = await api('/print/status?ref=' + encodeURIComponent(S.order.order_id), { timeoutMs: 8000 });
      if (stale(g)) return;
      if (r.printed) return screenDone(true);
    } catch (_e) { /* keep waiting */ }
    await sleep(PRINT_POLL_MS);
  }
  if (stale(g)) return;
  // Paid, but the slip did not come out in time — say exactly that, and never
  // suggest paying again.
  screenDone(false);
}

/* --- screen: done -------------------------------------------------------- */

function screenDone(printed) {
  var box = screenMessage({
    icon: printed ? 'ok' : 'bad',
    title: printed ? 'Баярлалаа!' : 'Төлбөр хийгдсэн — хэвлэлт удаашралтай байна',
    text: printed
      ? 'Тасалбар болон И-Баримтаа хэвлэгчээс авна уу. Сайхан амраарай!'
      : 'Таны төлбөр амжилттай хийгдсэн. Баримт хэвлэгдээгүй бол ажилтанд хандаж, ' +
        'захиалгын дугаараа хэлнэ үү: ' + String(S.order && S.order.reference || '').slice(0, 8),
    home: false,
    idle: false,
    actions: [{ label: 'Дуусгах', onClick: goHome, ghost: true }],
  });
  if (S.order && S.order.reference) {
    box.appendChild(el('div', 'muted', 'Захиалгын дугаар: ' + String(S.order.reference).slice(0, 8).toUpperCase()));
  }
  // Clear the screen for the next buyer even if nobody presses the button.
  var g = generation;
  setTimeout(function () { if (!stale(g)) goHome(); }, 20000);
}

/* --- screen: failure ----------------------------------------------------- */

function failScreen(title, err) {
  screenMessage({
    icon: 'bad',
    title: title,
    text: (err && err.message) ? err.message : '',
    home: false,
    idle: false,
    actions: [{ label: 'Эхлэл рүү буцах', onClick: goHome }],
  });
}

/**
 * The card was (or may have been) approved but we could not record it.
 *
 * Showing a plain "Төлбөр амжилтгүй" here is what invites a second charge, so
 * this screen says the opposite: keep your receipt, do not pay again, fetch a
 * member of staff with this order number.
 */
function uncertainScreen(order, err) {
  var ref = String(order && order.reference || '').slice(0, 8).toUpperCase();
  screenMessage({
    icon: 'bad',
    title: 'Дахин бүү төлнө үү',
    text: 'Таны картын гүйлгээ хийгдсэн байж болзошгүй тул дахин төлөхгүй байхыг хүсье. ' +
      'Ажилтанд хандаж, захиалгын дугаараа хэлнэ үү: ' + ref +
      (err && err.message ? '\n(' + err.message + ')' : ''),
    home: false,
    idle: false,
    actions: [{ label: 'Ойлголоо', onClick: goHome, ghost: true }],
  });
}

/* --- boot ---------------------------------------------------------------- */

pollHealth();
screenEvents();
