export type TabId = "live" | "upcoming" | "tickets";

export type TicketModalEvent = {
  id: string;
  title: string;
  titleEn?: string;
  descEn?: string;
  date: string;
  image: string;
  base: number;
  start_time?: string;
  desc?: string;
  live_price?: number;
  replay_price?: number;
  live_end_at?: string | null;
  replay_available_until?: string | null;
};

export type ChatMessage = {
  id: string;
  name: string;
  color: string;
  text: string;
  clientId: string;
};
