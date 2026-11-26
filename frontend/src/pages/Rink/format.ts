// Small formatters shared by the rink staff pages and the admin rink page.

export function mnt(n: number | null | undefined): string {
  return `${(n ?? 0).toLocaleString("en-US")}₮`;
}

/** Wall-clock HH:MM in Ulaanbaatar, whatever the device's own timezone. */
export function ubClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Whole minutes from `nowMs` to `endsAt`; negative (rounded away from zero) once past. */
export function minutesLeft(endsAt: string, nowMs: number): number {
  const diff = new Date(endsAt).getTime() - nowMs;
  return diff >= 0 ? Math.ceil(diff / 60_000) : -Math.ceil(-diff / 60_000);
}

export function minutesLabel(left: number): string {
  return left >= 0 ? `${left} мин` : `+${-left} мин`;
}
