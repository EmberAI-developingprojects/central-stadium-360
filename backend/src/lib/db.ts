import pg from "pg";

// A small query builder over node-postgres that mirrors the slice of the
// supabase-js / PostgREST API this backend uses (`db.from(t).select().eq()…`),
// so call sites stayed unchanged when the database moved to Cloud SQL.
// Rows are serialised to JSON inside Postgres, which keeps timestamps
// (`…T03:00:00+00:00`) and numerics in exactly the shape PostgREST returned.

export interface DbError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface DbResult<T = any> {
  data: T | null;
  error: DbError | null;
  count: number | null;
}

type Relation = { child: string; childCol: string; parent: string; parentCol: string };

interface Meta {
  columnTypes: Map<string, Map<string, string>>;
  primaryKeys: Map<string, string[]>;
  relations: Relation[];
}

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

function toDbError(err: unknown): DbError {
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { code?: string; message: string; detail?: string; hint?: string };
    return { code: e.code, message: e.message, details: e.detail, hint: e.hint };
  }
  return { message: String(err) };
}

/** Split on commas that are not inside parentheses. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

class Params {
  values: unknown[] = [];
  add(v: unknown): string {
    this.values.push(v);
    return `$${this.values.length}`;
  }
}

type Cond =
  | { kind: "op"; col: string; op: string; value: unknown; negate?: boolean }
  | { kind: "or"; parts: Cond[] };

const SQL_OPS: Record<string, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "LIKE",
  ilike: "ILIKE",
};

function renderCond(c: Cond, alias: string, p: Params): string {
  if (c.kind === "or") {
    return `(${c.parts.map((x) => renderCond(x, alias, p)).join(" OR ")})`;
  }
  const col = `${alias}.${ident(c.col)}`;
  let sql: string;
  if (c.op === "is") {
    const v = c.value;
    sql = v === null || v === "null" ? `${col} IS NULL` : `${col} IS ${v === true || v === "true" ? "TRUE" : "FALSE"}`;
  } else if (c.op === "in") {
    sql = `${col} = ANY(${p.add(c.value)})`;
  } else {
    const op = SQL_OPS[c.op];
    if (!op) throw new Error(`unsupported filter operator: ${c.op}`);
    sql = `${col} ${op} ${p.add(c.value)}`;
  }
  return c.negate ? `NOT (${sql})` : sql;
}

/** Parse a PostgREST `or` string such as `a.is.null,a.gt.2026-01-01T00:00:00Z`. */
function parseOr(expr: string): Cond {
  const parts = splitTopLevel(expr).map((item): Cond => {
    const first = item.indexOf(".");
    const second = item.indexOf(".", first + 1);
    const col = item.slice(0, first);
    let op = item.slice(first + 1, second);
    const raw = item.slice(second + 1);
    let negate = false;
    if (op === "not") {
      const third = raw.indexOf(".");
      op = raw.slice(0, third);
      return { kind: "op", col, op, value: decodeOrValue(op, raw.slice(third + 1)), negate: true };
    }
    return { kind: "op", col, op, value: decodeOrValue(op, raw), negate };
  });
  return { kind: "or", parts };
}

function decodeOrValue(op: string, raw: string): unknown {
  if (op === "is") return raw === "null" ? null : raw === "true";
  if (op === "in") return raw.replace(/^\(|\)$/g, "").split(",");
  return raw;
}

export class QueryBuilder implements PromiseLike<DbResult<any[]>> {
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private columns: string | null = null;
  private countMode = false;
  private headOnly = false;
  private payload: unknown = null;
  private conflictTarget: string | null = null;
  private conds: Cond[] = [];
  private orderBy: { col: string; ascending: boolean; nullsFirst?: boolean }[] = [];
  private limitN: number | null = null;
  private offsetN: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";

  constructor(
    private readonly db: Db,
    private readonly table: string,
  ) {}

  select(columns = "*", opts?: { count?: "exact"; head?: boolean }): this {
    this.columns = columns.replace(/\s+/g, "");
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  insert(values: unknown): this {
    this.action = "insert";
    this.payload = values;
    return this;
  }

  upsert(values: unknown, opts?: { onConflict?: string }): this {
    this.action = "upsert";
    this.payload = values;
    this.conflictTarget = opts?.onConflict ?? null;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.action = "update";
    this.payload = values;
    return this;
  }

  delete(): this {
    this.action = "delete";
    return this;
  }

  private op(col: string, op: string, value: unknown, negate = false): this {
    this.conds.push({ kind: "op", col, op, value, negate });
    return this;
  }

  eq(col: string, value: unknown) { return this.op(col, "eq", value); }
  neq(col: string, value: unknown) { return this.op(col, "neq", value); }
  gt(col: string, value: unknown) { return this.op(col, "gt", value); }
  gte(col: string, value: unknown) { return this.op(col, "gte", value); }
  lt(col: string, value: unknown) { return this.op(col, "lt", value); }
  lte(col: string, value: unknown) { return this.op(col, "lte", value); }
  like(col: string, value: string) { return this.op(col, "like", value); }
  ilike(col: string, value: string) { return this.op(col, "ilike", value); }
  in(col: string, values: readonly unknown[]) { return this.op(col, "in", [...values]); }
  is(col: string, value: null | boolean) { return this.op(col, "is", value); }
  not(col: string, op: string, value: unknown) { return this.op(col, op, value, true); }

  or(expr: string): this {
    this.conds.push(parseOr(expr));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orderBy.push({ col, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst });
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetN = from;
    this.limitN = to - from + 1;
    return this;
  }

  single<T = any>(): PromiseLike<DbResult<T>> {
    this.mode = "single";
    return this as unknown as PromiseLike<DbResult<T>>;
  }

  maybeSingle<T = any>(): PromiseLike<DbResult<T>> {
    this.mode = "maybeSingle";
    return this as unknown as PromiseLike<DbResult<T>>;
  }

  then<R1 = DbResult<any[]>, R2 = never>(
    onfulfilled?: ((value: DbResult<any[]>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<DbResult<any[]>> {
    try {
      const meta = await this.db.meta();
      return await this.run(meta);
    } catch (err) {
      return { data: null, error: toDbError(err), count: null };
    }
  }

  private where(alias: string, p: Params): string {
    if (this.conds.length === 0) return "";
    return ` WHERE ${this.conds.map((c) => renderCond(c, alias, p)).join(" AND ")}`;
  }

  private async run(meta: Meta): Promise<DbResult<any>> {
    const table = `public.${ident(this.table)}`;
    const p = new Params();

    if (this.action === "select") {
      const where = this.where("a0", p);
      let count: number | null = null;
      if (this.countMode) {
        const r = await this.db.query(`SELECT count(*)::int AS c FROM ${table} a0${where}`, p.values);
        count = r.rows[0].c;
        if (this.headOnly) return { data: null, error: null, count };
      }
      let sql = `SELECT ${this.jsonRow(meta, this.table, this.columns ?? "*", 0)} AS r FROM ${table} a0${where}`;
      if (this.orderBy.length) {
        sql += ` ORDER BY ${this.orderBy
          .map((o) => {
            let s = `a0.${ident(o.col)} ${o.ascending ? "ASC" : "DESC"}`;
            if (o.nullsFirst !== undefined) s += o.nullsFirst ? " NULLS FIRST" : " NULLS LAST";
            return s;
          })
          .join(", ")}`;
      }
      if (this.limitN !== null) sql += ` LIMIT ${Math.trunc(this.limitN)}`;
      if (this.offsetN !== null) sql += ` OFFSET ${Math.trunc(this.offsetN)}`;
      const r = await this.db.query(sql, p.values);
      return this.shape(r.rows.map((x) => x.r), count);
    }

    let mutation: string;
    const types = meta.columnTypes.get(this.table) ?? new Map<string, string>();
    const encode = (col: string, v: unknown) => {
      const t = types.get(col);
      if ((t === "json" || t === "jsonb") && v !== null && v !== undefined) return JSON.stringify(v);
      return v;
    };

    if (this.action === "insert" || this.action === "upsert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Record<string, unknown>[];
      if (rows.length === 0) return this.shape([], null);
      const cols: string[] = [];
      for (const row of rows) for (const k of Object.keys(row)) if (!cols.includes(k)) cols.push(k);
      const values = rows
        .map((row) => `(${cols.map((c) => (c in row ? p.add(encode(c, row[c])) : "DEFAULT")).join(", ")})`)
        .join(", ");
      mutation = `INSERT INTO ${table} (${cols.map(ident).join(", ")}) VALUES ${values}`;
      if (this.action === "upsert") {
        const target = this.conflictTarget
          ? this.conflictTarget.split(",").map((s) => s.trim())
          : meta.primaryKeys.get(this.table) ?? ["id"];
        const updatable = cols.filter((c) => !target.includes(c));
        mutation += ` ON CONFLICT (${target.map(ident).join(", ")}) DO ${
          updatable.length
            ? `UPDATE SET ${updatable.map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`).join(", ")}`
            : "NOTHING"
        }`;
      }
    } else {
      if (this.conds.length === 0) {
        const verb = this.action === "update" ? "UPDATE" : "DELETE";
        return { data: null, error: { code: "21000", message: `${verb} requires a WHERE clause` }, count: null };
      }
      if (this.action === "update") {
        const entries = Object.entries((this.payload ?? {}) as Record<string, unknown>).filter(
          ([, v]) => v !== undefined,
        );
        if (entries.length === 0) {
          // Nothing to change: behave like a read of the matching rows.
          if (this.columns === null) return this.shape(null, null);
          const where = this.where("a0", p);
          const r = await this.db.query(
            `SELECT ${this.jsonRow(meta, this.table, this.columns, 0)} AS r FROM ${table} a0${where}`,
            p.values,
          );
          return this.shape(r.rows.map((x) => x.r), null);
        }
        const set = entries.map(([c, v]) => `${ident(c)} = ${p.add(encode(c, v))}`).join(", ");
        mutation = `UPDATE ${table} AS a0 SET ${set}${this.where("a0", p)}`;
      } else {
        mutation = `DELETE FROM ${table} AS a0${this.where("a0", p)}`;
      }
    }

    if (this.columns === null) {
      await this.db.query(mutation, p.values);
      return { data: null, error: null, count: null };
    }
    const r = await this.db.query(
      `WITH _r AS (${mutation} RETURNING *) SELECT ${this.jsonRow(meta, this.table, this.columns, 0)} AS r FROM _r a0`,
      p.values,
    );
    return this.shape(r.rows.map((x) => x.r), null);
  }

  private shape(rows: unknown[] | null, count: number | null): DbResult<any> {
    if (this.mode === "many") return { data: rows, error: null, count };
    const list = rows ?? [];
    if (list.length === 1) return { data: list[0], error: null, count };
    if (list.length === 0 && this.mode === "maybeSingle") return { data: null, error: null, count };
    return {
      data: null,
      error: {
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
        details: `The result contains ${list.length} rows`,
      },
      count,
    };
  }

  /**
   * Build a json expression for one row of `table` aliased `a{depth}`. Plain
   * `json` (not jsonb) keeps keys in column order, as PostgREST does.
   */
  private jsonRow(meta: Meta, table: string, select: string, depth: number): string {
    const alias = `a${depth}`;
    const items = splitTopLevel(select).flatMap((item) =>
      item === "*" ? [...(meta.columnTypes.get(table)?.keys() ?? [])] : [item],
    );
    const pairs: string[] = [];
    for (const item of items) {
      const m = /^(?:([A-Za-z_][\w]*):)?([A-Za-z_][\w]*)\((.*)\)$/.exec(item);
      if (!m) {
        pairs.push(`'${item}', ${alias}.${ident(item)}`);
        continue;
      }
      const key = m[1] ?? m[2];
      const rel = m[2];
      const inner = m[3];
      const child = `a${depth + 1}`;
      const many = meta.relations.find((r) => r.parent === table && r.child === rel);
      const one = meta.relations.find((r) => r.child === table && r.parent === rel);
      if (many) {
        const join = `${child}.${ident(many.childCol)} = ${alias}.${ident(many.parentCol)}`;
        if (inner === "count") {
          pairs.push(
            `'${key}', json_build_array(json_build_object('count', (SELECT count(*) FROM public.${ident(rel)} ${child} WHERE ${join})))`,
          );
        } else {
          pairs.push(
            `'${key}', coalesce((SELECT jsonb_agg(${this.jsonRow(meta, rel, inner, depth + 1)}) FROM public.${ident(rel)} ${child} WHERE ${join}), '[]'::jsonb)`,
          );
        }
      } else if (one) {
        const join = `${child}.${ident(one.parentCol)} = ${alias}.${ident(one.childCol)}`;
        pairs.push(
          `'${key}', (SELECT ${this.jsonRow(meta, rel, inner, depth + 1)} FROM public.${ident(rel)} ${child} WHERE ${join})`,
        );
      } else {
        throw new Error(`no relationship between ${table} and ${rel}`);
      }
    }
    // PostgREST emits embedded rows as jsonb (keys sorted by length, then
    // name) but top-level rows in column order; mirror both.
    if (depth > 0) return `jsonb_build_object(${pairs.join(", ")})`;
    if (pairs.length <= 50) return `json_build_object(${pairs.join(", ")})`;
    // json_build_object takes at most 100 arguments; past that, merge jsonb chunks.
    const chunks: string[] = [];
    for (let i = 0; i < pairs.length; i += 50) chunks.push(`jsonb_build_object(${pairs.slice(i, i + 50).join(", ")})`);
    return `(${chunks.join(" || ")})::json`;
  }
}

class RpcBuilder implements PromiseLike<DbResult<any>> {
  constructor(
    private readonly db: Db,
    private readonly fn: string,
    private readonly args: Record<string, unknown>,
  ) {}

  then<R1 = DbResult<any>, R2 = never>(
    onfulfilled?: ((value: DbResult<any>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<DbResult<any>> {
    try {
      const info = await this.db.query<{ retset: boolean; rettype: string }>(
        `SELECT p.proretset AS retset, p.prorettype::regtype::text AS rettype
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = $1 LIMIT 1`,
        [this.fn],
      );
      if (info.rows.length === 0) throw new Error(`function public.${this.fn} does not exist`);
      const p = new Params();
      const call = `public.${ident(this.fn)}(${Object.entries(this.args)
        .map(([k, v]) => `${ident(k)} => ${p.add(v)}`)
        .join(", ")})`;
      const { retset, rettype } = info.rows[0];
      if (rettype === "void") {
        await this.db.query(`SELECT ${call}`, p.values);
        return { data: null, error: null, count: null };
      }
      const sql = retset
        ? `SELECT coalesce(json_agg(x), '[]'::json) AS r FROM ${call} x`
        : `SELECT to_json(${call}) AS r`;
      const r = await this.db.query(sql, p.values);
      return { data: r.rows[0].r, error: null, count: null };
    } catch (err) {
      return { data: null, error: toDbError(err), count: null };
    }
  }
}

export class Db {
  private metaPromise: Promise<Meta> | null = null;

  constructor(readonly pool: pg.Pool) {}

  from(table: string): QueryBuilder {
    return new QueryBuilder(this, table);
  }

  rpc(fn: string, args: Record<string, unknown> = {}): RpcBuilder {
    return new RpcBuilder(this, fn, args);
  }

  query<R extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []) {
    return this.pool.query<R>(sql, params);
  }

  /** Run `fn` inside a transaction on a single connection. */
  async transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const out = await fn(client);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  meta(): Promise<Meta> {
    if (!this.metaPromise) {
      this.metaPromise = loadMeta(this).catch((err) => {
        this.metaPromise = null;
        throw err;
      });
    }
    return this.metaPromise;
  }
}

async function loadMeta(db: Db): Promise<Meta> {
  const [cols, pks, fks] = await Promise.all([
    db.query<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`,
    ),
    db.query<{ table_name: string; column_name: string }>(
      `SELECT c.relname AS table_name, a.attname AS column_name
         FROM pg_index i
         JOIN pg_class c ON c.oid = i.indrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
         JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
        WHERE i.indisprimary`,
    ),
    db.query<Relation>(
      `SELECT cl.relname AS child, ca.attname AS "childCol", pcl.relname AS parent, pa.attname AS "parentCol"
         FROM pg_constraint c
         JOIN pg_class cl ON cl.oid = c.conrelid
         JOIN pg_namespace cn ON cn.oid = cl.relnamespace AND cn.nspname = 'public'
         JOIN pg_class pcl ON pcl.oid = c.confrelid
         JOIN pg_namespace pn ON pn.oid = pcl.relnamespace AND pn.nspname = 'public'
         JOIN pg_attribute ca ON ca.attrelid = c.conrelid AND ca.attnum = c.conkey[1]
         JOIN pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1`,
    ),
  ]);
  const columnTypes = new Map<string, Map<string, string>>();
  for (const r of cols.rows) {
    if (!columnTypes.has(r.table_name)) columnTypes.set(r.table_name, new Map());
    columnTypes.get(r.table_name)!.set(r.column_name, r.data_type);
  }
  const primaryKeys = new Map<string, string[]>();
  for (const r of pks.rows) primaryKeys.set(r.table_name, [...(primaryKeys.get(r.table_name) ?? []), r.column_name]);
  return { columnTypes, primaryKeys, relations: fks.rows };
}

let cached: Db | null = null;

/**
 * Connection comes from DATABASE_URL, or the standard PG* variables
 * (on Cloud Run: PGHOST=/cloudsql/<instance>, PGUSER, PGDATABASE, PGPASSWORD).
 */
export function getDb(): Db | null {
  if (cached) return cached;
  if (!process.env.DATABASE_URL && !process.env.PGHOST) return null;
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    options: "-c TimeZone=UTC",
  });
  pool.on("error", (err) => console.error("[db] idle client error", err.message));
  cached = new Db(pool);
  return cached;
}
