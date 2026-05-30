import { Hono } from "hono";
import { z } from "zod";
import type {
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

const NEWS_COLS = "id,label,title,body,image,featured,sort_order,created_at";
const PARTNER_COLS = "id,image,alt,sort_order,created_at";
const ROADMAP_COLS = "id,year,title,position,sort_order,created_at";
const SERVICE_COLS =
  "id,title,description,icon_key,href,badge,sort_order,created_at";

const newsItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().default(""),
  title: z.string().default(""),
  body: z.string().default(""),
  image: z.string().nullable().optional(),
  featured: z.boolean().default(false),
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

const sectionSchemas = {
  news: z.array(newsItemSchema),
  partners: z.array(partnerItemSchema),
  roadmap: z.array(roadmapItemSchema),
  services: z.array(serviceItemSchema),
} as const;

const TABLE_FOR_SECTION = {
  news: "home_news",
  partners: "home_partners",
  roadmap: "home_roadmap",
  services: "home_services",
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

  const { data, error: insErr } = await admin
    .from(table)
    .insert(rows)
    .select("*");
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
  const [news, partners, roadmap, services] = await Promise.all([
    admin
      .from("home_news")
      .select(NEWS_COLS)
      .order("sort_order", { ascending: true }),
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
  ]);

  for (const r of [news, partners, roadmap, services]) {
    if (r.error) {
      console.error("[content] select failed:", r.error);
      return c.json({ ok: false, error: r.error.message } as const, 500);
    }
  }

  const payload: HomeContentResponse = {
    news: (news.data ?? []) as DbHomeNews[],
    partners: (partners.data ?? []) as DbHomePartner[],
    roadmap: (roadmap.data ?? []) as DbHomeRoadmap[],
    services: (services.data ?? []) as DbHomeService[],
  };
  return c.json({ ok: true, data: payload } as const);
});
