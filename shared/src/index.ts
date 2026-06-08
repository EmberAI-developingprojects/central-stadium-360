
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface HealthResponse {
  status: "ok";
  service: string;
  uptime: number;
}

export type UserRole = "user" | "admin";
export type EventStatus = "upcoming" | "live" | "ended";
export type TicketStatus = "pending" | "paid" | "cancelled" | "refunded";

export interface DbUser {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  role: UserRole;
  created_at: string;
  deleted_at: string | null;
}

export interface AdminUserRow extends DbUser {
  banned: boolean;
}

export interface DbEvent {
  id: string;
  title: string;
  description: string | null;
  status: EventStatus;
  start_time: string;
  price: number;
  image: string | null;
  featured: boolean;
  created_at: string;
}

export type EventInput = {
  title: string;
  description?: string | null;
  status?: EventStatus;
  start_time: string;
  price: number;
  image?: string | null;
  featured?: boolean;
};

export type EventPatch = Partial<EventInput>;

export type NewsBlockKind = "text" | "image";

export interface NewsBlock {
  type: NewsBlockKind;
  value: string;
}

export interface DbHomeNews {
  id: string;
  label: string;
  title: string;
  body: string;
  image: string | null;
  featured: boolean;
  blocks: NewsBlock[];
  sort_order: number;
  created_at: string;
}

export interface DbHomePartner {
  id: string;
  image: string;
  alt: string;
  sort_order: number;
  created_at: string;
}

export type RoadmapPosition = "top" | "bot";

export interface DbHomeRoadmap {
  id: string;
  year: string;
  title: string;
  position: RoadmapPosition;
  sort_order: number;
  created_at: string;
}

export interface DbHomeService {
  id: string;
  title: string;
  description: string;
  icon_key: string;
  href: string;
  badge: string | null;
  sort_order: number;
  created_at: string;
}

export interface DbHomeHero {
  slot: string;
  image_url: string;
  alt: string;
}

export type HomeContentSection = "news" | "partners" | "roadmap" | "services" | "hero";

export interface HomeContentResponse {
  news: DbHomeNews[];
  partners: DbHomePartner[];
  roadmap: DbHomeRoadmap[];
  services: DbHomeService[];
  hero: DbHomeHero[];
}

export interface DbChannel {
  id: string;
  event_id: string;
  name: string;
  ivs_channel_arn: string | null;
  ivs_playback_url: string | null;
  position: number;
  created_at: string;
}

export interface DbTicket {
  id: string;
  user_id: string;
  event_id: string;
  status: TicketStatus;
  price: number;
  qpay_invoice_id: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
}

export interface AdminTicketRow extends DbTicket {
  user_email: string | null;
  user_phone: string | null;
  user_full_name: string | null;
  event_title: string | null;
}

export interface AdminTicketStats {
  revenue: number;
  count: number;
  paidCount: number;
  byEvent: Record<string, number>;
  last30d: { date: string; total: number }[];
}

export interface DbSession {
  id: string;
  ticket_id: string;
  device_id: string;
  started_at: string;
  last_seen_at: string;
}

export interface QPayInvoiceLink {

  name: string;

  description?: string;

  logo?: string;

  link: string;
}

export interface TicketCreateResponse {
  ticket_id: string;
  event_id: string;
  price: number;
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  urls: QPayInvoiceLink[];
}

export interface PaymentStatus {
  invoice_id: string;
  ticket_id: string;
  status: TicketStatus;
  paid_at: string | null;
  paid_amount: number;
}
