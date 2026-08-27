import type { DbZone, ZoneInput } from "@cs360/shared";
import { api } from "../../lib/api";

/**
 * The kiosk sells exactly three admission tiers. Names are fixed here — the
 * admin only ever sets a price and a capacity, and all three are written in one
 * go by the page's single save button.
 */
export type KioskTier = {
  key: string;
  name_mn: string;
  name_en: string;
  color: string;
};

export const KIOSK_TIERS: KioskTier[] = [
  { key: "vip", name_mn: "VIP", name_en: "VIP", color: "#B45309" },
  { key: "fan", name_mn: "Fan Zone", name_en: "Fan Zone", color: "#2230C6" },
  { key: "standard", name_mn: "Энгийн", name_en: "Standard", color: "#2F6E8F" },
];

/** One tier's editable state. `id` is empty until the zone exists in the DB. */
export type ZoneDraft = {
  id: string;
  price: number;
  capacity: number;
  color: string;
  sold: number;
};

export function blankZoneDrafts(): ZoneDraft[] {
  return KIOSK_TIERS.map((t) => ({
    id: "",
    price: 0,
    capacity: 0,
    color: t.color,
    sold: 0,
  }));
}

function matchesTier(zone: DbZone, tier: KioskTier): boolean {
  const mn = zone.name_mn.trim().toLowerCase();
  const en = zone.name_en.trim().toLowerCase();
  return mn === tier.name_mn.toLowerCase() || en === tier.name_en.toLowerCase();
}

/** Loads the event's zones and folds them onto the three fixed tiers. */
export async function loadZoneDrafts(eventId: string): Promise<ZoneDraft[]> {
  const res = await api.admin.listZones(eventId);
  if (!res.ok) return blankZoneDrafts();
  const taken = new Set<string>();
  return KIOSK_TIERS.map((tier) => {
    const hit = res.data.find((z) => !taken.has(z.id) && matchesTier(z, tier));
    if (!hit) {
      return { id: "", price: 0, capacity: 0, color: tier.color, sold: 0 };
    }
    taken.add(hit.id);
    return {
      id: hit.id,
      price: hit.price,
      capacity: hit.capacity,
      color: hit.color ?? tier.color,
      sold: hit.sold,
    };
  });
}

/** True once at least one tier can actually sell something. */
export function hasSellableZone(drafts: ZoneDraft[]): boolean {
  return drafts.some((d) => d.capacity > 0);
}

function isEmptyDraft(d: ZoneDraft): boolean {
  return !d.id && d.price <= 0 && d.capacity <= 0;
}

/**
 * Creates or updates every filled tier. Untouched tiers are skipped rather than
 * written as empty zones, so the kiosk never lists a tier the admin left blank.
 * Throws on the first failure — the caller reports it.
 */
export async function saveZoneDrafts(
  eventId: string,
  drafts: ZoneDraft[],
): Promise<ZoneDraft[]> {
  const out = [...drafts];
  for (let i = 0; i < KIOSK_TIERS.length; i++) {
    const tier = KIOSK_TIERS[i];
    const d = drafts[i];
    if (!d || isEmptyDraft(d)) continue;
    const input: ZoneInput = {
      name_mn: tier.name_mn,
      name_en: tier.name_en,
      price: Math.max(0, Math.round(d.price)),
      capacity: Math.max(0, Math.round(d.capacity)),
      color: d.color || tier.color,
      sort_order: i,
    };
    const res = d.id
      ? await api.admin.updateZone(eventId, d.id, input)
      : await api.admin.createZone(eventId, input);
    if (!res.ok) {
      throw new Error(`${tier.name_mn}: ${res.error}`);
    }
    out[i] = {
      id: res.data.id,
      price: res.data.price,
      capacity: res.data.capacity,
      color: res.data.color ?? tier.color,
      sold: res.data.sold,
    };
  }
  return out;
}
