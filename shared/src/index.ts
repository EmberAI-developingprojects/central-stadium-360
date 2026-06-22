
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface HealthResponse {
  status: "ok";
  service: string;
  uptime: number;
}

export type UserRole = "user" | "admin";
export type EventStatus =
  | "upcoming"
  | "live"
  | "ended"
  | "archived"
  | "expired";
export type TicketStatus = "pending" | "paid" | "cancelled" | "refunded";
export type TicketType = "live" | "replay";
export type RecordingStatus = "recording" | "processing" | "ready" | "expired";

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
  live_price: number;
  replay_price: number;
  live_start_at: string | null;
  live_end_at: string | null;
  replay_available_until: string | null;
  thumbnail_url: string | null;
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
  live_price?: number;
  replay_price?: number;
  live_start_at?: string | null;
  live_end_at?: string | null;
  replay_available_until?: string | null;
  thumbnail_url?: string | null;
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
  label_en?: string | null;
  title_en?: string | null;
  body_en?: string | null;
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

export interface DbHistoryFigure {
  id: string;
  name: string;
  role: string;
  year_start: string;
  year_end: string;
  image: string | null;
  bio: string;
  sort_order: number;
  created_at: string;
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
  ticket_type: TicketType;
  price: number;
  qpay_invoice_id: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  access_expires_at: string | null;
}

export interface DbRecording {
  id: string;
  event_id: string;
  camera_number: number;
  channel_arn: string | null;
  s3_bucket: string | null;
  s3_key_prefix: string | null;
  master_playlist_path: string | null;
  duration_seconds: number | null;
  recording_started_at: string | null;
  recording_ended_at: string | null;
  status: RecordingStatus;
  created_at: string;
}

export type Recording = DbRecording;

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
  viewerCount: number;
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
  reused?: boolean;
  access_expires_at?: string | null;
}

export interface PaymentStatus {
  invoice_id: string;
  ticket_id: string;
  status: TicketStatus;
  paid_at: string | null;
  paid_amount: number;
}

// ---------------------------------------------------------------------------
// In-person (kiosk) ticketing — physical admission tickets sold at the stadium
// kiosk for the same events. Capacity zones, anonymous orders, e-barimt.
// ---------------------------------------------------------------------------

export type PaymentMethod = "qpay" | "card";
export type VenueTicketStatus = "valid" | "used" | "void";

export interface DbZone {
  id: string;
  event_id: string;
  name_mn: string;
  name_en: string;
  desc_mn: string | null;
  desc_en: string | null;
  price: number;
  capacity: number;
  sold: number;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export type ZoneInput = {
  name_mn: string;
  name_en: string;
  desc_mn?: string | null;
  desc_en?: string | null;
  price: number;
  capacity: number;
  color?: string | null;
  sort_order?: number;
};

export type ZonePatch = Partial<ZoneInput>;

/** A zone as the kiosk sees it — capacity expanded into availability. */
export interface KioskZone extends DbZone {
  available: number;
}

/** One line of a kiosk order, stored on venue_orders.items. */
export interface VenueOrderItem {
  zone_id: string;
  zone_name_mn: string;
  zone_name_en: string;
  qty: number;
  unit_price: number;
}

export interface DbVenueOrder {
  id: string;
  event_id: string;
  reference: string;
  status: TicketStatus;
  items: VenueOrderItem[];
  total: number;
  payment_method: PaymentMethod | null;
  qpay_invoice_id: string | null;
  paid_at: string | null;
  buyer_phone: string | null;
  ebarimt_id: string | null;
  ebarimt_qr_data: string | null;
  ebarimt_lottery: string | null;
  kiosk_id: string | null;
  created_at: string;
}

export interface DbVenueTicket {
  id: string;
  order_id: string;
  zone_id: string;
  code: string;
  status: VenueTicketStatus;
  used_at: string | null;
  created_at: string;
}

/** Event + its in-person zones, returned to the kiosk catalog. */
export interface KioskEvent {
  id: string;
  title: string;
  description: string | null;
  status: EventStatus;
  start_time: string;
  image: string | null;
  thumbnail_url: string | null;
  zones: KioskZone[];
}

export interface KioskOrderItemInput {
  zone_id: string;
  qty: number;
}

export interface KioskCreateOrderInput {
  event_id: string;
  items: KioskOrderItemInput[];
  method: PaymentMethod;
  buyer_phone?: string | null;
  kiosk_id?: string | null;
}

export interface KioskCreateOrderResponse {
  order_id: string;
  reference: string;
  total: number;
  /** Present for the QPay rail — the QR to display. */
  qr_text?: string;
  qr_image?: string;
  urls?: QPayInvoiceLink[];
}

export interface KioskEbarimt {
  qrData: string;
  lottery: string;
}

export interface KioskTicketOut {
  code: string;
  zone_name_mn: string;
  zone_name_en: string;
}

export interface KioskOrderStatus {
  order_id: string;
  reference: string;
  status: TicketStatus;
  total: number;
  paid_at: string | null;
  tickets: KioskTicketOut[];
  ebarimt: KioskEbarimt | null;
}

/** Posted by the kiosk after the card terminal + POSAPI complete (card rail). */
export interface KioskCardResultInput {
  approved: boolean;
  payment_ref?: string;
  ebarimt?: KioskEbarimt;
}
