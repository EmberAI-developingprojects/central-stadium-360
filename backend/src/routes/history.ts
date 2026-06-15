import { Hono } from "hono";
import { z } from "zod";
import type { DbHistoryFigure } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const FIGURE_COLS =
  "id,name,role,year_start,year_end,image,bio,sort_order,created_at";

const figureSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().default(""),
  role: z.string().default(""),
  year_start: z.string().default(""),
  year_end: z.string().default(""),
  image: z.string().nullable().optional(),
  bio: z.string().default(""),
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
  const { data, error } = await admin
    .from("history_figures")
    .select(FIGURE_COLS)
    .order("sort_order", { ascending: true });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({
    ok: true,
    data: (data ?? []) as DbHistoryFigure[],
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
  const { data, error } = await admin
    .from("history_figures")
    .select(FIGURE_COLS)
    .order("sort_order", { ascending: true });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  return c.json({
    ok: true,
    data: (data ?? []) as DbHistoryFigure[],
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

  const rows = parsed.data.map((it, i) => {
    const { id: _omit, ...rest } = it as { id?: string } & Record<
      string,
      unknown
    >;
    return { ...rest, sort_order: i };
  });

  const { data, error: insErr } = await admin
    .from("history_figures")
    .insert(rows)
    .select(FIGURE_COLS);

  if (insErr) {
    return c.json({ ok: false, error: insErr.message } as const, 500);
  }
  return c.json({
    ok: true,
    data: (data ?? []) as DbHistoryFigure[],
  } as const);
});

export default adminHistory;
