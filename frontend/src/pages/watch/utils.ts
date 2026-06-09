import { TAB_IDS } from "./constants";
import type { TabId } from "./types";

export const money = (n: number): string => n.toLocaleString("en-US") + "₮";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const isTabId = (value: string): value is TabId =>
  (TAB_IDS as readonly string[]).includes(value);

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function fmtEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours(),
    m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function fmtElapsed(s: number): string {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
