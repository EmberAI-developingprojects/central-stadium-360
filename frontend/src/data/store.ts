import type {
  AdminTicketRow,
  AdminTicketStats,
  AdminUserRow,
  DbEvent,
  DbHomeHero,
  DbHomeNews,
  DbHomePartner,
  DbHomeRoadmap,
  DbHomeService,
  HomeContentResponse,
} from "@cs360/shared";
import { api } from "../lib/api";

export type EventRecord = {
  id: string;
  title: string;
  desc: string;
  date: string;
  when: string;
  image: string;
  base: number;
  featured: boolean;
  start_time: string;
  status: import("@cs360/shared").EventStatus;
  live_price: number;
  replay_price: number;
  price_standard: number | null;
  price_multi3: number | null;
  price_multi5: number | null;
  live_start_at: string | null;
  live_end_at: string | null;
  replay_available_until: string | null;
  thumbnail_url: string | null;
  titleEn?: string;
  descEn?: string;
};

export type OrderStatus = "paid" | "refunded";

export type OrderRecord = {
  code: string;
  user: string;
  eventId: string;
  title: string;
  tier: string;
  tierName?: string;
  qty?: number;
  unitPrice?: number;
  total: number;
  purchasedAt: string;
  status: OrderStatus;
  refundedAt?: string;
  accessExpiresAt?: string | null;
  image?: string;
  date?: string;
  payment?: string;
  paymentName?: string;
};

export type UserRole = "admin" | "user";

export type UserRecord = {
  id: string;
  identifier: string;
  password: string;
  fullname: string;
  avatar: string | null;
  bio: string;
  method: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
};

export type NewsBlockKind = "text" | "image";

export type NewsBlock = {
  type: NewsBlockKind;
  value: string;
};

export type NewsItem = {
  id: string;
  label: string;
  title: string;
  body: string;
  image: string;
  featured: boolean;
  blocks: NewsBlock[];
  createdAt: string;
  sortOrder: number;
  labelEn?: string;
  titleEn?: string;
  bodyEn?: string;
};

export type Partner = {
  id: string;
  image: string;
  alt: string;
  href?: string;
};

export type RoadmapItem = {
  id: string;
  year: string;
  title: string;
  position: "top" | "bot";
};

export type MemberItem = {
  id: string;
  title: string;
  desc: string;
  iconKey: string;
  href: string;
  badge?: string;
};

export type HeroImage = {
  slot: string;
  image_url: string;
  alt: string;
};

export type HomeContent = {
  news: NewsItem[];
  partners: Partner[];
  roadmap: RoadmapItem[];
  members: MemberItem[];
  hero: HeroImage[];
};

export type OrderFilter = {
  q?: string;
  status?: OrderStatus | "all";
  eventId?: string;
  from?: string;
  to?: string;
  user?: string;
};

export type OrdersStats = {
  revenue: number;
  count: number;
  paidCount: number;
  viewerCount: number;
  byTier: Record<string, number>;
  byEvent: Record<string, number>;
  last30d: { date: string; total: number }[];
};

function ticketToOrder(t: AdminTicketRow): OrderRecord {
  return {
    code: t.id,
    user: t.user_email || t.user_phone || t.user_full_name || t.user_id,
    eventId: t.event_id,
    title: t.event_title || "",
    tier: "",
    tierName: "",
    qty: 1,
    unitPrice: t.price,
    total: t.price,
    purchasedAt: t.paid_at || t.created_at,
    status: t.status === "refunded" ? "refunded" : "paid",
    refundedAt: t.refunded_at || undefined,
    accessExpiresAt: t.access_expires_at,
    payment: "qpay",
    paymentName: "QPay",
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getMonth() + 1)} / ${pad2(d.getDate())} · ${d.getFullYear()}`;
}

function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    `${d.getFullYear()} / ${pad2(d.getMonth() + 1)} / ${pad2(d.getDate())} ` +
    `· ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

function dbToEvent(row: DbEvent): EventRecord {
  const cover = row.image || row.thumbnail_url || "";
  return {
    id: row.id,
    title: row.title,
    desc: row.description ?? "",
    date: fmtDateShort(row.start_time),
    when: fmtDateLong(row.start_time),
    image: cover,
    base: row.price,
    featured: row.featured,
    start_time: row.start_time,
    status: row.status,
    live_price: Number(row.live_price ?? 0),
    replay_price: Number(row.replay_price ?? 0),
    price_standard: row.price_standard ?? null,
    price_multi3: row.price_multi3 ?? null,
    price_multi5: row.price_multi5 ?? null,
    live_start_at: row.live_start_at,
    live_end_at: row.live_end_at,
    replay_available_until: row.replay_available_until,
    thumbnail_url: row.thumbnail_url || row.image || null,
    titleEn: row.title_en ?? "",
    descEn: row.description_en ?? "",
  };
}

function unwrap<T>(
  res: { ok: true; data: T } | { ok: false; error: string },
): T {
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export type EventInput = Partial<EventRecord> & {
  title?: string;
  base?: number | string;
  start_time?: string;
};

export async function listEvents(): Promise<EventRecord[]> {
  const rows = unwrap(await api.listEvents());
  return rows.map(dbToEvent);
}

export type AdminEventRecord = EventRecord & { recording_count: number };

export async function listAdminEvents(): Promise<AdminEventRecord[]> {
  const rows = unwrap(await api.admin.listEvents());
  return rows.map((r) => ({ ...dbToEvent(r), recording_count: r.recording_count }));
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  const pub = await api.listEvents();
  if (!pub.ok) return null;
  const found = pub.data.find((e) => e.id === id);
  return found ? dbToEvent(found) : null;
}

function toEventInput(input: EventInput) {
  const body: Record<string, unknown> = {
    title: (input.title ?? "").trim(),
    description: input.desc ?? null,
    start_time:
      input.start_time ??
      (input.when
        ? new Date(input.when).toISOString()
        : new Date().toISOString()),
    price: Number(input.base) || 0,
    image: input.image ?? null,
    featured: !!input.featured,
    title_en: input.titleEn?.trim() ? input.titleEn : null,
    description_en: input.descEn?.trim() ? input.descEn : null,
  };
  if (input.live_price !== undefined)
    body.live_price = Number(input.live_price) || 0;
  if (input.replay_price !== undefined)
    body.replay_price = Number(input.replay_price) || 0;
  if (input.price_standard !== undefined)
    body.price_standard = input.price_standard;
  if (input.price_multi3 !== undefined) body.price_multi3 = input.price_multi3;
  if (input.price_multi5 !== undefined) body.price_multi5 = input.price_multi5;
  if (input.live_start_at !== undefined)
    body.live_start_at = input.live_start_at;
  if (input.live_end_at !== undefined) body.live_end_at = input.live_end_at;
  if (input.replay_available_until !== undefined)
    body.replay_available_until = input.replay_available_until;
  if (input.thumbnail_url !== undefined)
    body.thumbnail_url = input.thumbnail_url;
  if (input.status !== undefined) body.status = input.status;
  return body;
}

export async function createEvent(input: EventInput): Promise<EventRecord> {
  const payload = toEventInput(input);
  if (!payload.title) throw new Error("Гарчиг шаардлагатай.");
  const row = unwrap(
    await api.admin.createEvent(
      payload as unknown as import("@cs360/shared").EventInput,
    ),
  );
  return dbToEvent(row);
}

export async function updateEvent(
  id: string,
  patch: Partial<EventRecord> & { base?: number | string },
): Promise<EventRecord> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.desc !== undefined) body.description = patch.desc;
  if (patch.titleEn !== undefined)
    body.title_en = patch.titleEn?.trim() ? patch.titleEn : null;
  if (patch.descEn !== undefined)
    body.description_en = patch.descEn?.trim() ? patch.descEn : null;
  if (patch.image !== undefined) body.image = patch.image;
  if (patch.featured !== undefined) body.featured = !!patch.featured;
  if (patch.base !== undefined) body.price = Number(patch.base) || 0;
  if (patch.start_time !== undefined) body.start_time = patch.start_time;
  if (patch.live_price !== undefined)
    body.live_price = Number(patch.live_price) || 0;
  if (patch.replay_price !== undefined)
    body.replay_price = Number(patch.replay_price) || 0;
  if (patch.price_standard !== undefined)
    body.price_standard = patch.price_standard;
  if (patch.price_multi3 !== undefined) body.price_multi3 = patch.price_multi3;
  if (patch.price_multi5 !== undefined) body.price_multi5 = patch.price_multi5;
  if (patch.live_start_at !== undefined)
    body.live_start_at = patch.live_start_at;
  if (patch.live_end_at !== undefined) body.live_end_at = patch.live_end_at;
  if (patch.replay_available_until !== undefined)
    body.replay_available_until = patch.replay_available_until;
  if (patch.thumbnail_url !== undefined)
    body.thumbnail_url = patch.thumbnail_url;
  if (patch.status !== undefined) body.status = patch.status;
  const row = unwrap(await api.admin.updateEvent(id, body));
  return dbToEvent(row);
}

export async function deleteEvent(id: string): Promise<void> {
  unwrap(await api.admin.deleteEvent(id));
}

export async function setFeaturedEvent(id: string): Promise<void> {
  unwrap(await api.admin.featureEvent(id));
}

function dbToNews(row: DbHomeNews): NewsItem {
  return {
    id: row.id,
    label: row.label,
    title: row.title,
    body: row.body,
    image: row.image ?? "",
    featured: row.featured,
    blocks: Array.isArray(row.blocks)
      ? row.blocks.filter(
          (b): b is NewsBlock =>
            !!b &&
            (b.type === "text" || b.type === "image") &&
            typeof b.value === "string",
        )
      : [],
    createdAt: row.created_at,
    sortOrder: row.sort_order ?? 0,
    labelEn: row.label_en ?? "",
    titleEn: row.title_en ?? "",
    bodyEn: row.body_en ?? "",
  };
}
function dbToPartner(row: DbHomePartner): Partner {
  return {
    id: row.id,
    image: row.image,
    alt: row.alt,
    href: row.href || undefined,
  };
}
function dbToRoadmap(row: DbHomeRoadmap): RoadmapItem {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    position: row.position,
  };
}
function dbToService(row: DbHomeService): MemberItem {
  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    iconKey: row.icon_key,
    href: row.href,
    badge: row.badge ?? "",
  };
}

function toNewsPayload(items: NewsItem[]): Partial<DbHomeNews>[] {
  return items.map((it) => ({
    label: it.label,
    title: it.title,
    body: it.body,
    image: it.image || null,
    featured: !!it.featured,
    blocks: it.blocks ?? [],
    label_en: it.labelEn?.trim() ? it.labelEn : null,
    title_en: it.titleEn?.trim() ? it.titleEn : null,
    body_en: it.bodyEn?.trim() ? it.bodyEn : null,
  }));
}
function toPartnerPayload(items: Partner[]): Partial<DbHomePartner>[] {
  return items.map((it) => ({
    image: it.image,
    alt: it.alt,
    href: it.href ?? "",
  }));
}
function toRoadmapPayload(items: RoadmapItem[]): Partial<DbHomeRoadmap>[] {
  return items.map((it) => ({
    year: it.year,
    title: it.title,
    position: it.position,
  }));
}
function toServicePayload(items: MemberItem[]): Partial<DbHomeService>[] {
  return items.map((it) => ({
    title: it.title,
    description: it.desc,
    icon_key: it.iconKey,
    href: it.href,
    badge: it.badge || null,
  }));
}

const DEFAULT_HERO: HeroImage[] = [
  { slot: "tile1", image_url: "/assets/images/hero/featured.opt.jpg",   alt: "Онцлох үйл явдал" },
  { slot: "tile2", image_url: "/assets/images/hero/stadium-aerial.jpg", alt: "Төв цэнгэлдэх хүрээлэн" },
  { slot: "tile3", image_url: "/assets/images/hero/event-tengri.png",   alt: "THUNDERZ — TENGRI" },
  { slot: "tile4", image_url: "/assets/images/hero/live-360.jpg",       alt: "Live streaming · 360°" },
];

const EMPTY_CONTENT: HomeContent = {
  news: [],
  partners: [],
  roadmap: [],
  members: [],
  hero: DEFAULT_HERO,
};

export async function getHomeContent(): Promise<HomeContent> {
  const res = await api.getHomeContent();
  if (!res.ok) return EMPTY_CONTENT;
  const data: HomeContentResponse = res.data;
  const hero: HeroImage[] =
    data.hero && data.hero.length > 0
      ? data.hero.map((h: DbHomeHero) => ({
          slot: h.slot,
          image_url: h.image_url,
          alt: h.alt,
        }))
      : DEFAULT_HERO;
  return {
    news: data.news.map(dbToNews),
    partners: data.partners.map(dbToPartner),
    roadmap: data.roadmap.map(dbToRoadmap),
    members: data.services.map(dbToService),
    hero,
  };
}

export async function updateHomeContent(
  patch: Partial<HomeContent>,
): Promise<HomeContent> {
  if (patch.news !== undefined) {
    unwrap(
      await api.admin.replaceContentSection("news", toNewsPayload(patch.news)),
    );
  }
  if (patch.partners !== undefined) {
    unwrap(
      await api.admin.replaceContentSection(
        "partners",
        toPartnerPayload(patch.partners),
      ),
    );
  }
  if (patch.roadmap !== undefined) {
    unwrap(
      await api.admin.replaceContentSection(
        "roadmap",
        toRoadmapPayload(patch.roadmap),
      ),
    );
  }
  if (patch.members !== undefined) {
    unwrap(
      await api.admin.replaceContentSection(
        "services",
        toServicePayload(patch.members),
      ),
    );
  }
  if (patch.hero !== undefined) {
    unwrap(
      await api.admin.replaceContentSection("hero", patch.hero),
    );
  }
  return getHomeContent();
}

export async function listOrders(
  filter: OrderFilter = {},
): Promise<OrderRecord[]> {
  const res = await api.admin.listTickets({
    status: filter.status,
    eventId: filter.eventId,
    from: filter.from,
    to: filter.to,
  });
  if (!res.ok) return [];
  let all = res.data
    .filter((t) => t.status === "paid" || t.status === "refunded")
    .map(ticketToOrder);
  const { q, user } = filter;
  if (q) {
    const needle = q.toLowerCase();
    all = all.filter(
      (o) =>
        (o.code || "").toLowerCase().includes(needle) ||
        (o.user || "").toLowerCase().includes(needle) ||
        (o.title || "").toLowerCase().includes(needle),
    );
  }
  if (user) all = all.filter((o) => o.user === user);
  all.sort((a, b) => (b.purchasedAt || "").localeCompare(a.purchasedAt || ""));
  return all;
}

export async function getOrder(code: string): Promise<OrderRecord | null> {
  const res = await api.admin.getTicket(code);
  if (!res.ok) return null;
  if (res.data.status !== "paid" && res.data.status !== "refunded") return null;
  return ticketToOrder(res.data);
}

export async function refundOrder(code: string): Promise<OrderRecord> {
  const res = await api.admin.refundTicket(code);
  if (!res.ok) throw new Error(res.error || "Буцаах боломжгүй.");
  return ticketToOrder(res.data);
}

export async function cancelOrder(code: string): Promise<void> {
  const res = await api.admin.deleteTicket(code);
  if (!res.ok) throw new Error(res.error || "Устгах боломжгүй.");
}

export async function listMyOrders(): Promise<OrderRecord[]> {
  const [ticketsRes, eventsRes] = await Promise.all([
    api.listMyTickets(),
    api.listEvents(),
  ]);
  if (!ticketsRes.ok) return [];
  const eventsById = new Map(
    (eventsRes.ok ? eventsRes.data : []).map((e) => [e.id, e]),
  );
  return ticketsRes.data
    .filter((t) => t.status === "paid" || t.status === "refunded")
    .map((t) => {
      const ev = eventsById.get(t.event_id);
      return {
        code: t.id,
        user: "",
        eventId: t.event_id,
        title: ev?.title || "",
        tier: "",
        tierName: "",
        qty: 1,
        unitPrice: t.price,
        total: t.price,
        purchasedAt: t.paid_at || t.created_at,
        status: t.status === "refunded" ? "refunded" : ("paid" as OrderStatus),
        refundedAt: t.refunded_at || undefined,
        accessExpiresAt: t.access_expires_at,
        payment: "qpay",
        paymentName: "QPay",
        image: ev?.image || undefined,
        date: ev?.start_time || undefined,
      } satisfies OrderRecord;
    })
    .sort((a, b) =>
      (b.purchasedAt || "").localeCompare(a.purchasedAt || ""),
    );
}

export async function getMyOrder(code: string): Promise<OrderRecord | null> {
  const orders = await listMyOrders();
  return orders.find((o) => o.code === code) || null;
}

export async function ordersStats(): Promise<OrdersStats> {
  const res = await api.admin.ticketsStats();
  if (!res.ok) {
    return {
      revenue: 0,
      count: 0,
      paidCount: 0,
      viewerCount: 0,
      byTier: {},
      byEvent: {},
      last30d: [],
    };
  }
  const s: AdminTicketStats = res.data;
  return {
    revenue: s.revenue,
    count: s.count,
    paidCount: s.paidCount,
    viewerCount: s.viewerCount,
    byTier: { standard: s.revenue },
    byEvent: s.byEvent,
    last30d: s.last30d,
  };
}

function dbToUser(row: AdminUserRow): UserRecord {
  return {
    id: row.id,
    identifier: row.phone ?? row.email ?? row.id,
    password: "",
    fullname: row.full_name,
    avatar: null,
    bio: "",
    method: row.phone ? "phone" : row.email ? "email" : "",
    role: row.role,
    disabled: row.banned,
    createdAt: row.created_at,
  };
}

export async function createUser(input: {
  email: string;
  password: string;
  full_name?: string;
  role?: UserRole;
}): Promise<UserRecord> {
  const row = unwrap(await api.admin.createUser(input));
  return dbToUser(row);
}

export async function listUsers(): Promise<UserRecord[]> {
  const res = await api.admin.listUsers();
  if (!res.ok) return [];
  return res.data.map(dbToUser);
}

export async function getUser(id: string): Promise<UserRecord | null> {
  const res = await api.admin.getUser(id);
  if (!res.ok) return null;
  return dbToUser(res.data);
}

export async function setUserRole(
  id: string,
  role: UserRole,
): Promise<UserRecord> {
  const row = unwrap(await api.admin.setUserRole(id, role));
  return dbToUser(row);
}

export async function setUserDisabled(
  id: string,
  disabled: boolean,
): Promise<UserRecord> {
  const row = unwrap(await api.admin.setUserDisabled(id, disabled));
  return dbToUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  unwrap(await api.admin.deleteUser(id));
}

