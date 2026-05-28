// Single source of truth for everything the admin manages.
// All methods are async (return Promises) so a real backend can swap in
// without changing any callers.

import { SEED_EVENTS, SEED_CONTENT, SEED_ADMIN_USER } from './seed.js';

const KEYS = {
  events: 'tsengeldekh_events',
  content: 'tsengeldekh_content',
  orders: 'tsengeldekh_tickets',
  users: 'tsengeldekh_users',
  seeded: 'tsengeldekh_seeded_v1',
};

const ok = (v) => Promise.resolve(v);

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || ('event-' + Math.random().toString(36).slice(2, 7));
}

// ============================================================================
// Events
// ============================================================================

export function listEvents() {
  return ok(readJSON(KEYS.events, []));
}

export function getEvent(id) {
  const all = readJSON(KEYS.events, []);
  return ok(all.find((e) => e.id === id) || null);
}

export function createEvent(input) {
  const all = readJSON(KEYS.events, []);
  const id = input.id?.trim() || slugify(input.title);
  if (all.some((e) => e.id === id)) {
    return Promise.reject(new Error('Энэ ID-тай арга хэмжээ аль хэдийн бий.'));
  }
  const next = {
    id,
    title: input.title || '',
    desc: input.desc || '',
    date: input.date || '',
    when: input.when || '',
    pill: input.pill || '',
    image: input.image || '',
    base: Number(input.base) || 0,
    featured: !!input.featured,
  };
  if (next.featured) all.forEach((e) => (e.featured = false));
  all.push(next);
  writeJSON(KEYS.events, all);
  return ok(next);
}

export function updateEvent(id, patch) {
  const all = readJSON(KEYS.events, []);
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return Promise.reject(new Error('Арга хэмжээ олдсонгүй.'));
  const willFeature = patch.featured === true;
  if (willFeature) all.forEach((e) => (e.featured = false));
  all[i] = { ...all[i], ...patch, id: all[i].id, base: Number(patch.base ?? all[i].base) || 0 };
  writeJSON(KEYS.events, all);
  return ok(all[i]);
}

export function deleteEvent(id) {
  const all = readJSON(KEYS.events, []).filter((e) => e.id !== id);
  writeJSON(KEYS.events, all);
  return ok();
}

export function setFeaturedEvent(id) {
  const all = readJSON(KEYS.events, []).map((e) => ({ ...e, featured: e.id === id }));
  writeJSON(KEYS.events, all);
  return ok();
}

// ============================================================================
// Orders (legacy key: tsengeldekh_tickets — kept for back-compat)
// ============================================================================

export function listOrders(filter = {}) {
  let all = readJSON(KEYS.orders, []).map((o) => ({ status: 'paid', ...o }));
  const { q, status, eventId, from, to, user } = filter;
  if (q) {
    const needle = q.toLowerCase();
    all = all.filter((o) =>
      (o.code || '').toLowerCase().includes(needle) ||
      (o.user || '').toLowerCase().includes(needle) ||
      (o.title || '').toLowerCase().includes(needle)
    );
  }
  if (status && status !== 'all') all = all.filter((o) => o.status === status);
  if (eventId) all = all.filter((o) => o.eventId === eventId);
  if (user) all = all.filter((o) => o.user === user);
  if (from) all = all.filter((o) => (o.purchasedAt || '') >= from);
  if (to) all = all.filter((o) => (o.purchasedAt || '') <= to);
  all.sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
  return ok(all);
}

export function getOrder(code) {
  const all = readJSON(KEYS.orders, []);
  const found = all.find((o) => o.code === code);
  return ok(found ? { status: 'paid', ...found } : null);
}

export function createOrder(order) {
  const all = readJSON(KEYS.orders, []);
  all.push({ status: 'paid', ...order });
  writeJSON(KEYS.orders, all);
  return ok(order);
}

export function refundOrder(code) {
  const all = readJSON(KEYS.orders, []);
  const i = all.findIndex((o) => o.code === code);
  if (i < 0) return Promise.reject(new Error('Захиалга олдсонгүй.'));
  all[i] = { ...all[i], status: 'refunded', refundedAt: new Date().toISOString() };
  writeJSON(KEYS.orders, all);
  return ok(all[i]);
}

export function cancelOrder(code) {
  const all = readJSON(KEYS.orders, []).filter((o) => o.code !== code);
  writeJSON(KEYS.orders, all);
  return ok();
}

export function ordersStats() {
  const all = readJSON(KEYS.orders, []).map((o) => ({ status: 'paid', ...o }));
  const paid = all.filter((o) => o.status === 'paid');
  const revenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const byTier = {};
  const byEvent = {};
  paid.forEach((o) => {
    byTier[o.tier] = (byTier[o.tier] || 0) + (Number(o.total) || 0);
    byEvent[o.eventId] = (byEvent[o.eventId] || 0) + (Number(o.total) || 0);
  });
  // Last 30 days bucket by day
  const today = new Date();
  const last30d = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const sum = paid
      .filter((o) => (o.purchasedAt || '').slice(0, 10) === key)
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    last30d.push({ date: key, total: sum });
  }
  return ok({ revenue, count: all.length, paidCount: paid.length, byTier, byEvent, last30d });
}

// ============================================================================
// Users
// ============================================================================

export function listUsers() {
  return ok(readJSON(KEYS.users, []));
}

export function getUser(identifier) {
  const all = readJSON(KEYS.users, []);
  return ok(all.find((u) => u.identifier === identifier) || null);
}

export function setUserRole(identifier, role) {
  const all = readJSON(KEYS.users, []);
  const i = all.findIndex((u) => u.identifier === identifier);
  if (i < 0) return Promise.reject(new Error('Хэрэглэгч олдсонгүй.'));
  all[i] = { ...all[i], role };
  writeJSON(KEYS.users, all);
  return ok(all[i]);
}

export function setUserDisabled(identifier, disabled) {
  const all = readJSON(KEYS.users, []);
  const i = all.findIndex((u) => u.identifier === identifier);
  if (i < 0) return Promise.reject(new Error('Хэрэглэгч олдсонгүй.'));
  all[i] = { ...all[i], disabled: !!disabled };
  writeJSON(KEYS.users, all);
  return ok(all[i]);
}

export function deleteUser(identifier) {
  const all = readJSON(KEYS.users, []).filter((u) => u.identifier !== identifier);
  writeJSON(KEYS.users, all);
  return ok();
}

// ============================================================================
// Home content (News, Partners, Roadmap, Members)
// ============================================================================

export function getHomeContent() {
  return ok(readJSON(KEYS.content, { news: [], partners: [], roadmap: [], members: [] }));
}

export function updateHomeContent(patch) {
  const cur = readJSON(KEYS.content, { news: [], partners: [], roadmap: [], members: [] });
  const next = { ...cur, ...patch };
  writeJSON(KEYS.content, next);
  return ok(next);
}

// ============================================================================
// Bootstrap / seed
// ============================================================================

export function seedIfEmpty() {
  // Events
  if (!localStorage.getItem(KEYS.events)) {
    writeJSON(KEYS.events, SEED_EVENTS);
  }
  // Content
  if (!localStorage.getItem(KEYS.content)) {
    writeJSON(KEYS.content, SEED_CONTENT);
  }
  // Admin user (always ensure it exists; do not overwrite if real one already there)
  const users = readJSON(KEYS.users, []);
  let mutated = false;
  if (!users.some((u) => u.identifier === SEED_ADMIN_USER.identifier)) {
    users.push(SEED_ADMIN_USER);
    mutated = true;
  }
  // Migration: ensure every user has a role
  users.forEach((u) => {
    if (!u.role) {
      u.role = u.identifier === 'admin' ? 'admin' : 'user';
      mutated = true;
    }
    if (typeof u.disabled === 'undefined') {
      u.disabled = false;
      mutated = true;
    }
  });
  if (mutated) writeJSON(KEYS.users, users);

  // Orders: backfill status:'paid' on legacy records
  const orders = readJSON(KEYS.orders, []);
  let ordersMutated = false;
  orders.forEach((o) => {
    if (!o.status) { o.status = 'paid'; ordersMutated = true; }
  });
  if (ordersMutated) writeJSON(KEYS.orders, orders);

  localStorage.setItem(KEYS.seeded, '1');
  return ok();
}
