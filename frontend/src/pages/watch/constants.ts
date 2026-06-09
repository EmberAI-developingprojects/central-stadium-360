import type { TabId, TicketModalEvent } from "./types";

export const CHAT_WS_URL = (() => {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  if (base) {
    return base.replace(/^http(s?):/, "ws$1:").replace(/\/$/, "") + "/api/chat";
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/api/chat`;
  }
  return "";
})();

export const FEATURED_FALLBACK: TicketModalEvent = {
  id: "featured-placeholder",
  title: "Удахгүй",
  date: "",
  image: "",
  base: 0,
};

export const TAB_IDS: readonly TabId[] = ["live", "upcoming", "tickets"] as const;

export const MONTHS_ABBR_EN = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export const MONTHS_ABBR_MN = [
  "1-р",
  "2-р",
  "3-р",
  "4-р",
  "5-р",
  "6-р",
  "7-р",
  "8-р",
  "9-р",
  "10-р",
  "11-р",
  "12-р",
];
