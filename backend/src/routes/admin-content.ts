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

adminContent.use("*", requireUser);
adminContent.use("*", async (c, next) => requireAdmin(c, next));

const NEWS_COLS_FULL =
  "id,label,title,body,image,featured,blocks,label_en,title_en,body_en,sort_order,created_at";
const NEWS_COLS_NO_EN =
  "id,label,title,body,image,featured,blocks,sort_order,created_at";
const NEWS_COLS_NO_BLOCKS =
  "id,label,title,body,image,featured,sort_order,created_at";

let blocksColumnAvailable: boolean | null = null;
let enColumnsAvailable: boolean | null = null;

function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "42703" ||
    (typeof e.message === "string" && e.message.includes(column))
  );
}

function pickNewsCols(): string {
  if (enColumnsAvailable === false) {
    return blocksColumnAvailable === false
      ? NEWS_COLS_NO_BLOCKS
      : NEWS_COLS_NO_EN;
  }
  return blocksColumnAvailable === false ? NEWS_COLS_NO_BLOCKS : NEWS_COLS_FULL;
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
  label_en: z.string().nullable().optional(),
  title_en: z.string().nullable().optional(),
  body_en: z.string().nullable().optional(),
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

  if (section === "hero") {
    const rows = parsed.data as {
      slot: string;
      image_url: string;
      alt: string;
    }[];
    const { data, error } = await admin
      .from("home_hero")
      .upsert(rows, { onConflict: "slot" })
      .select("slot,image_url,alt");
    if (error) {
      return c.json({ ok: false, error: error.message } as const, 500);
    }
    invalidateHomeContentCache();
    return c.json({ ok: true, data: data ?? [] } as const);
  }

  const { error: delErr } = await admin
    .from(table)
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

  let { data, error: insErr } = await admin
    .from(table)
    .insert(rows)
    .select("*");

  if (
    insErr &&
    section === "news" &&
    (isMissingColumnError(insErr, "title_en") ||
      isMissingColumnError(insErr, "body_en") ||
      isMissingColumnError(insErr, "label_en"))
  ) {
    enColumnsAvailable = false;
    const rowsNoEn = rows.map((r) => {
      const {
        title_en: _t,
        body_en: _b,
        label_en: _l,
        ...rest
      } = r as {
        title_en?: unknown;
        body_en?: unknown;
        label_en?: unknown;
      } & Record<string, unknown>;
      return rest;
    });
    const retry = await admin.from(table).insert(rowsNoEn).select("*");
    data = retry.data;
    insErr = retry.error;
  }

  if (insErr && section === "news" && isMissingColumnError(insErr, "blocks")) {
    blocksColumnAvailable = false;
    const rowsNoBlocks = rows.map((r) => {
      const {
        blocks: _b,
        title_en: _t,
        body_en: _by,
        label_en: _l,
        ...rest
      } = r as {
        blocks?: unknown;
        title_en?: unknown;
        body_en?: unknown;
        label_en?: unknown;
      } & Record<string, unknown>;
      return rest;
    });
    const retry = await admin.from(table).insert(rowsNoBlocks).select("*");
    data = retry.data;
    insErr = retry.error;
  }

  if (insErr) {
    return c.json({ ok: false, error: insErr.message } as const, 500);
  }
  invalidateHomeContentCache();
  return c.json({ ok: true, data: data ?? [] } as const);
});

export default adminContent;

export const publicContent = new Hono();

const CONTENT_CACHE_TTL_MS = 60 * 1000;
let contentCache: { expiresAt: number; payload: HomeContentResponse } | null =
  null;
let contentInflight: Promise<HomeContentResponse | { error: string }> | null =
  null;

async function loadHomeContent(): Promise<
  HomeContentResponse | { error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "supabase_not_configured" };

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

  let news = await queryNews(pickNewsCols());

  if (
    news.error &&
    (isMissingColumnError(news.error, "title_en") ||
      isMissingColumnError(news.error, "body_en") ||
      isMissingColumnError(news.error, "label_en"))
  ) {
    enColumnsAvailable = false;
    news = await queryNews(pickNewsCols());
  }

  if (news.error && isMissingColumnError(news.error, "blocks")) {
    blocksColumnAvailable = false;
    news = await queryNews(pickNewsCols());
  } else if (!news.error) {
    if (blocksColumnAvailable === null) blocksColumnAvailable = true;
    if (enColumnsAvailable === null) enColumnsAvailable = true;
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
    if (r.error) return { error: r.error.message ?? "query_failed" };
  }

  const newsNormalized: DbHomeNews[] = (news.data ?? []).map((r) => ({
    ...(r as DbHomeNews),
    blocks: Array.isArray(r.blocks) ? (r.blocks as DbHomeNews["blocks"]) : [],
  }));

  return {
    news: newsNormalized,
    partners: (partners.data ?? []) as DbHomePartner[],
    roadmap: (roadmap.data ?? []) as DbHomeRoadmap[],
    services: (services.data ?? []) as DbHomeService[],
    hero: hero.error ? [] : ((hero.data ?? []) as DbHomeHero[]),
  };
}

export function invalidateHomeContentCache(): void {
  contentCache = null;
}

publicContent.get("/", async (c) => {
  const now = Date.now();
  if (contentCache && contentCache.expiresAt > now) {
    c.header("Cache-Control", "public, max-age=60");
    return c.json({ ok: true, data: contentCache.payload } as const);
  }

  if (!contentInflight) {
    contentInflight = loadHomeContent().finally(() => {
      contentInflight = null;
    });
  }
  const result = await contentInflight;

  if ("error" in result) {
    const status = result.error === "supabase_not_configured" ? 503 : 500;
    return c.json({ ok: false, error: result.error } as const, status);
  }

  contentCache = { expiresAt: Date.now() + CONTENT_CACHE_TTL_MS, payload: result };
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ ok: true, data: result } as const);
});
