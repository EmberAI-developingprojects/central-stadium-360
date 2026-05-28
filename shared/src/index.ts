// API envelope ---------------------------------------------------------------
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface HealthResponse {
  status: "ok";
  service: string;
  uptime: number;
}

// Domain models — kept in sync with supabase/migrations/0001_init.sql -------
export type UserRole = "user" | "admin";
export type EventStatus = "upcoming" | "live" | "ended";
export type TicketStatus = "pending" | "paid" | "cancelled";

export interface DbUser {
  id: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface DbEvent {
  id: string;
  title: string;
  description: string | null;
  status: EventStatus;
  start_time: string;
  price: number;
  created_at: string;
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
}

export interface DbSession {
  id: string;
  ticket_id: string;
  device_id: string;
  started_at: string;
  last_seen_at: string;
}

// Payment / QPay --------------------------------------------------------------
export interface QPayInvoiceLink {
  /** Display name, e.g. "qPay wallet", "Khan Bank". */
  name: string;
  /** Friendly description. */
  description?: string;
  /** Logo URL. */
  logo?: string;
  /** Deeplink URL — open in mobile to launch the bank app. */
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
