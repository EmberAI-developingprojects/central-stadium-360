// Shared setup for the backend integration tests.
//
// Each test file gets its own database cloned from a template that holds a
// real backup plus every migration (see test/README.md), a fake QPay on a
// random local port, and the app exercised in-process through app.request().
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";

const ADMIN_URL =
  process.env.TEST_PG_ADMIN_URL ?? "postgres://postgres:localdev@127.0.0.1:55432/postgres";
const TEMPLATE = process.env.TEST_PG_TEMPLATE ?? "cs360_tmpl";

export const KIOSK_KEY = "test-kiosk-key";
export const INTERNAL_SECRET = "test-internal-secret";
export const CALLBACK_SECRET = "test-callback-secret";

export type FakeQPay = {
  url: string;
  invoices: Map<string, { amount: number; body: Record<string, unknown>; paid: number }>;
  /** Mark an invoice paid with this amount (defaults to the invoice amount). */
  pay(invoiceId: string, amount?: number): void;
  close(): Promise<void>;
};

function startFakeQPay(): Promise<FakeQPay> {
  const invoices: FakeQPay["invoices"] = new Map();
  const server: Server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const send = (status: number, json: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(json));
    };
    if (req.url === "/v2/auth/token" || req.url === "/v2/auth/refresh") {
      return send(200, {
        token_type: "bearer",
        access_token: "fake",
        refresh_token: "fake",
        expires_in: Math.floor(Date.now() / 1000) + 3600,
        refresh_expires_in: Math.floor(Date.now() / 1000) + 7200,
      });
    }
    if (req.url === "/v2/invoice" && req.method === "POST") {
      const id = `inv-${randomUUID()}`;
      invoices.set(id, { amount: Number(body.amount), body, paid: 0 });
      return send(200, { invoice_id: id, qr_text: `QR:${id}`, qr_image: "", urls: [] });
    }
    if (req.url === "/v2/payment/check") {
      const inv = invoices.get(String(body.object_id));
      if (!inv || inv.paid <= 0) return send(200, { count: 0, paid_amount: 0, rows: [] });
      return send(200, {
        count: 1,
        paid_amount: inv.paid,
        rows: [{ payment_id: `pay-${body.object_id}`, payment_status: "PAID", payment_amount: inv.paid }],
      });
    }
    send(404, { error: "not_found" });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        invoices,
        pay(id, amount) {
          const inv = invoices.get(id);
          if (!inv) throw new Error(`no invoice ${id}`);
          inv.paid = amount ?? inv.amount;
        },
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

export type TestEnv = {
  dbName: string;
  qpay: FakeQPay;
  /** Raw SQL against the test database (a separate pool from the app's). */
  sql: pg.Pool;
  teardown(): Promise<void>;
};

/** Fresh database + env. Must run before the app module is imported. */
export async function setupTestEnv(name: string): Promise<TestEnv> {
  const dbName = `cs360_test_${name}_${process.pid}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await admin.query(`CREATE DATABASE ${dbName} TEMPLATE ${TEMPLATE}`);
  await admin.end();

  const qpay = await startFakeQPay();
  const dbUrl = ADMIN_URL.replace(/\/[^/]*$/, `/${dbName}`);
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: dbUrl,
    PG_POOL_MAX: "10",
    AUTH_JWT_SECRET: "test-jwt-secret-test-jwt-secret-test",
    KIOSK_API_KEY: KIOSK_KEY,
    INTERNAL_API_SECRET: INTERNAL_SECRET,
    QPAY_CALLBACK_SECRET: CALLBACK_SECRET,
    QPAY_USERNAME: "u",
    QPAY_PASSWORD: "p",
    QPAY_INVOICE_CODE: "TEST_INVOICE",
    QPAY_BASE_URL: qpay.url,
    QPAY_EBARIMT_INVOICE_CODE: "",
    SMS_PROVIDER: "dev",
    PUBLIC_BACKEND_URL: "http://backend.test",
  });
  delete process.env.DEV_AUTH;
  delete process.env.MAINTENANCE_MODE;

  const sql = new pg.Pool({ connectionString: dbUrl, max: 4 });
  return {
    dbName,
    qpay,
    sql,
    async teardown() {
      await sql.end();
      const { getDb } = await import("../src/lib/db");
      await getDb()?.pool.end();
      await qpay.close();
      const a = new pg.Client({ connectionString: ADMIN_URL });
      await a.connect();
      await a.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await a.end();
    },
  };
}

type App = { request: (input: string, init?: RequestInit) => Response | Promise<Response> };

export type Json = { ok: boolean; data?: any; error?: string };

export async function call(
  app: App,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; kiosk?: boolean; headers?: Record<string, string> } = {},
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.kiosk) headers["x-kiosk-key"] = KIOSK_KEY;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await app.request(`/api${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let json: Json;
  try {
    json = JSON.parse(text) as Json;
  } catch {
    json = { ok: false, error: `non_json:${text.slice(0, 80)}` };
  }
  return { status: res.status, json };
}

let phoneSeq = 0;

/** A confirmed account with the given role and a live session. */
export async function makeUser(
  role: "user" | "admin" | "scanner",
  password = "Passw0rd!",
): Promise<{ id: string; token: string; phone: string; password: string }> {
  const { getDb } = await import("../src/lib/db");
  const { createAuthUser } = await import("../src/lib/auth/accounts");
  const { createSession } = await import("../src/lib/auth/tokens");
  const db = getDb()!;
  const phone = `+9768${String(process.pid % 1000).padStart(3, "0")}${String(++phoneSeq).padStart(4, "0")}`;
  const id = await createAuthUser(db, {
    phone,
    password,
    fullName: `Test ${role} ${phoneSeq}`,
    phoneConfirmed: true,
  });
  await db.query(
    `INSERT INTO public.users (id, phone, full_name, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET role = excluded.role`,
    [id, phone, `Test ${role}`, role],
  );
  const s = await createSession(db, id);
  return { id, token: s.access_token, phone, password };
}

/** Capture console.log lines while `fn` runs (the dev SMS provider logs there). */
export async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    return { result: await fn(), lines };
  } finally {
    console.log = orig;
  }
}
