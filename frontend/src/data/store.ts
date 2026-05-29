// Single source of truth for everything the admin manages.
// All methods are async (return Promises) so a real backend can swap in
// without changing any callers.

import { SEED_EVENTS, SEED_CONTENT, SEED_ADMIN_USER } from "./seed";

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

export type NewsItem = {
  id: string;
  label: string;
  title: string;
  body: string;
  image: string;
  featured: boolean;
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
  events: "tsengeldekh_events",
  content: "tsengeldekh_content",
  orders: "tsengeldekh_tickets",
  users: "tsengeldekh_users",
  seeded: "tsengeldekh_seeded_v1",
} as const;

const ok = <T>(v: T): Promise<T> => Promise.resolve(v);

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

// Backfill `status: 'paid'` only on legacy records that don't have one.
// Equivalent to the original `{ status: 'paid', ...o }` spread, written so
// TypeScript doesn't flag it as an overwritten literal.
const withDefaultStatus = <T extends { status?: OrderStatus }>(
  o: T,
): T & { status: OrderStatus } =>
  o.status
    ? (o as T & { status: OrderStatus })
    : { ...o, status: "paid" as OrderStatus };

function slugify(s: string): string {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event-" + Math.random().toString(36).slice(2, 7)
  );
}

// ============================================================================
// Events
// ============================================================================

export function listEvents(): Promise<EventRecord[]> {
  return ok(readJSON<EventRecord[]>(KEYS.events, []));
}

export function getEvent(id: string): Promise<EventRecord | null> {
  const all = readJSON<EventRecord[]>(KEYS.events, []);
  return ok(all.find((e) => e.id === id) || null);
}

export type EventInput = Partial<EventRecord> & {
  title?: string;
  base?: number | string;
};

export function createEvent(input: EventInput): Promise<EventRecord> {
  const all = readJSON<EventRecord[]>(KEYS.events, []);
  const id = input.id?.trim() || slugify(input.title || "");
  if (all.some((e) => e.id === id)) {
    return Promise.reject(new Error("Энэ ID-тай арга хэмжээ аль хэдийн бий."));
  }
  const next: EventRecord = {
    id,
    title: input.title || "",
    desc: input.desc || "",
    date: input.date || "",
    when: input.when || "",
    pill: input.pill || "",
    image: input.image || "",
    base: Number(input.base) || 0,
    featured: !!input.featured,
  };
  if (next.featured) all.forEach((e) => (e.featured = false));
  all.push(next);
  writeJSON(KEYS.events, all);
  return ok(next);
}

export function updateEvent(
  id: string,
  patch: Partial<EventRecord> & { base?: number | string },
): Promise<EventRecord> {
  const all = readJSON<EventRecord[]>(KEYS.events, []);
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return Promise.reject(new Error("Арга хэмжээ олдсонгүй."));
  const willFeature = patch.featured === true;
  if (willFeature) all.forEach((e) => (e.featured = false));
  all[i] = {
    ...all[i],
    ...patch,
    id: all[i].id,
    base: Number(patch.base ?? all[i].base) || 0,
  };
  writeJSON(KEYS.events, all);
  return ok(all[i]);
}

export function deleteEvent(id: string): Promise<void> {
  const all = readJSON<EventRecord[]>(KEYS.events, []).filter(
    (e) => e.id !== id,
  );
  writeJSON(KEYS.events, all);
  return ok(undefined);
}

export function setFeaturedEvent(id: string): Promise<void> {
  const all = readJSON<EventRecord[]>(KEYS.events, []).map((e) => ({
    ...e,
    featured: e.id === id,
  }));
  writeJSON(KEYS.events, all);
  return ok(undefined);
}

// ============================================================================
// Orders (legacy key: tsengeldekh_tickets — kept for back-compat)
// ============================================================================

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
  return ok(all);
}

export function getOrder(code: string): Promise<OrderRecord | null> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []);
  const found = all.find((o) => o.code === code);
  return ok(found ? withDefaultStatus(found) : null);
}

export function createOrder(order: OrderRecord): Promise<OrderRecord> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []);
  all.push(withDefaultStatus(order));
  writeJSON(KEYS.orders, all);
  return ok(order);
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
  return ok(all[i]);
}

export function cancelOrder(code: string): Promise<void> {
  const all = readJSON<OrderRecord[]>(KEYS.orders, []).filter(
    (o) => o.code !== code,
  );
  writeJSON(KEYS.orders, all);
  return ok(undefined);
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
  // Last 30 days bucket by day
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
  return ok({
    revenue,
    count: all.length,
    paidCount: paid.length,
    byTier,
    byEvent,
    last30d,
  });
}

// ============================================================================
// Users
// ============================================================================

export function listUsers(): Promise<UserRecord[]> {
  return ok(readJSON<UserRecord[]>(KEYS.users, []));
}

export function getUser(identifier: string): Promise<UserRecord | null> {
  const all = readJSON<UserRecord[]>(KEYS.users, []);
  return ok(all.find((u) => u.identifier === identifier) || null);
}

export function setUserRole(
  identifier: string,
  role: UserRole,
): Promise<UserRecord> {
  const all = readJSON<UserRecord[]>(KEYS.users, []);
  const i = all.findIndex((u) => u.identifier === identifier);
  if (i < 0) return Promise.reject(new Error("Хэрэглэгч олдсонгүй."));
  all[i] = { ...all[i], role };
  writeJSON(KEYS.users, all);
  return ok(all[i]);
}

export function setUserDisabled(
  identifier: string,
  disabled: boolean,
): Promise<UserRecord> {
  const all = readJSON<UserRecord[]>(KEYS.users, []);
  const i = all.findIndex((u) => u.identifier === identifier);
  if (i < 0) return Promise.reject(new Error("Хэрэглэгч олдсонгүй."));
  all[i] = { ...all[i], disabled: !!disabled };
  writeJSON(KEYS.users, all);
  return ok(all[i]);
}

export function deleteUser(identifier: string): Promise<void> {
  const all = readJSON<UserRecord[]>(KEYS.users, []).filter(
    (u) => u.identifier !== identifier,
  );
  writeJSON(KEYS.users, all);
  return ok(undefined);
}

// ============================================================================
// Home content (News, Partners, Roadmap, Members)
// ============================================================================

const EMPTY_CONTENT: HomeContent = {
  news: [],
  partners: [],
  roadmap: [],
  members: [],
};

export function getHomeContent(): Promise<HomeContent> {
  return ok(readJSON<HomeContent>(KEYS.content, EMPTY_CONTENT));
}

export function updateHomeContent(
  patch: Partial<HomeContent>,
): Promise<HomeContent> {
  const cur = readJSON<HomeContent>(KEYS.content, EMPTY_CONTENT);
  const next = { ...cur, ...patch };
  writeJSON(KEYS.content, next);
  return ok(next);
}

// ============================================================================
// Bootstrap / seed
// ============================================================================

export function seedIfEmpty(): Promise<void> {
  // Events
  if (!localStorage.getItem(KEYS.events)) {
    writeJSON(KEYS.events, SEED_EVENTS);
  }
  // Content
  if (!localStorage.getItem(KEYS.content)) {
    writeJSON(KEYS.content, SEED_CONTENT);
  }
  // Admin user (always ensure it exists; do not overwrite if real one already there)
  const users = readJSON<UserRecord[]>(KEYS.users, []);
  let mutated = false;
  if (!users.some((u) => u.identifier === SEED_ADMIN_USER.identifier)) {
    users.push(SEED_ADMIN_USER);
    mutated = true;
  }
  // Migration: ensure every user has a role
  users.forEach((u) => {
    if (!u.role) {
      u.role = u.identifier === "admin" ? "admin" : "user";
      mutated = true;
    }
    if (typeof u.disabled === "undefined") {
      u.disabled = false;
      mutated = true;
    }
  });
  if (mutated) writeJSON(KEYS.users, users);

  // Orders: backfill status:'paid' on legacy records
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
  return ok(undefined);
}
