export type TabId = "live" | "upcoming" | "tickets";

export type TicketModalEvent = {
  id: string;
  title: string;
  date: string;
  image: string;
  base: number;
  start_time?: string;
  desc?: string;
};

export type ChatMessage = {
  id: string;
  name: string;
  color: string;
  text: string;
  clientId: string;
};
