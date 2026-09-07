import type { ZoneInput } from "@cs360/shared";
import { api } from "../../lib/api";

export const ZONE_COLORS = [
  "#B45309",
  "#2230C6",
  "#2F6E8F",
  "#7C3AED",
  "#0F766E",
  "#BE123C",
];

export type ZoneDraft = {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  capacity: number;
  color: string;
  sold: number;
};

export function blankZoneDrafts(): ZoneDraft[] {
  return [
    draft("VIP", "VIP", ZONE_COLORS[0]),
    draft("Fan Zone", "Fan Zone", ZONE_COLORS[1]),
    draft("Энгийн", "Standard", ZONE_COLORS[2]),
  ];
}

function draft(name: string, nameEn: string, color: string): ZoneDraft {
  return { id: "", name, nameEn, price: 0, capacity: 0, color, sold: 0 };
}

export function newZoneDraft(index: number): ZoneDraft {
  return draft("", "", ZONE_COLORS[index % ZONE_COLORS.length]);
}

export async function loadZoneDrafts(eventId: string): Promise<ZoneDraft[]> {
  const res = await api.admin.listZones(eventId);
  if (!res.ok) throw new Error(res.error);
  if (res.data.length === 0) return blankZoneDrafts();
  return res.data.map((z, i) => ({
    id: z.id,
    name: z.name_mn || z.name_en,
    nameEn: z.name_en || z.name_mn,
    price: z.price,
    capacity: z.capacity,
    color: z.color ?? ZONE_COLORS[i % ZONE_COLORS.length],
    sold: z.sold,
  }));
}

export function hasSellableZone(drafts: ZoneDraft[]): boolean {
  return drafts.some((d) => d.name.trim().length > 0 && d.capacity > 0);
}

function isSkippableDraft(d: ZoneDraft): boolean {
  return !d.id && Math.round(d.capacity) <= 0;
}

export function zoneDraftsProblem(drafts: ZoneDraft[]): string | null {
  const seen = new Map<string, number>();
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (!d || isSkippableDraft(d)) continue;
    const name = d.name.trim();
    if (!name) return `${i + 1}-р мөрөнд төрлийн нэр оруулна уу.`;
    const key = name.toLowerCase();
    const prev = seen.get(key);
    if (prev !== undefined) {
      return `«${name}» нэртэй төрөл давхардаж байна (${prev + 1} ба ${i + 1}-р мөр).`;
    }
    seen.set(key, i);
  }
  return null;
}

export async function saveZoneDrafts(
  eventId: string,
  drafts: ZoneDraft[],
  deletedIds: string[] = [],
): Promise<ZoneDraft[]> {
  const problem = zoneDraftsProblem(drafts);
  if (problem) throw new Error(problem);
  for (const zoneId of deletedIds) {
    const res = await api.admin.deleteZone(eventId, zoneId);
    if (!res.ok) throw new Error(`Төрөл устгах: ${res.error}`);
  }
  const out: ZoneDraft[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (!d || isSkippableDraft(d)) continue;
    const name = d.name.trim();
    const color = d.color || ZONE_COLORS[i % ZONE_COLORS.length];
    const input: ZoneInput = {
      name_mn: name,
      name_en: d.nameEn.trim() || name,
      price: Math.max(0, Math.round(d.price)),
      capacity: Math.max(d.sold, Math.max(0, Math.round(d.capacity))),
      color,
      sort_order: i,
    };
    const res = d.id
      ? await api.admin.updateZone(eventId, d.id, input)
      : await api.admin.createZone(eventId, input);
    if (!res.ok) {
      throw new Error(`${name}: ${res.error}`);
    }
    out.push({
      id: res.data.id,
      name: res.data.name_mn,
      nameEn: res.data.name_en,
      price: res.data.price,
      capacity: res.data.capacity,
      color: res.data.color ?? color,
      sold: res.data.sold,
    });
  }
  return out.length > 0 ? out : blankZoneDrafts();
}
