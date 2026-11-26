import type pg from "pg";
import type {
  AdminRink,
  AdminRinkInput,
  AdminRinkLive,
  AdminRinkSession,
  RinkBoard,
  RinkOvertimeInvoice,
  RinkScanResult,
  RinkScanVerdict,
  RinkTicketView,
  VenueTicketStatus,
} from "@cs360/shared";
import { getDb, type Db } from "./db";
import {
  checkInvoicePayment,
  createInvoice,
  isPaid,
  isQPayConfigured,
} from "./qpay";
import { getCallbackSecret, signTicket } from "./qpay-signature";
import { sendSms } from "./sms";
import type { VenueResult } from "./venue";

// A ticket is scanned on the way in and on the way out. A second scan this
// soon after the first is the same buyer being scanned twice, not a return.
export const RINK_MIN_SESSION_SECONDS = 120;
export const RINK_REMIND_BEFORE_MINUTES = 10;
export const RINK_WARNING_MINUTES = 5;
const UB = "Asia/Ulaanbaatar";

type Queryable = {
  query<R extends pg.QueryResultRow = any>(sql: string, params?: unknown[]): Promise<pg.QueryResult<R>>;
};

type TicketRow = {
  id: string;
  code: string;
  status: VenueTicketStatus;
  zone_id: string;
  started_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  overtime_minutes: number | null;
  overtime_amount: number | null;
  overtime_paid_via: "qpay" | "cash" | null;
  overtime_paid_at: string | null;
  overtime_invoice_id: string | null;
  overtime_qr_text: string | null;
  buyer_phone: string | null;
  paid_at: string | null;
  kind: string;
  title: string;
  duration_minutes: number | null;
  overtime_per_minute: number | null;
  size: string;
  bought_today: boolean;
  since_start_s: number | null;
  db_now: string;
};

const TICKET_SQL = `
  SELECT t.id, t.code, t.status, t.zone_id, t.started_at, t.ends_at, t.ended_at,
         t.overtime_minutes, t.overtime_amount, t.overtime_paid_via, t.overtime_paid_at,
         t.overtime_invoice_id, t.overtime_qr_text,
         o.buyer_phone, o.paid_at,
         e.kind, e.title, e.rink_duration_minutes AS duration_minutes,
         e.rink_overtime_per_minute AS overtime_per_minute,
         z.name_mn AS size,
         coalesce((o.paid_at AT TIME ZONE '${UB}')::date = (now() AT TIME ZONE '${UB}')::date, false) AS bought_today,
         extract(epoch FROM now() - t.started_at)::float8 AS since_start_s,
         now() AS db_now
    FROM public.venue_tickets t
    JOIN public.venue_orders o ON o.id = t.order_id
    JOIN public.events e ON e.id = o.event_id
    JOIN public.zones z ON z.id = t.zone_id`;

function iso(v: string | Date | null): string | null {
  if (v == null) return null;
  return (v instanceof Date ? v : new Date(v)).toISOString();
}

/** Whole minutes from `now` to `endsAt`; negative (rounded away from zero) once past. */
export function remainingMinutes(endsAt: string | Date, now: string | Date): number {
  const diff = new Date(endsAt).getTime() - new Date(now).getTime();
  return diff >= 0 ? Math.ceil(diff / 60_000) : -Math.ceil(-diff / 60_000);
}

/** Mongolian mobile as 8 digits, or null. Accepts +976 / spaces / dashes. */
export function normalizeRinkPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D+/g, "");
  if (d.length === 11 && d.startsWith("976")) d = d.slice(3);
  return /^[6-9]\d{7}$/.test(d) ? d : null;
}

/** 99112234 → "99**22 34": enough for a skater to spot their own number. */
export function maskPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D+/g, "").replace(/^976(?=\d{8}$)/, "");
  if (d.length === 8) return `${d.slice(0, 2)}**${d.slice(4, 6)} ${d.slice(6)}`;
  if (d.length < 6) return "*".repeat(d.length);
  return `${d.slice(0, 2)}${"*".repeat(d.length - 6)}${d.slice(-4)}`;
}

function toView(r: TicketRow): RinkTicketView {
  return {
    code: r.code,
    status: r.status,
    size: r.size,
    phone_masked: maskPhone(r.buyer_phone),
    event_title: r.title,
    duration_minutes: r.duration_minutes ?? 0,
    started_at: iso(r.started_at),
    ends_at: iso(r.ends_at),
    ended_at: iso(r.ended_at),
    remaining_minutes:
      r.ends_at && r.status === "active" ? remainingMinutes(r.ends_at, r.db_now) : null,
    overtime_minutes: r.overtime_minutes,
    overtime_amount: r.overtime_amount,
    overtime_paid_via: r.overtime_paid_via,
    overtime_paid_at: iso(r.overtime_paid_at),
  };
}

async function loadTicket(q: Queryable, code: string): Promise<TicketRow | null> {
  const { rows } = await q.query<TicketRow>(`${TICKET_SQL} WHERE t.code = $1`, [code]);
  return rows[0] ?? null;
}

async function releasePair(q: Queryable, zoneId: string): Promise<void> {
  await q.query(`UPDATE public.zones SET sold = greatest(0, sold - 1) WHERE id = $1`, [zoneId]);
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function db(): Db | null {
  return getDb();
}

const NO_DB = { ok: false as const, error: "supabase_not_configured", status: 503 };

// ------------------------------------------------------------------ scanning

/**
 * One scan of a rink ticket. First scan starts the clock; the next one ends
 * the session — on time it is done and the pair goes back on sale, late it
 * becomes 'overdue' with the overtime frozen at this moment.
 */
export async function scanRinkTicket(
  rawCode: string,
  staffId: string | null,
): Promise<VenueResult<RinkScanResult>> {
  const d = db();
  if (!d) return NO_DB;
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "empty_code", status: 400 };

  // Two passes: a lost race re-reads the row and reports what the winner did.
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await loadTicket(d, code);
    if (!t) return { ok: true, data: { verdict: "not_found", code, ticket: null } };
    if (t.kind !== "rink") return { ok: true, data: { verdict: "not_rink", code, ticket: null } };

    const result = (verdict: RinkScanVerdict, row: TicketRow = t) => ({
      ok: true as const,
      data: { verdict, code, ticket: toView(row) },
    });

    switch (t.status) {
      case "void":
        return result("voided");
      case "done":
      case "used":
        return result("already_done");
      case "overdue":
        return result("overdue");
      case "valid": {
        if (!t.bought_today) {
          const expired = await d.transaction(async (c) => {
            const { rows } = await c.query<{ zone_id: string }>(
              `UPDATE public.venue_tickets SET status = 'void'
                WHERE id = $1 AND status = 'valid' RETURNING zone_id`,
              [t.id],
            );
            if (rows[0]) await releasePair(c, rows[0].zone_id);
            return rows.length > 0;
          });
          if (!expired) continue;
          return result("expired", (await loadTicket(d, code))!);
        }
        const { rowCount } = await d.query(
          `UPDATE public.venue_tickets
              SET status = 'active', started_at = now(),
                  ends_at = now() + make_interval(mins => $2), started_by = $3
            WHERE id = $1 AND status = 'valid'`,
          [t.id, t.duration_minutes ?? 0, staffId],
        );
        if (!rowCount) continue;
        return result("started", (await loadTicket(d, code))!);
      }
      case "active": {
        if ((t.since_start_s ?? 0) < RINK_MIN_SESSION_SECONDS) return result("just_started");
        const ended = await d.transaction(async (c) => {
          const { rows } = await c.query<{ status: VenueTicketStatus; zone_id: string }>(
            `UPDATE public.venue_tickets t
                SET ended_at = now(), ended_by = $2,
                    overtime_minutes = greatest(0, ceil(extract(epoch FROM now() - t.ends_at) / 60))::int,
                    overtime_amount = greatest(0, ceil(extract(epoch FROM now() - t.ends_at) / 60))::int * $3,
                    status = CASE WHEN now() <= t.ends_at OR $3 = 0 THEN 'done' ELSE 'overdue' END
              WHERE t.id = $1 AND t.status = 'active'
            RETURNING t.status, t.zone_id`,
            [t.id, staffId, t.overtime_per_minute ?? 0],
          );
          const row = rows[0];
          if (row?.status === "done") await releasePair(c, row.zone_id);
          return row ?? null;
        });
        if (!ended) continue;
        return result(ended.status === "done" ? "finished" : "overdue", (await loadTicket(d, code))!);
      }
      default:
        return result("voided");
    }
  }
  return { ok: false, error: "conflict", status: 409 };
}

export async function getRinkTicket(rawCode: string): Promise<VenueResult<RinkTicketView>> {
  const d = db();
  if (!d) return NO_DB;
  const t = await loadTicket(d, normalizeCode(rawCode));
  if (!t || t.kind !== "rink") return { ok: false, error: "not_found", status: 404 };
  return { ok: true, data: toView(t) };
}

// ------------------------------------------------------------------ overtime

/** Close an overdue session as paid. Idempotent: a second call reports the first. */
export async function settleOvertime(
  rawCode: string,
  via: "qpay" | "cash",
  staffId: string | null,
): Promise<VenueResult<RinkTicketView>> {
  const d = db();
  if (!d) return NO_DB;
  const code = normalizeCode(rawCode);
  const t = await loadTicket(d, code);
  if (!t || t.kind !== "rink") return { ok: false, error: "not_found", status: 404 };
  if (t.status === "done") return { ok: true, data: toView(t) };
  if (t.status !== "overdue") return { ok: false, error: "not_overdue", status: 409 };

  await d.transaction(async (c) => {
    const { rows } = await c.query<{ zone_id: string }>(
      `UPDATE public.venue_tickets
          SET status = 'done', overtime_paid_via = $2, overtime_paid_at = now(),
              overtime_settled_by = $3
        WHERE id = $1 AND status = 'overdue' RETURNING zone_id`,
      [t.id, via, staffId],
    );
    if (rows[0]) await releasePair(c, rows[0].zone_id);
  });
  return { ok: true, data: toView((await loadTicket(d, code))!) };
}

function backendUrl(): string {
  return (
    process.env.PUBLIC_BACKEND_URL ??
    process.env.BACKEND_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`
  );
}

export function buildOvertimeCallbackUrl(ticketId: string, secret: string): string {
  const params = new URLSearchParams({ ticket: ticketId, sig: signTicket(ticketId, secret) });
  return `${backendUrl().replace(/\/$/, "")}/api/scanner/qpay-callback?${params.toString()}`;
}

/** QPay invoice for an overdue session; the same invoice is handed back on repeat calls. */
export async function createOvertimeInvoice(
  rawCode: string,
): Promise<VenueResult<RinkOvertimeInvoice>> {
  const d = db();
  if (!d) return NO_DB;
  const code = normalizeCode(rawCode);
  const t = await loadTicket(d, code);
  if (!t || t.kind !== "rink") return { ok: false, error: "not_found", status: 404 };
  if (t.status !== "overdue") return { ok: false, error: "not_overdue", status: 409 };
  const amount = t.overtime_amount ?? 0;
  if (t.overtime_invoice_id && t.overtime_qr_text) {
    return { ok: true, data: { code, amount, qr_text: t.overtime_qr_text, urls: [] } };
  }
  if (!isQPayConfigured()) return { ok: false, error: "qpay_not_configured", status: 503 };
  const secret = getCallbackSecret();
  if (!secret) return { ok: false, error: "qpay_callback_secret_missing", status: 503 };

  try {
    const label = `${t.title} — нэмэлт ${t.overtime_minutes} минут`;
    const invoice = await createInvoice({
      senderInvoiceNo: `${t.id.replace(/-/g, "").slice(0, 20)}OT`,
      receiverCode: "RINK",
      branchCode: "RINK",
      amountMnt: amount,
      description: `${label} — Төв цэнгэлдэх хүрээлэн`.slice(0, 250),
      lines: [
        {
          description: label,
          qty: t.overtime_minutes ?? 0,
          unitPrice: t.overtime_per_minute ?? 0,
        },
      ],
      callbackUrl: buildOvertimeCallbackUrl(t.id, secret),
    });
    // Only the first invoice sticks; a concurrent request reuses it.
    const { rows } = await d.query<{ overtime_qr_text: string }>(
      `UPDATE public.venue_tickets
          SET overtime_invoice_id = coalesce(overtime_invoice_id, $2),
              overtime_qr_text = coalesce(overtime_qr_text, $3)
        WHERE id = $1 RETURNING overtime_qr_text`,
      [t.id, invoice.invoice_id, invoice.qr_text],
    );
    const qr = rows[0]?.overtime_qr_text ?? invoice.qr_text;
    return {
      ok: true,
      data: { code, amount, qr_text: qr, urls: qr === invoice.qr_text ? invoice.urls : [] },
    };
  } catch (err) {
    console.error("rink_overtime_invoice_failed", t.id, String(err).slice(0, 300));
    return { ok: false, error: "qpay_invoice_failed", status: 502 };
  }
}

/** Poll QPay for an overdue session's invoice; settles it once paid in full. */
export async function checkOvertimePayment(
  rawCode: string,
  staffId: string | null,
): Promise<VenueResult<RinkTicketView>> {
  const d = db();
  if (!d) return NO_DB;
  const code = normalizeCode(rawCode);
  const t = await loadTicket(d, code);
  if (!t || t.kind !== "rink") return { ok: false, error: "not_found", status: 404 };
  if (t.status !== "overdue" || !t.overtime_invoice_id) return { ok: true, data: toView(t) };
  if (!isQPayConfigured()) return { ok: false, error: "qpay_not_configured", status: 503 };
  try {
    const check = await checkInvoicePayment(t.overtime_invoice_id);
    if (isPaid(check) && check.paid_amount >= (t.overtime_amount ?? 0)) {
      return settleOvertime(code, "qpay", staffId);
    }
  } catch (err) {
    console.error("rink_overtime_check_failed", t.id, String(err).slice(0, 300));
    return { ok: false, error: "qpay_check_failed", status: 502 };
  }
  return { ok: true, data: toView(t) };
}

export async function checkOvertimePaymentByTicketId(
  ticketId: string,
): Promise<VenueResult<RinkTicketView>> {
  const d = db();
  if (!d) return NO_DB;
  const { rows } = await d.query<{ code: string }>(
    `SELECT code FROM public.venue_tickets WHERE id = $1`,
    [ticketId],
  );
  if (!rows[0]) return { ok: false, error: "not_found", status: 404 };
  return checkOvertimePayment(rows[0].code, null);
}

// ------------------------------------------------------------------ board

export async function rinkBoard(): Promise<VenueResult<RinkBoard>> {
  const d = db();
  if (!d) return NO_DB;
  const { rows } = await d.query<TicketRow>(
    `${TICKET_SQL} WHERE e.kind = 'rink' AND t.status = 'active' ORDER BY t.ends_at ASC, t.code ASC`,
  );
  const { rows: nowRows } = await d.query<{ now: string }>(`SELECT now() AS now`);
  const now = nowRows[0].now;
  return {
    ok: true,
    data: {
      server_time: iso(now)!,
      rows: rows.map((r) => {
        const remaining = remainingMinutes(r.ends_at!, now);
        return {
          phone_masked: maskPhone(r.buyer_phone) ?? "—",
          size: r.size,
          ends_at: iso(r.ends_at)!,
          remaining_minutes: remaining,
          status: remaining < 0 ? "late" : remaining <= RINK_WARNING_MINUTES ? "warning" : "on_time",
        };
      }),
    },
  };
}

// ------------------------------------------------------------------ jobs

/** Unscanned tickets are good only on the day they were bought; free their pairs after. */
export async function expireStaleRinkTickets(): Promise<number> {
  const d = db();
  if (!d) return 0;
  const { rows } = await d.query<{ n: number }>(
    `WITH v AS (
       UPDATE public.venue_tickets t SET status = 'void'
         FROM public.venue_orders o, public.events e
        WHERE t.order_id = o.id AND o.event_id = e.id AND e.kind = 'rink'
          AND t.status = 'valid'
          AND (o.paid_at AT TIME ZONE '${UB}')::date < (now() AT TIME ZONE '${UB}')::date
       RETURNING t.zone_id
     ), c AS (SELECT zone_id, count(*)::int AS n FROM v GROUP BY zone_id),
     u AS (UPDATE public.zones z SET sold = greatest(0, z.sold - c.n) FROM c WHERE z.id = c.zone_id)
     SELECT coalesce(sum(n), 0)::int AS n FROM c`,
  );
  return rows[0]?.n ?? 0;
}

function ubClock(t: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UB,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(t));
}

export function reminderText(endsAt: string | Date, now: string | Date, perMinute: number): string {
  const left = Math.max(1, remainingMinutes(endsAt, now));
  const fee = perMinute > 0 ? ` Хэтэрсэн минут бүрт ${perMinute.toLocaleString("en-US")}₮.` : "";
  return `Төв цэнгэлдэх: Мөсөн гулгуурын цаг тань ${ubClock(endsAt)}-д дуусна (${left} минут үлдлээ).${fee}`;
}

/** SMS once per session, ~10 minutes before the end. A failed send is retried next run. */
export async function sendRinkReminders(): Promise<{ sent: number; failed: number }> {
  const d = db();
  if (!d) return { sent: 0, failed: 0 };
  const { rows } = await d.query<{
    id: string;
    buyer_phone: string;
    ends_at: string;
    per_minute: number | null;
    db_now: string;
  }>(
    `UPDATE public.venue_tickets t SET reminded_at = now()
       FROM public.venue_orders o, public.events e
      WHERE t.order_id = o.id AND o.event_id = e.id AND e.kind = 'rink'
        AND t.status = 'active' AND t.reminded_at IS NULL
        AND o.buyer_phone IS NOT NULL
        AND t.ends_at > now()
        AND t.ends_at <= now() + make_interval(mins => $1)
    RETURNING t.id, o.buyer_phone, t.ends_at, e.rink_overtime_per_minute AS per_minute, now() AS db_now`,
    [RINK_REMIND_BEFORE_MINUTES],
  );
  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const res = await sendSms({
        phone: r.buyer_phone,
        text: reminderText(r.ends_at, r.db_now, r.per_minute ?? 0),
      });
      if (!res.ok) throw new Error(res.note ?? "sms_not_ok");
      sent++;
    } catch (err) {
      failed++;
      console.error("rink_reminder_failed", r.id, String(err).slice(0, 200));
      await d.query(`UPDATE public.venue_tickets SET reminded_at = NULL WHERE id = $1`, [r.id]);
    }
  }
  return { sent, failed };
}

// ------------------------------------------------------------------ admin

type RinkEventRow = {
  id: string;
  title: string;
  price: number;
  duration_minutes: number;
  overtime_per_minute: number;
  on_sale: boolean;
  created_at: string;
};

type ZoneRow = { id: string; event_id: string; name_mn: string; capacity: number; sold: number; sort_order: number };

function sizeSortKey(size: string): [number, string] {
  const n = Number.parseFloat(size.replace(",", "."));
  return [Number.isFinite(n) ? n : Number.MAX_VALUE, size];
}

function compareSizes(a: string, b: string): number {
  const [na, sa] = sizeSortKey(a);
  const [nb, sb] = sizeSortKey(b);
  return na - nb || sa.localeCompare(sb);
}

function toAdminRink(e: RinkEventRow, zones: ZoneRow[]): AdminRink {
  return {
    id: e.id,
    title: e.title,
    price: e.price,
    duration_minutes: e.duration_minutes,
    overtime_per_minute: e.overtime_per_minute,
    on_sale: e.on_sale,
    created_at: iso(e.created_at)!,
    sizes: zones
      .filter((z) => z.event_id === e.id && (z.capacity > 0 || z.sold > 0))
      .sort((a, b) => compareSizes(a.name_mn, b.name_mn))
      .map((z) => ({
        zone_id: z.id,
        size: z.name_mn,
        count: z.capacity,
        out: z.sold,
        available: Math.max(0, z.capacity - z.sold),
      })),
  };
}

const RINK_EVENT_COLS = `id, title, price, rink_duration_minutes AS duration_minutes,
  rink_overtime_per_minute AS overtime_per_minute, show_on_kiosk AS on_sale, created_at`;

export async function listRinks(): Promise<VenueResult<AdminRink[]>> {
  const d = db();
  if (!d) return NO_DB;
  const { rows: events } = await d.query<RinkEventRow>(
    `SELECT ${RINK_EVENT_COLS} FROM public.events WHERE kind = 'rink' ORDER BY created_at ASC`,
  );
  if (events.length === 0) return { ok: true, data: [] };
  const { rows: zones } = await d.query<ZoneRow>(
    `SELECT id, event_id, name_mn, capacity, sold, sort_order FROM public.zones WHERE event_id = ANY($1)`,
    [events.map((e) => e.id)],
  );
  return { ok: true, data: events.map((e) => toAdminRink(e, zones)) };
}

export function validateRinkInput(input: AdminRinkInput): string | null {
  if (!input.title?.trim()) return "title_required";
  if (!Number.isInteger(input.price) || input.price < 0) return "invalid_price";
  if (!Number.isInteger(input.duration_minutes) || input.duration_minutes < 1 || input.duration_minutes > 1440)
    return "invalid_duration";
  if (!Number.isInteger(input.overtime_per_minute) || input.overtime_per_minute < 0)
    return "invalid_overtime_rate";
  const seen = new Set<string>();
  for (const s of input.sizes ?? []) {
    const size = s.size?.trim();
    if (!size) return "invalid_size";
    if (seen.has(size)) return "duplicate_size";
    seen.add(size);
    if (!Number.isInteger(s.count) || s.count < 0 || s.count > 9999) return "invalid_count";
  }
  if (seen.size === 0) return "sizes_required";
  return null;
}

async function syncSizes(
  c: pg.PoolClient,
  eventId: string,
  price: number,
  sizes: AdminRinkInput["sizes"],
): Promise<string | null> {
  const { rows: existing } = await c.query<ZoneRow>(
    `SELECT id, event_id, name_mn, capacity, sold, sort_order FROM public.zones WHERE event_id = $1 FOR UPDATE`,
    [eventId],
  );
  const byName = new Map(existing.map((z) => [z.name_mn, z]));
  const wanted = new Map(sizes.map((s) => [s.size.trim(), s.count]));
  const order = [...wanted.keys()].sort(compareSizes);

  for (const z of existing) {
    const count = wanted.get(z.name_mn);
    // A size is never deleted (its tickets reference it): dropping it sets 0.
    if ((count ?? 0) < z.sold) return "count_below_out";
  }
  for (const [i, size] of order.entries()) {
    const count = wanted.get(size)!;
    const z = byName.get(size);
    if (z) {
      await c.query(
        `UPDATE public.zones SET capacity = $2, price = $3, sort_order = $4 WHERE id = $1`,
        [z.id, count, price, i],
      );
    } else {
      await c.query(
        `INSERT INTO public.zones (event_id, name_mn, name_en, price, capacity, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [eventId, size, `Size ${size}`, price, count, i],
      );
    }
  }
  for (const z of existing) {
    if (!wanted.has(z.name_mn)) {
      await c.query(`UPDATE public.zones SET capacity = 0 WHERE id = $1`, [z.id]);
    }
  }
  return null;
}

async function loadRink(id: string): Promise<AdminRink | null> {
  const res = await listRinks();
  return res.ok ? (res.data.find((r) => r.id === id) ?? null) : null;
}

export async function createRink(input: AdminRinkInput): Promise<VenueResult<AdminRink>> {
  const d = db();
  if (!d) return NO_DB;
  const bad = validateRinkInput(input);
  if (bad) return { ok: false, error: bad, status: 400 };
  const id = await d.transaction(async (c) => {
    const { rows } = await c.query<{ id: string }>(
      `INSERT INTO public.events
         (title, kind, status, start_time, price, rink_duration_minutes, rink_overtime_per_minute,
          show_on_web, show_on_kiosk)
       VALUES ($1, 'rink', 'upcoming', now(), $2, $3, $4, false, $5)
       RETURNING id`,
      [input.title.trim(), input.price, input.duration_minutes, input.overtime_per_minute, input.on_sale ?? true],
    );
    await syncSizes(c, rows[0].id, input.price, input.sizes);
    return rows[0].id;
  });
  return { ok: true, data: (await loadRink(id))! };
}

export async function updateRink(
  id: string,
  input: AdminRinkInput,
): Promise<VenueResult<AdminRink>> {
  const d = db();
  if (!d) return NO_DB;
  const bad = validateRinkInput(input);
  if (bad) return { ok: false, error: bad, status: 400 };
  const err = await d.transaction(async (c) => {
    const { rowCount } = await c.query(
      `UPDATE public.events
          SET title = $2, price = $3, rink_duration_minutes = $4, rink_overtime_per_minute = $5,
              show_on_kiosk = coalesce($6, show_on_kiosk)
        WHERE id = $1 AND kind = 'rink'`,
      [id, input.title.trim(), input.price, input.duration_minutes, input.overtime_per_minute, input.on_sale ?? null],
    );
    if (!rowCount) return "not_found";
    const sizeErr = await syncSizes(c, id, input.price, input.sizes);
    if (sizeErr) throw new RinkInputError(sizeErr);
    return null;
  }).catch((e: unknown) => {
    if (e instanceof RinkInputError) return e.code;
    throw e;
  });
  if (err === "not_found") return { ok: false, error: err, status: 404 };
  if (err) return { ok: false, error: err, status: 409 };
  return { ok: true, data: (await loadRink(id))! };
}

class RinkInputError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export async function rinkLive(): Promise<VenueResult<AdminRinkLive>> {
  const d = db();
  if (!d) return NO_DB;
  const { rows } = await d.query<TicketRow>(
    `${TICKET_SQL}
      WHERE e.kind = 'rink'
        AND (t.status IN ('active', 'overdue')
             OR (t.status = 'done' AND (t.ended_at AT TIME ZONE '${UB}')::date = (now() AT TIME ZONE '${UB}')::date))
      ORDER BY t.ends_at ASC NULLS LAST, t.code ASC`,
  );
  const { rows: totals } = await d.query<{
    sold_today: number;
    now: string;
  }>(
    `SELECT count(*)::int AS sold_today, now() AS now
       FROM public.venue_tickets t
       JOIN public.venue_orders o ON o.id = t.order_id
       JOIN public.events e ON e.id = o.event_id
      WHERE e.kind = 'rink' AND t.status <> 'void'
        AND (o.paid_at AT TIME ZONE '${UB}')::date = (now() AT TIME ZONE '${UB}')::date`,
  );
  const session = (r: TicketRow): AdminRinkSession => ({
    ...toView(r),
    phone: r.buyer_phone,
    paid_at: iso(r.paid_at),
  });
  const active = rows.filter((r) => r.status === "active").map(session);
  const overdue = rows.filter((r) => r.status === "overdue").map(session);
  const doneToday = rows
    .filter((r) => r.status === "done")
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())
    .map(session);
  const paid = (via: "qpay" | "cash") =>
    doneToday
      .filter((s) => s.overtime_paid_via === via)
      .reduce((sum, s) => sum + (s.overtime_amount ?? 0), 0);
  return {
    ok: true,
    data: {
      server_time: iso(totals[0].now)!,
      active,
      overdue,
      done_today: doneToday,
      totals: {
        sold_today: totals[0].sold_today,
        on_ice: active.length,
        overdue: overdue.length,
        overtime_paid_qpay: paid("qpay"),
        overtime_paid_cash: paid("cash"),
      },
    },
  };
}
