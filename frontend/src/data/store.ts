import type {
  AdminUserRow,
  DbEvent,
  DbHomeNews,
  DbHomePartner,
  DbHomeRoadmap,
  DbHomeService,
  HomeContentResponse,
} from "@cs360/shared";
import { api } from "../lib/api";

// -----------------------------------------------------------------------------
// View-model types
//
// The public/admin pages were built against these shapes when the data lived
// in localStorage. They are kept stable so the components don't need to
// change as we move events + home content onto Supabase. Orders and users
// still live in localStorage until their migrations land.
// -----------------------------------------------------------------------------

export type EventRecord = {
  id: string;
  title: string;
  desc: string;
  date: string;
  when: string;
  pill: string;
  image: string;
  base: number;
  featured: boolean;
  start_time: string;
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
};

export type Partner = {
  id: string;
  image: string;
  alt: string;
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

export type HomeContent = {
  news: NewsItem[];
  partners: Partner[];
  roadmap: RoadmapItem[];
  members: MemberItem[];
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
  byTier: Record<string, number>;
  byEvent: Record<string, number>;
  last30d: { date: string; total: number }[];
};

const KEYS = {
  orders: "tsengeldekh_tickets",
  seeded: "tsengeldekh_seeded_v1",
} as const;

function readJSON<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback),
    ) as T;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

const withDefaultStatus = <T extends { status?: OrderStatus }>(
  o: T,
): T & { status: OrderStatus } =>
  o.status
    ? (o as T & { status: OrderStatus })
    : { ...o, status: "paid" as OrderStatus };

// -----------------------------------------------------------------------------
// Date formatters
//
// Events store a single timestamptz; the cards/watch page expect two display
// strings. We derive them here so the rest of the UI doesn't have to think
// about timestamps.
// -----------------------------------------------------------------------------

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
  return {
    id: row.id,
    title: row.title,
    desc: row.description ?? "",
    date: fmtDateShort(row.start_time),
    when: fmtDateLong(row.start_time),
    pill: row.pill ?? "",
    image: row.image ?? "",
    base: row.price,
    featured: row.featured,
    start_time: row.start_time,
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

export async function getEvent(id: string): Promise<EventRecord | null> {
  const pub = await api.listEvents();
  if (!pub.ok) return null;
  const found = pub.data.find((e) => e.id === id);
  return found ? dbToEvent(found) : null;
}

function toEventInput(input: EventInput) {
  return {
    title: (input.title ?? "").trim(),
    description: input.desc ?? null,
    start_time:
      input.start_time ??
      (input.when
        ? new Date(input.when).toISOString()
        : new Date().toISOString()),
    price: Number(input.base) || 0,
    image: input.image ?? null,
    pill: input.pill ?? null,
    featured: !!input.featured,
  };
}

export async function createEvent(input: EventInput): Promise<EventRecord> {
  const payload = toEventInput(input);
  if (!payload.title) throw new Error("Гарчиг шаардлагатай.");
  const row = unwrap(await api.admin.createEvent(payload));
  return dbToEvent(row);
}

export async function updateEvent(
  id: string,
  patch: Partial<EventRecord> & { base?: number | string },
): Promise<EventRecord> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.desc !== undefined) body.description = patch.desc;
  if (patch.pill !== undefined) body.pill = patch.pill;
  if (patch.image !== undefined) body.image = patch.image;
  if (patch.featured !== undefined) body.featured = !!patch.featured;
  if (patch.base !== undefined) body.price = Number(patch.base) || 0;
  if (patch.start_time !== undefined) body.start_time = patch.start_time;
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
  };
}
function dbToPartner(row: DbHomePartner): Partner {
  return { id: row.id, image: row.image, alt: row.alt };
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
  }));
}
function toPartnerPayload(items: Partner[]): Partial<DbHomePartner>[] {
  return items.map((it) => ({ image: it.image, alt: it.alt }));
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

const EMPTY_CONTENT: HomeContent = {
  news: [],
  partners: [],
  roadmap: [],
  members: [],
};

export async function getHomeContent(): Promise<HomeContent> {
  const res = await api.getHomeContent();
  if (!res.ok) return EMPTY_CONTENT;
  const data: HomeContentResponse = res.data;
  return {
    news: data.news.map(dbToNews),
    partners: data.partners.map(dbToPartner),
    roadmap: data.roadmap.map(dbToRoadmap),
    members: data.services.map(dbToService),
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
  return getHomeContent();
}

export function listOrders(filter: OrderFilter = {}): Promise<OrderRecord[]> {
  let all = readJSON<OrderRecord[]>(KEYS.orders, []).map(withDefaultStatus);
  const { q, status, eventId, from, to, user } = filter;
  if (q) {
    const needle = q.toLowerCase();
    all = all.filter(
      (o) =>
        (o.code || "").toLowerCase().includes(needle) ||
        (o.user || "").toLowerCase().includes(needle) ||
        (o.title || "").toLowerCase().includes(needle),
    );
  }
  if (status && status !== "all") all = all.filter((o) => o.status === status);
  if (eventId) all = all.filter((o) => o.eventId === eventId);
  if (user) all = all.filter((o) => o.user === user);
  if (from) all = all.filter((o) => (o.purchasedAt || "") >= from);
  if (to) all = all.filter((o) => (o.purchasedAt || "") <= to);
  all.sort((a, b) => (b.purchasedAt || "").localeCompare(a.purchasedAt || ""));
  return Promise.resolve(all);
}

export function getOrder(code: string): Promise<OrderRecord | null> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []);
  const found = all.find((o) => o.code === code);
  return Promise.resolve(found ? withDefaultStatus(found) : null);
}

export function createOrder(order: OrderRecord): Promise<OrderRecord> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []);
  all.push(withDefaultStatus(order));
  writeJSON(KEYS.orders, all);
  return Promise.resolve(order);
}

export function refundOrder(code: string): Promise<OrderRecord> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []);
  const i = all.findIndex((o) => o.code === code);
  if (i < 0) return Promise.reject(new Error("Захиалга олдсонгүй."));
  all[i] = {
    ...all[i],
    status: "refunded",
    refundedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.orders, all);
  return Promise.resolve(all[i]);
}

export function cancelOrder(code: string): Promise<void> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []).filter(
    (o) => o.code !== code,
  );
  writeJSON(KEYS.orders, all);
  return Promise.resolve();
}

export function ordersStats(): Promise<OrdersStats> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []).map(withDefaultStatus);
  const paid = all.filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const byTier: Record<string, number> = {};
  const byEvent: Record<string, number> = {};
  paid.forEach((o) => {
    byTier[o.tier] = (byTier[o.tier] || 0) + (Number(o.total) || 0);
    byEvent[o.eventId] = (byEvent[o.eventId] || 0) + (Number(o.total) || 0);
  });

  const today = new Date();
  const last30d: { date: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const sum = paid
      .filter((o) => (o.purchasedAt || "").slice(0, 10) === key)
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    last30d.push({ date: key, total: sum });
  }
  return Promise.resolve({
    revenue,
    count: all.length,
    paidCount: paid.length,
    byTier,
    byEvent,
    last30d,
  });
}

// -----------------------------------------------------------------------------
// Users (Supabase via /api/admin/users)
// -----------------------------------------------------------------------------

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

export function seedIfEmpty(): Promise<void> {
  const orders = readJSON<OrderRecord[]>(KEYS.orders, []);
  let ordersMutated = false;
  orders.forEach((o) => {
    if (!o.status) {
      o.status = "paid";
      ordersMutated = true;
    }
  });
  if (ordersMutated) writeJSON(KEYS.orders, orders);

  localStorage.setItem(KEYS.seeded, "1");
  return Promise.resolve();
}
