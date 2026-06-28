import { Hono } from "hono";
import { z } from "zod";
import type { DbHistoryFigure } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

const FIGURE_COLS_FULL =
  "id,name,role,year_start,year_end,image,bio,name_en,role_en,bio_en,sort_order,created_at";
const FIGURE_COLS_NO_EN =
  "id,name,role,year_start,year_end,image,bio,sort_order,created_at";

let enColumnsAvailable: boolean | null = null;

function pickFigureCols(): string {
  return enColumnsAvailable === false ? FIGURE_COLS_NO_EN : FIGURE_COLS_FULL;
}

function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "42703" ||
    (typeof e.message === "string" && e.message.includes(column))
  );
}

function isMissingEnColumnError(err: unknown): boolean {
  return (
    isMissingColumnError(err, "name_en") ||
    isMissingColumnError(err, "role_en") ||
    isMissingColumnError(err, "bio_en")
  );
}

type FigureQueryResult = {
  data: Array<Record<string, unknown>> | null;
  error: { code?: string; message?: string } | null;
};

const queryFigures = async (
  admin: SupabaseAdmin,
  cols: string,
): Promise<FigureQueryResult> => {
  const res = await admin
    .from("history_figures")
    .select(cols)
    .order("sort_order", { ascending: true });
  return res as unknown as FigureQueryResult;
};

const insertFigures = async (
  admin: SupabaseAdmin,
  rows: Array<Record<string, unknown>>,
  cols: string,
): Promise<FigureQueryResult> => {
  const res = await admin
    .from("history_figures")
    .insert(rows)
    .select(cols);
  return res as unknown as FigureQueryResult;
};

const figureSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().default(""),
  role: z.string().default(""),
  year_start: z.string().default(""),
  year_end: z.string().default(""),
  image: z.string().nullable().optional(),
  bio: z.string().default(""),
  name_en: z.string().nullable().optional(),
  role_en: z.string().nullable().optional(),
  bio_en: z.string().nullable().optional(),
});

const figuresSchema = z.array(figureSchema);

export const publicHistory = new Hono();

publicHistory.get("/", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  let result = await queryFigures(admin, pickFigureCols());
  if (result.error && isMissingEnColumnError(result.error)) {
    enColumnsAvailable = false;
    result = await queryFigures(admin, FIGURE_COLS_NO_EN);
  } else if (!result.error) {
    enColumnsAvailable = true;
  }
  if (result.error) {
    return c.json(
      { ok: false, error: result.error.message ?? "query_failed" } as const,
      500,
    );
  }
  return c.json({
    ok: true,
    data: (result.data ?? []) as unknown as DbHistoryFigure[],
  } as const);
});

const adminHistory = new Hono<AuthEnv>();

adminHistory.use("*", requireUser);
adminHistory.use("*", async (c, next) => requireAdmin(c, next));

adminHistory.get("/", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  let result = await queryFigures(admin, pickFigureCols());
  if (result.error && isMissingEnColumnError(result.error)) {
    enColumnsAvailable = false;
    result = await queryFigures(admin, FIGURE_COLS_NO_EN);
  } else if (!result.error) {
    enColumnsAvailable = true;
  }
  if (result.error) {
    return c.json(
      { ok: false, error: result.error.message ?? "query_failed" } as const,
      500,
    );
  }
  return c.json({
    ok: true,
    data: (result.data ?? []) as unknown as DbHistoryFigure[],
  } as const);
});

adminHistory.put("/", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const body = await c.req.json().catch(() => null);
  const parsed = figuresSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
      400,
    );
  }

  const { error: delErr } = await admin
    .from("history_figures")
    .delete()
    .not("id", "is", null);
  if (delErr) {
    return c.json({ ok: false, error: delErr.message } as const, 500);
  }

  if (parsed.data.length === 0) {
    return c.json({ ok: true, data: [] } as const);
  }

  const rows: Array<Record<string, unknown>> = parsed.data.map((it, i) => {
    const { id: _omit, ...rest } = it as { id?: string } & Record<
      string,
      unknown
    >;
    return { ...rest, sort_order: i };
  });

  const stripEnFields = (
    rs: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> =>
    rs.map((r) => {
      const {
        name_en: _n,
        role_en: _r,
        bio_en: _b,
        ...rest
      } = r as {
        name_en?: unknown;
        role_en?: unknown;
        bio_en?: unknown;
      } & Record<string, unknown>;
      return rest;
    });

  let result = await insertFigures(
    admin,
    enColumnsAvailable === false ? stripEnFields(rows) : rows,
    pickFigureCols(),
  );

  if (result.error && isMissingEnColumnError(result.error)) {
    enColumnsAvailable = false;
    result = await insertFigures(admin, stripEnFields(rows), FIGURE_COLS_NO_EN);
  } else if (!result.error) {
    enColumnsAvailable = true;
  }

  if (result.error) {
    return c.json(
      { ok: false, error: result.error.message ?? "insert_failed" } as const,
      500,
    );
  }
  return c.json({
    ok: true,
    data: (result.data ?? []) as unknown as DbHistoryFigure[],
  } as const);
});

export default adminHistory;
