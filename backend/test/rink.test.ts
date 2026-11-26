import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CALLBACK_SECRET,
  INTERNAL_SECRET,
  call,
  captureLogs,
  makeUser,
  setupTestEnv,
  type TestEnv,
} from "./helpers";

let env: TestEnv;
let app: Parameters<typeof call>[0];
let rinkLib: typeof import("../src/lib/rink");
let admin: Awaited<ReturnType<typeof makeUser>>;
let scanner: Awaited<ReturnType<typeof makeUser>>;
let customer: Awaited<ReturnType<typeof makeUser>>;

before(async () => {
  env = await setupTestEnv("rink");
  app = (await import("../src/app")).app;
  rinkLib = await import("../src/lib/rink");
  admin = await makeUser("admin");
  scanner = await makeUser("scanner");
  customer = await makeUser("user");
});

after(async () => {
  await env.teardown();
});

// ---------------------------------------------------------------- helpers

type Rink = { id: string; sizes: { zone_id: string; size: string; count: number; out: number; available: number }[] };

async function createRink(over: Partial<Record<string, unknown>> = {}): Promise<Rink> {
  const res = await call(app, "POST", "/admin/rink", {
    token: admin.token,
    body: {
      title: `Мөсөн гулгуур ${Math.random().toString(36).slice(2, 6)}`,
      price: 15000,
      duration_minutes: 120,
      overtime_per_minute: 3000,
      sizes: [
        { size: "38", count: 5 },
        { size: "40", count: 3 },
      ],
      ...over,
    },
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return res.json.data as Rink;
}

/** Buy `qty` pairs of one size at the kiosk with a card; returns the ticket codes. */
async function buy(rink: Rink, size: string, qty = 1, phone = "99112234"): Promise<string[]> {
  const zone = rink.sizes.find((s) => s.size === size)!;
  const order = await call(app, "POST", "/kiosk/orders", {
    kiosk: true,
    body: { event_id: rink.id, items: [{ zone_id: zone.zone_id, qty }], method: "card", buyer_phone: phone },
  });
  assert.equal(order.status, 200, JSON.stringify(order.json));
  const paid = await call(app, "POST", `/kiosk/orders/${order.json.data.order_id}/card-result`, {
    kiosk: true,
    body: { approved: true },
  });
  assert.equal(paid.status, 200, JSON.stringify(paid.json));
  return (paid.json.data.tickets as { code: string }[]).map((t) => t.code);
}

const scan = (code: string, token = scanner.token) =>
  call(app, "POST", "/scanner/scan", { token, body: { code } });

async function zoneSold(zoneId: string): Promise<number> {
  const { rows } = await env.sql.query(`SELECT sold FROM public.zones WHERE id = $1`, [zoneId]);
  return rows[0].sold;
}

/** Pretend the session started `startedAgoMin` minutes ago and ends `endsInMin` from now. */
async function shiftSession(code: string, startedAgoMin: number, endsInMin: number) {
  await env.sql.query(
    `UPDATE public.venue_tickets
        SET started_at = now() - $2::float8 * interval '1 minute',
            ends_at = now() + $3::float8 * interval '1 minute'
      WHERE code = $1`,
    [code, startedAgoMin, endsInMin],
  );
}

async function ticketRow(code: string) {
  const { rows } = await env.sql.query(`SELECT * FROM public.venue_tickets WHERE code = $1`, [code]);
  return rows[0];
}

// ---------------------------------------------------------------- pure helpers

describe("pure helpers", () => {
  it("masks phones so only the owner recognises them", () => {
    assert.equal(rinkLib.maskPhone("99112234"), "99**22 34");
    assert.equal(rinkLib.maskPhone("+976 9911-2234"), "99**22 34");
    assert.equal(rinkLib.maskPhone("97699112234"), "99**22 34");
    assert.equal(rinkLib.maskPhone(null), null);
    assert.equal(rinkLib.maskPhone("123"), "***");
  });

  it("accepts only Mongolian mobile numbers", () => {
    assert.equal(rinkLib.normalizeRinkPhone("99112234"), "99112234");
    assert.equal(rinkLib.normalizeRinkPhone("+976 8811 2233"), "88112233");
    assert.equal(rinkLib.normalizeRinkPhone("976-6611-2233"), "66112233");
    for (const bad of ["", "1234", "59112234", "991122345", "abc", null, undefined]) {
      assert.equal(rinkLib.normalizeRinkPhone(bad as string), null, String(bad));
    }
  });

  it("rounds remaining minutes away from zero", () => {
    const now = new Date("2026-11-26T10:00:00Z");
    const at = (s: number) => new Date(now.getTime() + s * 1000);
    assert.equal(rinkLib.remainingMinutes(at(0), now), 0);
    assert.equal(rinkLib.remainingMinutes(at(1), now), 1);
    assert.equal(rinkLib.remainingMinutes(at(60), now), 1);
    assert.equal(rinkLib.remainingMinutes(at(61), now), 2);
    assert.equal(rinkLib.remainingMinutes(at(-1), now), -1);
    assert.equal(rinkLib.remainingMinutes(at(-61), now), -2);
  });

  it("writes the reminder in Ulaanbaatar time with the overtime fee", () => {
    const text = rinkLib.reminderText("2026-11-26T08:30:00Z", "2026-11-26T08:21:30Z", 3000);
    assert.match(text, /16:30-д дуусна/);
    assert.match(text, /9 минут үлдлээ/);
    assert.match(text, /3,000₮/);
    assert.doesNotMatch(rinkLib.reminderText("2026-11-26T08:30:00Z", "2026-11-26T08:21:30Z", 0), /₮/);
  });

  it("validates rink input", () => {
    const ok = { title: "R", price: 1, duration_minutes: 60, overtime_per_minute: 0, sizes: [{ size: "38", count: 1 }] };
    assert.equal(rinkLib.validateRinkInput(ok), null);
    assert.equal(rinkLib.validateRinkInput({ ...ok, title: " " }), "title_required");
    assert.equal(rinkLib.validateRinkInput({ ...ok, sizes: [] }), "sizes_required");
    assert.equal(
      rinkLib.validateRinkInput({ ...ok, sizes: [{ size: "38", count: 1 }, { size: "38", count: 2 }] }),
      "duplicate_size",
    );
    assert.equal(rinkLib.validateRinkInput({ ...ok, duration_minutes: 0 }), "invalid_duration");
    assert.equal(rinkLib.validateRinkInput({ ...ok, sizes: [{ size: "38", count: -1 }] }), "invalid_count");
  });
});

// ---------------------------------------------------------------- roles

describe("roles", () => {
  it("lets only scanners and admins use the scanner API", async () => {
    assert.equal((await call(app, "GET", "/scanner/board")).status, 401);
    assert.equal((await call(app, "GET", "/scanner/board", { token: customer.token })).status, 403);
    assert.equal((await call(app, "GET", "/scanner/board", { token: scanner.token })).status, 200);
    assert.equal((await call(app, "GET", "/scanner/board", { token: admin.token })).status, 200);
    assert.equal((await call(app, "GET", "/scanner/board", { token: "garbage" })).status, 401);
  });

  it("keeps scanners out of every admin API", async () => {
    for (const path of [
      "/admin/rink",
      "/admin/rink/live",
      "/admin/events",
      "/admin/kiosk/events",
      "/admin/users",
      "/admin/tickets",
      "/admin/content",
    ]) {
      const res = await call(app, "GET", path, { token: scanner.token });
      assert.equal(res.status, 403, `${path} → ${res.status}`);
    }
  });

  it("reports the scanner role at login and in /auth/me", async () => {
    const login = await call(app, "POST", "/auth/login", {
      body: { identifier: scanner.phone.replace("+976", ""), password: scanner.password },
    });
    assert.equal(login.status, 200, JSON.stringify(login.json));
    assert.equal(login.json.data.user.role, "scanner");
    const me = await call(app, "GET", "/auth/me", { token: scanner.token });
    assert.equal(me.json.data.role, "scanner");
  });

  it("lets an admin make someone a scanner, and back", async () => {
    const u = await makeUser("user");
    const up = await call(app, "PATCH", `/admin/users/${u.id}/role`, { token: admin.token, body: { role: "scanner" } });
    assert.equal(up.status, 200, JSON.stringify(up.json));
    assert.equal(up.json.data.role, "scanner");
    assert.equal((await call(app, "GET", "/scanner/board", { token: u.token })).status, 200);
    const bad = await call(app, "PATCH", `/admin/users/${u.id}/role`, { token: admin.token, body: { role: "root" } });
    assert.equal(bad.status, 400);
    await call(app, "PATCH", `/admin/users/${u.id}/role`, { token: admin.token, body: { role: "user" } });
    assert.equal((await call(app, "GET", "/scanner/board", { token: u.token })).status, 403);
  });
});

// ---------------------------------------------------------------- admin setup

describe("admin rink setup", () => {
  it("rejects bad input", async () => {
    const base = { title: "X", price: 1, duration_minutes: 60, overtime_per_minute: 3000 };
    for (const body of [
      { ...base, sizes: [] },
      { ...base, sizes: [{ size: "38", count: 1 }, { size: "38", count: 1 }] },
      { ...base, duration_minutes: 0, sizes: [{ size: "38", count: 1 }] },
      { ...base, price: -5, sizes: [{ size: "38", count: 1 }] },
      { ...base, title: "", sizes: [{ size: "38", count: 1 }] },
    ]) {
      const res = await call(app, "POST", "/admin/rink", { token: admin.token, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it("creates a rink with sizes sorted numerically, hidden from the website and event lists", async () => {
    const rink = await createRink({
      sizes: [
        { size: "42", count: 2 },
        { size: "36.5", count: 4 },
        { size: "9", count: 1 },
      ],
    });
    assert.deepEqual(rink.sizes.map((s) => s.size), ["9", "36.5", "42"]);
    assert.deepEqual(rink.sizes.map((s) => s.available), [1, 4, 2]);

    const pub = await call(app, "GET", "/events");
    assert.ok(!(pub.json.data as { id: string }[]).some((e) => e.id === rink.id), "rink on the website");
    const adm = await call(app, "GET", "/admin/events", { token: admin.token });
    assert.ok(!JSON.stringify(adm.json).includes(rink.id), "rink in the admin event list");
    const list = await call(app, "GET", "/admin/rink", { token: admin.token });
    assert.ok((list.json.data as Rink[]).some((r) => r.id === rink.id));
  });

  it("updates price on every size, refuses to shrink below pairs out, and soft-removes sizes", async () => {
    const rink = await createRink();
    await buy(rink, "40", 2);
    const body = (sizes: { size: string; count: number }[], price = 20000) => ({
      title: "Шинэ нэр",
      price,
      duration_minutes: 90,
      overtime_per_minute: 2500,
      sizes,
    });

    const shrink = await call(app, "PUT", `/admin/rink/${rink.id}`, {
      token: admin.token,
      body: body([{ size: "38", count: 5 }, { size: "40", count: 1 }]),
    });
    assert.equal(shrink.status, 409);
    assert.equal(shrink.json.error, "count_below_out");

    const drop40 = await call(app, "PUT", `/admin/rink/${rink.id}`, {
      token: admin.token,
      body: body([{ size: "38", count: 5 }]),
    });
    assert.equal(drop40.status, 409, "a size with pairs out cannot be removed");

    const ok = await call(app, "PUT", `/admin/rink/${rink.id}`, {
      token: admin.token,
      body: body([{ size: "38", count: 0 }, { size: "40", count: 2 }, { size: "44", count: 1 }]),
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const r = ok.json.data;
    assert.equal(r.title, "Шинэ нэр");
    assert.equal(r.duration_minutes, 90);
    assert.deepEqual(
      r.sizes.map((s: { size: string; count: number; out: number }) => [s.size, s.count, s.out]),
      [["40", 2, 2], ["44", 1, 0]],
      "size 38 at 0 with none out is hidden",
    );
    const { rows } = await env.sql.query(`SELECT DISTINCT price FROM public.zones WHERE event_id = $1`, [rink.id]);
    assert.deepEqual(rows.map((x) => x.price), [20000]);

    const bad = await call(app, "PUT", `/admin/rink/00000000-0000-0000-0000-000000000000`, {
      token: admin.token,
      body: body([{ size: "38", count: 1 }]),
    });
    assert.equal(bad.status, 404);
  });
});

// ---------------------------------------------------------------- kiosk

describe("kiosk sale", () => {
  it("lists rinks on sale with their duration, and drops them when switched off", async () => {
    const rink = await createRink();
    const res = await call(app, "GET", "/kiosk/events", { kiosk: true });
    const e = (res.json.data as { id: string; kind: string; rink_duration_minutes: number; zones: { available: number }[] }[]).find(
      (x) => x.id === rink.id,
    );
    assert.ok(e, "rink missing from the kiosk");
    assert.equal(e.kind, "rink");
    assert.equal(e.rink_duration_minutes, 120);
    assert.deepEqual(e.zones.map((z) => z.available), [5, 3]);

    await call(app, "PUT", `/admin/rink/${rink.id}`, {
      token: admin.token,
      body: { title: "R", price: 15000, duration_minutes: 120, overtime_per_minute: 3000, on_sale: false, sizes: [{ size: "38", count: 5 }, { size: "40", count: 3 }] },
    });
    const off = await call(app, "GET", "/kiosk/events", { kiosk: true });
    assert.ok(!(off.json.data as { id: string }[]).some((x) => x.id === rink.id));
    const order = await call(app, "POST", "/kiosk/orders", {
      kiosk: true,
      body: { event_id: rink.id, items: [{ zone_id: rink.sizes[0].zone_id, qty: 1 }], method: "card", buyer_phone: "99112234" },
    });
    assert.equal(order.status, 409, "sold while off sale");
  });

  it("requires a valid phone and stores it normalised", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    for (const phone of [undefined, null, "", "12345", "59112234"]) {
      const res = await call(app, "POST", "/kiosk/orders", {
        kiosk: true,
        body: { event_id: rink.id, items: [{ zone_id: zone, qty: 1 }], method: "card", buyer_phone: phone },
      });
      assert.equal(res.status, phone === "" ? 400 : 400, String(phone));
    }
    assert.equal(await zoneSold(zone), 0, "a rejected order must not hold a pair");
    const ok = await call(app, "POST", "/kiosk/orders", {
      kiosk: true,
      body: { event_id: rink.id, items: [{ zone_id: zone, qty: 1 }], method: "card", buyer_phone: "+976 8811-2233" },
    });
    assert.equal(ok.status, 200);
    const { rows } = await env.sql.query(`SELECT buyer_phone FROM public.venue_orders WHERE id = $1`, [ok.json.data.order_id]);
    assert.equal(rows[0].buyer_phone, "88112233");
  });

  it("holds a pair per ticket and stops selling a size that is out", async () => {
    const rink = await createRink({ sizes: [{ size: "38", count: 2 }] });
    const zone = rink.sizes[0].zone_id;
    const codes = await buy(rink, "38", 2);
    assert.equal(codes.length, 2);
    assert.equal(await zoneSold(zone), 2);
    const more = await call(app, "POST", "/kiosk/orders", {
      kiosk: true,
      body: { event_id: rink.id, items: [{ zone_id: zone, qty: 1 }], method: "card", buyer_phone: "99112234" },
    });
    assert.equal(more.status, 409);
    assert.equal(more.json.error, "sold_out");
  });

  it("releases the pair when a card is declined", async () => {
    const rink = await createRink({ sizes: [{ size: "38", count: 1 }] });
    const zone = rink.sizes[0].zone_id;
    const order = await call(app, "POST", "/kiosk/orders", {
      kiosk: true,
      body: { event_id: rink.id, items: [{ zone_id: zone, qty: 1 }], method: "card", buyer_phone: "99112234" },
    });
    assert.equal(await zoneSold(zone), 1);
    const declined = await call(app, "POST", `/kiosk/orders/${order.json.data.order_id}/card-result`, {
      kiosk: true,
      body: { approved: false },
    });
    assert.equal(declined.status, 402);
    assert.equal(await zoneSold(zone), 0);
  });

  it("sells a rink ticket through QPay too", async () => {
    const rink = await createRink();
    const order = await call(app, "POST", "/kiosk/orders", {
      kiosk: true,
      body: { event_id: rink.id, items: [{ zone_id: rink.sizes[0].zone_id, qty: 1 }], method: "qpay", buyer_phone: "99112234" },
    });
    assert.equal(order.status, 200, JSON.stringify(order.json));
    const { rows } = await env.sql.query(`SELECT qpay_invoice_id FROM public.venue_orders WHERE id = $1`, [order.json.data.order_id]);
    env.qpay.pay(rows[0].qpay_invoice_id);
    const status = await call(app, "GET", `/kiosk/orders/${order.json.data.order_id}/status`, { kiosk: true });
    assert.equal(status.json.data.status, "paid");
    assert.equal(status.json.data.tickets.length, 1);
  });

  it("gives the printer the duration and the masked phone", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38", 1, "88112233");
    const jobs = await call(app, "GET", "/kiosk/print-jobs", { kiosk: true });
    const job = (jobs.json.data as { kind: string; tickets: { code: string }[]; rink_duration_minutes: number; buyer_phone_masked: string }[]).find((j) =>
      j.tickets.some((t) => t.code === code),
    );
    assert.ok(job, "no print job");
    assert.equal(job.kind, "rink");
    assert.equal(job.rink_duration_minutes, 120);
    assert.equal(job.buyer_phone_masked, "88**22 33");
    assert.ok(!JSON.stringify(job).includes("88112233"), "full phone sent to the printer");
  });
});

// ---------------------------------------------------------------- scanning

describe("scanning", () => {
  it("starts the clock on the first scan and ignores an accidental second scan", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    const first = await scan(code);
    assert.equal(first.json.data.verdict, "started");
    const t = first.json.data.ticket;
    assert.equal(t.status, "active");
    assert.equal(t.size, "38");
    assert.equal(t.phone_masked, "99**22 34");
    const mins = (new Date(t.ends_at).getTime() - new Date(t.started_at).getTime()) / 60000;
    assert.equal(mins, 120);
    assert.equal(t.remaining_minutes, 120);

    const again = await scan(code);
    assert.equal(again.json.data.verdict, "just_started");
    assert.equal((await ticketRow(code)).status, "active");
    assert.equal((await ticketRow(code)).started_by, scanner.id);
  });

  it("accepts the code in any case and with spaces", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    const res = await scan(`  ${code.toLowerCase()} `);
    assert.equal(res.json.data.verdict, "started");
  });

  it("finishes on time and puts the pair back on sale", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 100, 20);
    assert.equal(await zoneSold(zone), 1);
    const end = await scan(code);
    assert.equal(end.json.data.verdict, "finished");
    assert.equal(end.json.data.ticket.status, "done");
    assert.equal(end.json.data.ticket.overtime_amount, 0);
    assert.equal(await zoneSold(zone), 0);
    const third = await scan(code);
    assert.equal(third.json.data.verdict, "already_done");
    assert.equal(await zoneSold(zone), 0, "released twice");
  });

  it("charges whole minutes when late and keeps the pair out until paid", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 132.5, -12.5);
    const end = await scan(code);
    assert.equal(end.json.data.verdict, "overdue");
    assert.equal(end.json.data.ticket.overtime_minutes, 13);
    assert.equal(end.json.data.ticket.overtime_amount, 39000);
    assert.equal(await zoneSold(zone), 1);

    // The amount is frozen at the exit scan; time spent paying is not billed.
    await env.sql.query(`UPDATE public.venue_tickets SET ended_at = ended_at - interval '30 minutes' WHERE code = $1`, [code]);
    const again = await scan(code);
    assert.equal(again.json.data.verdict, "overdue");
    assert.equal(again.json.data.ticket.overtime_amount, 39000);
  });

  it("bills a single late second as one minute", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 120.02, -0.02);
    const end = await scan(code);
    assert.equal(end.json.data.verdict, "overdue");
    assert.equal(end.json.data.ticket.overtime_minutes, 1);
    assert.equal(end.json.data.ticket.overtime_amount, 3000);
  });

  it("closes a late session straight away when the overtime rate is zero", async () => {
    const rink = await createRink({ overtime_per_minute: 0 });
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 150, -30);
    const end = await scan(code);
    assert.equal(end.json.data.verdict, "finished");
    assert.equal(await zoneSold(zone), 0);
  });

  it("settles overtime in cash once", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 125, -5);
    await scan(code);
    const pay = await call(app, "POST", `/scanner/tickets/${code}/overtime/cash`, { token: scanner.token });
    assert.equal(pay.status, 200, JSON.stringify(pay.json));
    assert.equal(pay.json.data.status, "done");
    assert.equal(pay.json.data.overtime_paid_via, "cash");
    assert.equal(await zoneSold(zone), 0);
    const twice = await call(app, "POST", `/scanner/tickets/${code}/overtime/cash`, { token: scanner.token });
    assert.equal(twice.status, 200);
    assert.equal(await zoneSold(zone), 0, "second cash call released again");
    assert.equal((await ticketRow(code)).overtime_settled_by, scanner.id);
  });

  it("refuses to settle a session that owes nothing", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    await scan(code);
    const pay = await call(app, "POST", `/scanner/tickets/${code}/overtime/cash`, { token: scanner.token });
    assert.equal(pay.status, 409);
    assert.equal(pay.json.error, "not_overdue");
    const qpay = await call(app, "POST", `/scanner/tickets/${code}/overtime/qpay`, { token: scanner.token });
    assert.equal(qpay.status, 409);
  });

  it("settles overtime through QPay, reusing one invoice", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    // 3.5 minutes late → billed as 4 whole minutes.
    await shiftSession(code, 123.5, -3.5);
    await scan(code);

    const before = env.qpay.invoices.size;
    const inv = await call(app, "POST", `/scanner/tickets/${code}/overtime/qpay`, { token: scanner.token });
    assert.equal(inv.status, 200, JSON.stringify(inv.json));
    assert.equal(inv.json.data.amount, 12000);
    assert.match(inv.json.data.qr_text, /^QR:inv-/);
    const inv2 = await call(app, "POST", `/scanner/tickets/${code}/overtime/qpay`, { token: scanner.token });
    assert.equal(inv2.json.data.qr_text, inv.json.data.qr_text);
    assert.equal(env.qpay.invoices.size, before + 1, "a second invoice was created");
    const invoiceId = inv.json.data.qr_text.slice(3);
    assert.equal(env.qpay.invoices.get(invoiceId)!.amount, 12000);

    const unpaid = await call(app, "GET", `/scanner/tickets/${code}/overtime/status`, { token: scanner.token });
    assert.equal(unpaid.json.data.status, "overdue");

    env.qpay.pay(invoiceId, 11000);
    const short = await call(app, "GET", `/scanner/tickets/${code}/overtime/status`, { token: scanner.token });
    assert.equal(short.json.data.status, "overdue", "underpayment settled the session");

    env.qpay.pay(invoiceId);
    const paid = await call(app, "GET", `/scanner/tickets/${code}/overtime/status`, { token: scanner.token });
    assert.equal(paid.json.data.status, "done");
    assert.equal(paid.json.data.overtime_paid_via, "qpay");
    assert.equal(await zoneSold(zone), 0);
  });

  it("settles overtime from a signed QPay callback and rejects a forged one", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 121, -1);
    await scan(code);
    const inv = await call(app, "POST", `/scanner/tickets/${code}/overtime/qpay`, { token: scanner.token });
    const { id } = await ticketRow(code);
    env.qpay.pay(inv.json.data.qr_text.slice(3));

    const forged = await call(app, "POST", `/scanner/qpay-callback?ticket=${id}&sig=${"0".repeat(64)}`);
    assert.equal(forged.status, 401);
    assert.equal((await ticketRow(code)).status, "overdue");

    const { signTicket } = await import("../src/lib/qpay-signature");
    const real = await call(app, "POST", `/scanner/qpay-callback?ticket=${id}&sig=${signTicket(id, CALLBACK_SECRET)}`);
    assert.equal(real.status, 200, JSON.stringify(real.json));
    assert.equal(real.json.data.status, "done");
  });

  it("tells the scanner about unknown, voided and non-rink tickets", async () => {
    assert.equal((await scan("NS-DOESNOTEXIST000")).json.data.verdict, "not_found");

    const rink = await createRink();
    const [code] = await buy(rink, "38");
    await env.sql.query(`UPDATE public.venue_tickets SET status = 'void' WHERE code = $1`, [code]);
    assert.equal((await scan(code)).json.data.verdict, "voided");

    const { rows } = await env.sql.query(
      `SELECT t.code FROM public.venue_tickets t JOIN public.venue_orders o ON o.id = t.order_id
         JOIN public.events e ON e.id = o.event_id WHERE e.kind = 'event' LIMIT 1`,
    );
    assert.ok(rows[0], "backup has no match tickets to test with");
    assert.equal((await scan(rows[0].code)).json.data.verdict, "not_rink");
  });

  it("keeps the gate scanner from consuming a rink ticket", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    const gate = await call(app, "POST", "/kiosk/scan", { kiosk: true, body: { code } });
    assert.equal(gate.json.data.verdict, "wrong_event");
    assert.equal((await ticketRow(code)).status, "valid");
  });

  it("expires a ticket bought on an earlier day and frees its pair", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await env.sql.query(
      `UPDATE public.venue_orders SET paid_at = now() - interval '1 day'
        WHERE id = (SELECT order_id FROM public.venue_tickets WHERE code = $1)`,
      [code],
    );
    const res = await scan(code);
    assert.equal(res.json.data.verdict, "expired");
    assert.equal(res.json.data.ticket.status, "void");
    assert.equal(await zoneSold(zone), 0);
    assert.equal((await scan(code)).json.data.verdict, "voided");
  });

  it("starts each ticket of a multi-pair order separately", async () => {
    const rink = await createRink();
    const [a, b] = await buy(rink, "40", 2);
    assert.equal((await scan(a)).json.data.verdict, "started");
    assert.equal((await ticketRow(b)).status, "valid");
    assert.equal((await scan(b)).json.data.verdict, "started");
  });
});

// ---------------------------------------------------------------- concurrency

describe("concurrent scans", () => {
  it("starts a ticket exactly once", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38");
    const results = await Promise.all(Array.from({ length: 10 }, () => scan(code)));
    const verdicts = results.map((r) => r.json.data?.verdict);
    assert.equal(verdicts.filter((v) => v === "started").length, 1, verdicts.join(","));
    assert.ok(verdicts.every((v) => v === "started" || v === "just_started"), verdicts.join(","));
  });

  it("ends a session and releases its pair exactly once", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 60, 60);
    const results = await Promise.all(Array.from({ length: 10 }, () => scan(code)));
    const verdicts = results.map((r) => r.json.data?.verdict);
    assert.equal(verdicts.filter((v) => v === "finished").length, 1, verdicts.join(","));
    assert.equal(await zoneSold(zone), 0);
  });

  it("settles cash exactly once", async () => {
    const rink = await createRink();
    const zone = rink.sizes[0].zone_id;
    const [code] = await buy(rink, "38");
    await scan(code);
    await shiftSession(code, 125, -5);
    await scan(code);
    await Promise.all(
      Array.from({ length: 8 }, () =>
        call(app, "POST", `/scanner/tickets/${code}/overtime/cash`, { token: scanner.token }),
      ),
    );
    assert.equal(await zoneSold(zone), 0);
    const { rows } = await env.sql.query(`SELECT sold FROM public.zones WHERE id = $1`, [zone]);
    assert.equal(rows[0].sold, 0);
  });
});

// ---------------------------------------------------------------- board

describe("LED board", () => {
  it("shows only skaters on the ice, soonest first, with masked phones", async () => {
    const rink = await createRink({ sizes: [{ size: "38", count: 10 }] });
    const [onTime, warn, late, done, notStarted] = await Promise.all([
      buy(rink, "38", 1, "99110001"),
      buy(rink, "38", 1, "99110002"),
      buy(rink, "38", 1, "99110003"),
      buy(rink, "38", 1, "99110004"),
      buy(rink, "38", 1, "99110005"),
    ]).then((x) => x.map((c) => c[0]));
    for (const c of [onTime, warn, late, done]) await scan(c);
    await shiftSession(onTime, 30, 90);
    await shiftSession(warn, 116, 4);
    await shiftSession(late, 126.5, -6.5);
    await shiftSession(done, 60, 60);
    await scan(done);

    const res = await call(app, "GET", "/scanner/board", { token: scanner.token });
    const rows = (res.json.data.rows as { phone_masked: string; status: string; remaining_minutes: number }[]).filter((r) =>
      r.phone_masked.startsWith("99**00"),
    );
    assert.deepEqual(
      rows.map((r) => [r.phone_masked, r.status, r.remaining_minutes]),
      [
        ["99**00 03", "late", -7],
        ["99**00 02", "warning", 4],
        ["99**00 01", "on_time", 90],
      ],
    );
    const raw = JSON.stringify(res.json);
    for (const n of ["99110001", "99110002", "99110003", "99110004", "99110005"]) {
      assert.ok(!raw.includes(n), `full phone ${n} on the board`);
    }
    assert.ok(notStarted);
  });
});

// ---------------------------------------------------------------- jobs

describe("tick job", () => {
  const tick = () =>
    call(app, "POST", "/internal/rink/tick", { headers: { "x-internal-secret": INTERNAL_SECRET } });

  it("needs the internal secret", async () => {
    assert.equal((await call(app, "POST", "/internal/rink/tick")).status, 401);
    assert.equal(
      (await call(app, "POST", "/internal/rink/tick", { headers: { "x-internal-secret": "nope" } })).status,
      401,
    );
  });

  it("texts a skater once, about 10 minutes before the end", async () => {
    const rink = await createRink({ sizes: [{ size: "38", count: 10 }] });
    const [soon] = await buy(rink, "38", 1, "88001100");
    const [later] = await buy(rink, "38", 1, "88001101");
    const [overdue] = await buy(rink, "38", 1, "88001102");
    for (const c of [soon, later, overdue]) await scan(c);
    await shiftSession(soon, 112, 8);
    await shiftSession(later, 100, 15);
    await shiftSession(overdue, 125, -5);
    await scan(overdue);

    const { lines } = await captureLogs(() => tick());
    const sms = lines.filter((l) => l.startsWith("[sms:dev]"));
    assert.equal(sms.filter((l) => l.includes("to=88001100")).length, 1, sms.join("\n"));
    assert.ok(!sms.some((l) => l.includes("to=88001101")), "texted 15 minutes early");
    assert.ok(!sms.some((l) => l.includes("to=88001102")), "texted an overdue session");
    assert.match(sms.find((l) => l.includes("to=88001100"))!, /8 минут үлдлээ/);

    const again = await captureLogs(() => tick());
    assert.ok(!again.lines.some((l) => l.includes("to=88001100")), "texted twice");
    assert.ok((await ticketRow(soon)).reminded_at);
  });

  it("retries a reminder whose SMS failed", async () => {
    const rink = await createRink();
    const [code] = await buy(rink, "38", 1, "88002200");
    await scan(code);
    await shiftSession(code, 115, 5);
    process.env.SMS_PROVIDER = "twilio"; // no credentials → the send throws
    const errors: string[] = [];
    const origErr = console.error;
    console.error = (...a: unknown[]) => errors.push(a.map(String).join(" "));
    try {
      const res = await tick();
      assert.ok(res.json.data.failed >= 1);
    } finally {
      console.error = origErr;
      process.env.SMS_PROVIDER = "dev";
    }
    assert.equal((await ticketRow(code)).reminded_at, null);
    assert.ok(errors.some((e) => e.includes("rink_reminder_failed")));
    const { lines } = await captureLogs(() => tick());
    assert.ok(lines.some((l) => l.includes("to=88002200")));
  });

  it("frees pairs of tickets never scanned on the day they were bought", async () => {
    const rink = await createRink({ sizes: [{ size: "38", count: 3 }] });
    const zone = rink.sizes[0].zone_id;
    const [old] = await buy(rink, "38");
    const [fresh] = await buy(rink, "38");
    await env.sql.query(
      `UPDATE public.venue_orders SET paid_at = now() - interval '2 days'
        WHERE id = (SELECT order_id FROM public.venue_tickets WHERE code = $1)`,
      [old],
    );
    assert.equal(await zoneSold(zone), 2);
    const res = await tick();
    assert.ok(res.json.data.expired >= 1);
    assert.equal((await ticketRow(old)).status, "void");
    assert.equal((await ticketRow(fresh)).status, "valid");
    assert.equal(await zoneSold(zone), 1);
    await tick();
    assert.equal(await zoneSold(zone), 1, "expired twice");
  });
});

// ---------------------------------------------------------------- admin live

describe("admin live view", () => {
  it("splits sessions into on ice / owes / done today and sums overtime by method", async () => {
    const rink = await createRink({ sizes: [{ size: "38", count: 10 }] });
    const [onIce, owes, cash, qpay] = await Promise.all([
      buy(rink, "38", 1, "95000001"),
      buy(rink, "38", 1, "95000002"),
      buy(rink, "38", 1, "95000003"),
      buy(rink, "38", 1, "95000004"),
    ]).then((x) => x.map((c) => c[0]));
    for (const c of [onIce, owes, cash, qpay]) await scan(c);
    await shiftSession(owes, 122, -2);
    await shiftSession(cash, 123, -3);
    await shiftSession(qpay, 124, -4);
    for (const c of [owes, cash, qpay]) await scan(c);
    await call(app, "POST", `/scanner/tickets/${cash}/overtime/cash`, { token: scanner.token });
    const inv = await call(app, "POST", `/scanner/tickets/${qpay}/overtime/qpay`, { token: scanner.token });
    env.qpay.pay(inv.json.data.qr_text.slice(3));
    await call(app, "GET", `/scanner/tickets/${qpay}/overtime/status`, { token: scanner.token });

    const live = await call(app, "GET", "/admin/rink/live", { token: admin.token });
    assert.equal(live.status, 200);
    const d = live.json.data;
    const has = (list: { code: string }[], code: string) => list.some((s) => s.code === code);
    assert.ok(has(d.active, onIce));
    assert.ok(has(d.overdue, owes));
    assert.ok(has(d.done_today, cash) && has(d.done_today, qpay));
    assert.equal(d.overdue.find((s: { code: string }) => s.code === owes).phone, "95000002", "admin sees the full phone");
    assert.ok(d.totals.overtime_paid_cash >= 9000);
    assert.ok(d.totals.overtime_paid_qpay >= 12000);
    assert.ok(d.totals.sold_today >= 4);
  });
});

// ---------------------------------------------------------------- regressions

describe("match tickets are unchanged", () => {
  it("still sells and admits a normal event ticket without a phone", async () => {
    const { rows: ev } = await env.sql.query(
      `INSERT INTO public.events (title, status, start_time, show_on_kiosk, show_on_web)
       VALUES ('Регресс тоглолт', 'upcoming', now() + interval '2 days', true, true) RETURNING id`,
    );
    const { rows: z } = await env.sql.query(
      `INSERT INTO public.zones (event_id, name_mn, name_en, price, capacity)
       VALUES ($1, 'VIP', 'VIP', 50000, 10) RETURNING id`,
      [ev[0].id],
    );
    const list = await call(app, "GET", "/kiosk/events", { kiosk: true });
    const listed = (list.json.data as { id: string; kind: string }[]).find((e) => e.id === ev[0].id);
    assert.equal(listed?.kind, "event");

    const order = await call(app, "POST", "/kiosk/orders", {
      kiosk: true,
      body: { event_id: ev[0].id, items: [{ zone_id: z[0].id, qty: 2 }], method: "card" },
    });
    assert.equal(order.status, 200, JSON.stringify(order.json));
    const paid = await call(app, "POST", `/kiosk/orders/${order.json.data.order_id}/card-result`, {
      kiosk: true,
      body: { approved: true },
    });
    const code = paid.json.data.tickets[0].code;
    const gate = await call(app, "POST", "/kiosk/scan", { kiosk: true, body: { code } });
    assert.equal(gate.json.data.verdict, "admitted");
    const again = await call(app, "POST", "/kiosk/scan", { kiosk: true, body: { code } });
    assert.equal(again.json.data.verdict, "already_used");
    assert.equal((await scan(code)).json.data.verdict, "not_rink");

    const jobs = await call(app, "GET", "/kiosk/print-jobs", { kiosk: true });
    const job = (jobs.json.data as { order_id: string; kind: string; buyer_phone_masked: string | null }[]).find(
      (j) => j.order_id === order.json.data.order_id,
    );
    assert.equal(job?.kind, "event");
    assert.equal(job?.buyer_phone_masked, null);
  });

  it("keeps normal users and admins logging in with their own roles", async () => {
    for (const u of [customer, admin]) {
      const login = await call(app, "POST", "/auth/login", {
        body: { identifier: u.phone.replace("+976", ""), password: u.password },
      });
      assert.equal(login.status, 200);
      assert.equal(login.json.data.user.role, u === admin ? "admin" : "user");
    }
  });
});
