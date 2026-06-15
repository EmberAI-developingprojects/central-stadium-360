import { api } from "../lib/api";
import type { DbHistoryFigure } from "@cs360/shared";

export type HistoryFigure = {
  id: string;
  name: string;
  role: string;
  yearStart: string;
  yearEnd: string;
  image: string;
  bio: string;
  createdAt: string;
};

function fromDb(row: DbHistoryFigure): HistoryFigure {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    yearStart: row.year_start,
    yearEnd: row.year_end,
    image: row.image ?? "",
    bio: row.bio,
    createdAt: row.created_at,
  };
}

function toDbPayload(items: HistoryFigure[]): Partial<DbHistoryFigure>[] {
  return items.map((it) => ({
    name: it.name,
    role: it.role,
    year_start: it.yearStart,
    year_end: it.yearEnd,
    image: it.image || null,
    bio: it.bio,
  }));
}

function unwrap<T>(
  res: { ok: true; data: T } | { ok: false; error: string },
): T {
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export async function listHistoryFigures(): Promise<HistoryFigure[]> {
  const rows = unwrap(await api.listHistoryFigures());
  return rows.map(fromDb).sort((a, b) => {
    const aCurrent = !a.yearEnd;
    const bCurrent = !b.yearEnd;
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    return (b.yearStart || "").localeCompare(a.yearStart || "");
  });
}

export async function getHistoryFigure(
  id: string,
): Promise<HistoryFigure | null> {
  const all = await listHistoryFigures();
  return all.find((f) => f.id === id) ?? null;
}

export async function listAdminHistoryFigures(): Promise<HistoryFigure[]> {
  const rows = unwrap(await api.admin.listHistoryFigures());
  return rows.map(fromDb);
}

export async function saveHistoryFigures(
  items: HistoryFigure[],
): Promise<HistoryFigure[]> {
  const rows = unwrap(await api.admin.replaceHistoryFigures(toDbPayload(items)));
  return rows.map(fromDb);
}

export function newHistoryFigure(): HistoryFigure {
  return {
    id: "h-" + Math.random().toString(36).slice(2, 9),
    name: "",
    role: "Захирал",
    yearStart: "",
    yearEnd: "",
    image: "",
    bio: "",
    createdAt: new Date().toISOString(),
  };
}
