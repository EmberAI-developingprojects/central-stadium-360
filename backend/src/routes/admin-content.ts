import { Hono } from "hono";
import { z } from "zod";
import type {
  DbHomeHero,
  DbHomeNews,
  DbHomePartner,
  DbHomeRoadmap,
  DbHomeService,
  HomeContentResponse,
} from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  requireUser,
  requireAdmin,
  type AuthEnv,
} from "../middleware/require-user";

const adminContent = new Hono<AuthEnv>();

// GET is public (homepage anon read); writes require admin.
// Mounted under /api/admin/content, but we open up the GET via a separate
// public path below.

adminContent.use("*", requireUser);
adminContent.use("*", async (c, next) => requireAdmin(c, next));

const NEWS_COLS_WITH_BLOCKS =
  "id,label,title,body,image,featured,blocks,sort_order,created_at";
const NEWS_COLS_NO_BLOCKS =
  "id,label,title,body,image,featured,sort_order,created_at";

// Track whether the `blocks` column exists. We discover this lazily so the API
// works on databases where the 0006 migration has not been applied yet.
let blocksColumnAvailable: boolean | null = null;

function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "42703" ||
    (typeof e.message === "string" && e.message.includes(column))
  );
}
const PARTNER_COLS = "id,image,alt,sort_order,created_at";
const ROADMAP_COLS = "id,year,title,position,sort_order,created_at";
const SERVICE_COLS =
  "id,title,description,icon_key,href,badge,sort_order,created_at";

const newsBlockSchema = z.object({
  type: z.enum(["text", "image"]),
  value: z.string().default(""),
});

const newsItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().default(""),
  title: z.string().default(""),
  body: z.string().default(""),
  image: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  blocks: z.array(newsBlockSchema).default([]),
});

const partnerItemSchema = z.object({
  id: z.string().uuid().optional(),
  image: z.string().default(""),
  alt: z.string().default(""),
});

const roadmapItemSchema = z.object({
  id: z.string().uuid().optional(),
  year: z.string().default(""),
  title: z.string().default(""),
  position: z.enum(["top", "bot"]).default("top"),
});

const serviceItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().default(""),
  description: z.string().default(""),
  icon_key: z.string().default("music"),
  href: z.string().default("#"),
  badge: z.string().nullable().optional(),
});

const heroItemSchema = z.object({
  slot: z.string(),
  image_url: z.string().default(""),
  alt: z.string().default(""),
});

const sectionSchemas = {
  news: z.array(newsItemSchema),
  partners: z.array(partnerItemSchema),
  roadmap: z.array(roadmapItemSchema),
  services: z.array(serviceItemSchema),
  hero: z.array(heroItemSchema),
} as const;

const TABLE_FOR_SECTION = {
  news: "home_news",
  partners: "home_partners",
  roadmap: "home_roadmap",
  services: "home_services",
  hero: "home_hero",
} as const;

adminContent.put("/:section", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const section = c.req.param("section") as keyof typeof sectionSchemas;
  const schema = sectionSchemas[section];
  if (!schema) {
    return c.json({ ok: false, error: "unknown_section" } as const, 400);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
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

  const table = TABLE_FOR_SECTION[section];

  // Hero uses slot as PK — upsert in place instead of delete+insert.
  if (section === "hero") {
    const rows = parsed.data as { slot: string; image_url: string; alt: string }[];
    const { data, error } = await admin
      .from("home_hero")
      .upsert(rows, { onConflict: "slot" })
      .select("slot,image_url,alt");
    if (error) {
      console.error("[admin-content] upsert home_hero failed:", error);
      return c.json({ ok: false, error: error.message } as const, 500);
    }
    return c.json({ ok: true, data: data ?? [] } as const);
  }

  // Replace strategy: wipe the section, then insert the supplied rows
  // with their explicit sort_order. The admin UI sends the full list on
  // every save, so this is the simplest consistent shape.
  const { error: delErr } = await admin
    .from(table)
    .delete()
    .not("id", "is", null);
  if (delErr) {
    console.error(`[admin-content] wipe ${table} failed:`, delErr);
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

  let { data, error: insErr } = await admin
    .from(table)
    .insert(rows)
    .select("*");

  // If the news.blocks column hasn't been migrated yet, retry without it so
  // the rest of the content editor keeps working. Block content is lost in
  // that case but the user is told via the section's load path.
  if (
    insErr &&
    section === "news" &&
    isMissingColumnError(insErr, "blocks")
  ) {
    blocksColumnAvailable = false;
    const rowsNoBlocks = rows.map((r) => {
      const { blocks: _b, ...rest } = r as { blocks?: unknown } & Record<
        string,
        unknown
      >;
      return rest;
    });
    const retry = await admin
      .from(table)
      .insert(rowsNoBlocks)
      .select("*");
    data = retry.data;
    insErr = retry.error;
  }

  if (insErr) {
    console.error(`[admin-content] insert ${table} failed:`, insErr);
    return c.json({ ok: false, error: insErr.message } as const, 500);
  }
  return c.json({ ok: true, data: data ?? [] } as const);
});

export default adminContent;

// -----------------------------------------------------------------------------
// Public home content GET — separate Hono app so the public route is not
// behind requireAdmin. Mounted in app.ts at /api/content.
// -----------------------------------------------------------------------------
export const publicContent = new Hono();

publicContent.get("/", async (c) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  type NewsQueryResult = {
    data: Array<DbHomeNews & { blocks?: unknown }> | null;
    error: { code?: string; message?: string } | null;
  };

  const queryNews = async (cols: string): Promise<NewsQueryResult> => {
    const res = await admin
      .from("home_news")
      .select(cols)
      .order("sort_order", { ascending: true });
    return res as unknown as NewsQueryResult;
  };

  let news = await queryNews(
    blocksColumnAvailable === false ? NEWS_COLS_NO_BLOCKS : NEWS_COLS_WITH_BLOCKS,
  );

  if (news.error && isMissingColumnError(news.error, "blocks")) {
    blocksColumnAvailable = false;
    news = await queryNews(NEWS_COLS_NO_BLOCKS);
  } else if (!news.error && blocksColumnAvailable === null) {
    blocksColumnAvailable = true;
  }

  const [partners, roadmap, services, hero] = await Promise.all([
    admin
      .from("home_partners")
      .select(PARTNER_COLS)
      .order("sort_order", { ascending: true }),
    admin
      .from("home_roadmap")
      .select(ROADMAP_COLS)
      .order("sort_order", { ascending: true }),
    admin
      .from("home_services")
      .select(SERVICE_COLS)
      .order("sort_order", { ascending: true }),
    admin
      .from("home_hero")
      .select("slot,image_url,alt")
      .order("slot", { ascending: true }),
  ]);

  for (const r of [news, partners, roadmap, services]) {
    if (r.error) {
      console.error("[content] select failed:", r.error);
      return c.json({ ok: false, error: r.error.message } as const, 500);
    }
  }
  // hero table may not exist yet (migration pending) — degrade gracefully
  if (hero.error) {
    console.warn("[content] home_hero query failed (migration pending?):", hero.error.message);
  }

  // Normalize blocks: ensure each row has a `blocks: []` field even when the
  // column doesn't exist yet, so the frontend converter has a stable shape.
  const newsNormalized: DbHomeNews[] = (news.data ?? []).map((r) => ({
    ...(r as DbHomeNews),
    blocks: Array.isArray(r.blocks) ? (r.blocks as DbHomeNews["blocks"]) : [],
  }));

  const payload: HomeContentResponse = {
    news: newsNormalized,
    partners: (partners.data ?? []) as DbHomePartner[],
    roadmap: (roadmap.data ?? []) as DbHomeRoadmap[],
    services: (services.data ?? []) as DbHomeService[],
    hero: hero.error ? [] : (hero.data ?? []) as DbHomeHero[],
  };
  return c.json({ ok: true, data: payload } as const);
});
