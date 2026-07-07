import type {
  AdminAdmissionReport,
  AdminReconciliationReport,
  AdminSellThroughReport,
  AdminTicketRow,
  AdminTicketStats,
  AdminUserRow,
  AdminVenueOrderDetail,
  AdminVenueOrderRow,
  AdminVenueStats,
  ReconRange,
  SellThroughScope,
  DbEvent,
  DbHomeHero,
  DbHomeNews,
  DbHomePartner,
  DbHomeRoadmap,
  DbHomeService,
  DbHistoryFigure,
  DbRecording,
  DbTicket,
  DbZone,
  EventInput,
  EventPatch,
  EventStatus,
  KioskCreateOrderResponse,
  KioskEbarimt,
  KioskEvent,
  KioskOrderItemInput,
  KioskOrderStatus,
  PaymentMethod,
  ZoneInput,
  ZonePatch,
  HomeContentResponse,
  HomeContentSection,
  PaymentStatus,
  TicketCreateResponse,
  TicketStatus,
  UserRole,
} from "@cs360/shared";
import { supabase } from "./supabase";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const DEVICE_ID_KEY = "cs360_device_id";

/**
 * A stable per-browser device id, persisted in localStorage. Sent with the
 * watch token + heartbeat so the backend can enforce a ticket tier's
 * concurrent-device cap (a new device beyond the cap is refused).
 */
export function getDeviceId(): string {
  if (typeof localStorage === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; details?: unknown };

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(await authHeader()),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return {
      ok: false,
      error: "network_error",
      status: 0,
      details: (err as Error).message,
    };
  }
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {}
  if (!res.ok || json.ok === false) {
    return {
      ok: false,
      error: (json.error as string) ?? `http_${res.status}`,
      status: res.status,
      details: json,
    };
  }
  return { ok: true, data: (json.data as T) ?? (undefined as unknown as T) };
}

export type AuthSessionPayload = {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number | null;
    expires_in: number | null;
  };
  user: {
    id: string;
    phone: string | null;
    email?: string | null;
    role: "user" | "admin";
  };
};

export type MeResponse = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  role: "user" | "admin";
  created_at: string | null;
  phone_confirmed_at: string | null;
  email_confirmed_at: string | null;
};

export type WatchCam = {
  id: string;
  label: string;
  sub: string;
  type: "normal" | "360";
  hlsUrl: string | null;
};

export type ArchivedEvent = {
  id: string;
  name: string;
  date: string;
  thumbnail_url: string | null;
  replay_price: number;
  recording_count: number;
};

export type VODEventDetail = {
  id: string;
  name: string;
  date: string;
  description: string | null;
  thumbnail_url: string | null;
  replay_price: number;
  status: EventStatus;
  has_access: boolean;
  recordings: DbRecording[];
  recordings_pending?: boolean;
};

export type SignedRecordingUrl = {
  url: string;
  expires_at: string;
};

export const api = {
  registerPhone: (input: {
    fullName: string;
    phone: string;
    password: string;
  }) => request<{ phone: string }>("POST", "/api/auth/register/phone", input),

  registerEmail: (input: {
    fullName: string;
    email: string;
    password: string;
  }) => request<{ email: string }>("POST", "/api/auth/register/email", input),

  verifyPhone: (input: { phone: string; code: string }) =>
    request<AuthSessionPayload>("POST", "/api/auth/verify-phone", input),

  login: (input: { identifier: string; password: string }) =>
    request<AuthSessionPayload>("POST", "/api/auth/login", input),

  resendCode: (input: { identifier: string }) =>
    request<{ kind: "phone" | "email"; identifier: string }>(
      "POST",
      "/api/auth/resend-code",
      input,
    ),

  forgotPasswordSend: (input: { phone: string }) =>
    request<{ phone: string }>("POST", "/api/auth/forgot-password/send", input),

  forgotPasswordVerify: (input: { phone: string; code: string }) =>
    request<{ phone: string }>(
      "POST",
      "/api/auth/forgot-password/verify",
      input,
    ),

  forgotPasswordReset: (input: {
    phone: string;
    code: string;
    password: string;
  }) =>
    request<{ phone: string }>(
      "POST",
      "/api/auth/forgot-password/reset",
      input,
    ),

  logout: () => request<void>("POST", "/api/auth/logout"),

  me: () => request<MeResponse>("GET", "/api/auth/me"),

  deleteAccount: () => request<void>("DELETE", "/api/auth/account"),

  listEvents: () => request<DbEvent[]>("GET", "/api/events"),

  listArchivedEvents: () =>
    request<ArchivedEvent[]>("GET", "/api/events/archived"),

  getEventForVOD: (id: string) =>
    request<VODEventDetail>(
      "GET",
      `/api/events/${encodeURIComponent(id)}/replay`,
    ),

  signRecordingUrl: (id: string) =>
    request<SignedRecordingUrl>(
      "POST",
      `/api/recordings/${encodeURIComponent(id)}/sign-url`,
    ),

  buyReplay: (eventId: string) =>
    request<TicketCreateResponse>(
      "POST",
      `/api/events/${encodeURIComponent(eventId)}/buy-replay`,
    ),

  getHomeContent: () => request<HomeContentResponse>("GET", "/api/content"),

  listHistoryFigures: () => request<DbHistoryFigure[]>("GET", "/api/history"),

  getWatchToken: (eventId?: string, deviceId?: string) => {
    const qs = new URLSearchParams();
    if (eventId) qs.set("event_id", eventId);
    if (deviceId) qs.set("device_id", deviceId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ cams: WatchCam[] }>("GET", `/api/watch/token${suffix}`);
  },

  // Keep this device's tier slot alive while watching. Returns device_limit_reached
  // (with active/limit in `details`) if the slot was lost / the cap is exceeded.
  watchHeartbeat: (eventId: string, deviceId: string) =>
    request<{ active: number }>("POST", "/api/watch/heartbeat", {
      event_id: eventId,
      device_id: deviceId,
    }),

  // Free this device's tier slot on stream stop / unmount (best-effort).
  watchRelease: (eventId: string, deviceId: string) =>
    request<Record<string, never>>("POST", "/api/watch/release", {
      event_id: eventId,
      device_id: deviceId,
    }),

  getWatchStatus: () =>
    request<{
      live: boolean;
      checkedAt: number;
      startedAt: number | null;
    }>("GET", "/api/watch/status"),

  createTicket: (input: {
    event_id: string;
    ticket_type?: "live" | "replay";
    tier?: "standard" | "multi3" | "multi5";
  }) => request<TicketCreateResponse>("POST", "/api/tickets/create", input),

  getPaymentStatus: (invoiceId: string) =>
    request<PaymentStatus>(
      "GET",
      `/api/payments/status/${encodeURIComponent(invoiceId)}`,
    ),

  listMyTickets: () => request<DbTicket[]>("GET", "/api/tickets/my"),

  admin: {
    listEvents: () =>
      request<(DbEvent & { recording_count: number })[]>(
        "GET",
        "/api/admin/events",
      ),
    getEvent: (id: string) =>
      request<DbEvent>("GET", `/api/admin/events/${id}`),
    createEvent: (input: EventInput) =>
      request<DbEvent>("POST", "/api/admin/events", input),
    updateEvent: (id: string, patch: EventPatch) =>
      request<DbEvent>("PATCH", `/api/admin/events/${id}`, patch),
    deleteEvent: (id: string) =>
      request<{ id: string }>("DELETE", `/api/admin/events/${id}`),
    featureEvent: (id: string) =>
      request<DbEvent>("POST", `/api/admin/events/${id}/feature`),

    listZones: (eventId: string) =>
      request<DbZone[]>(
        "GET",
        `/api/admin/events/${encodeURIComponent(eventId)}/zones`,
      ),
    createZone: (eventId: string, input: ZoneInput) =>
      request<DbZone>(
        "POST",
        `/api/admin/events/${encodeURIComponent(eventId)}/zones`,
        input,
      ),
    updateZone: (eventId: string, zoneId: string, patch: ZonePatch) =>
      request<DbZone>(
        "PATCH",
        `/api/admin/events/${encodeURIComponent(eventId)}/zones/${encodeURIComponent(zoneId)}`,
        patch,
      ),
    deleteZone: (eventId: string, zoneId: string) =>
      request<{ id: string }>(
        "DELETE",
        `/api/admin/events/${encodeURIComponent(eventId)}/zones/${encodeURIComponent(zoneId)}`,
      ),

    listEventRecordings: (eventId: string) =>
      request<DbRecording[]>(
        "GET",
        `/api/admin/events/${encodeURIComponent(eventId)}/recordings`,
      ),
    rediscoverRecordings: (eventId: string) =>
      request<DbRecording[]>(
        "POST",
        `/api/admin/events/${encodeURIComponent(eventId)}/rediscover`,
      ),
    endLive: (eventId: string) =>
      request<{
        stop: {
          total: number;
          stopped: string[];
          alreadyOffline: string[];
          failed: Array<{ arn: string; error: string }>;
        };
        recordings: DbRecording[];
      }>("POST", `/api/admin/events/${encodeURIComponent(eventId)}/end-live`),
    createRecording: (input: {
      event_id: string;
      camera_number: number;
      channel_arn?: string | null;
      s3_bucket?: string | null;
      s3_key_prefix?: string | null;
      master_playlist_path?: string | null;
      duration_seconds?: number | null;
      recording_started_at?: string | null;
      recording_ended_at?: string | null;
    }) => request<DbRecording>("POST", "/api/admin/recordings", input),
    listChannelArns: () =>
      request<{ camera_number: number; arn: string | null }[]>(
        "GET",
        "/api/admin/recordings/channel-arns",
      ),

    replaceContentSection: (
      section: HomeContentSection,
      items:
        | Partial<DbHomeNews>[]
        | Partial<DbHomePartner>[]
        | Partial<DbHomeRoadmap>[]
        | Partial<DbHomeService>[]
        | DbHomeHero[],
    ) => request<unknown[]>("PUT", `/api/admin/content/${section}`, items),

    listHistoryFigures: () =>
      request<DbHistoryFigure[]>("GET", "/api/admin/history"),
    replaceHistoryFigures: (items: Partial<DbHistoryFigure>[]) =>
      request<DbHistoryFigure[]>("PUT", "/api/admin/history", items),

    listTickets: (filter?: {
      status?: TicketStatus | "all";
      eventId?: string;
      from?: string;
      to?: string;
    }) => {
      const qs = new URLSearchParams();
      if (filter?.status) qs.set("status", filter.status);
      if (filter?.eventId) qs.set("eventId", filter.eventId);
      if (filter?.from) qs.set("from", filter.from);
      if (filter?.to) qs.set("to", filter.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<AdminTicketRow[]>("GET", `/api/admin/tickets${suffix}`);
    },
    getTicket: (id: string) =>
      request<AdminTicketRow>("GET", `/api/admin/tickets/${id}`),
    refundTicket: (id: string) =>
      request<AdminTicketRow>("POST", `/api/admin/tickets/${id}/refund`),
    deleteTicket: (id: string) =>
      request<{ id: string }>("DELETE", `/api/admin/tickets/${id}`),
    ticketsStats: () =>
      request<AdminTicketStats>("GET", `/api/admin/tickets/stats`),

    createUser: (input: {
      email: string;
      password: string;
      full_name?: string;
      role?: "user" | "admin";
    }) => request<AdminUserRow>("POST", "/api/admin/users", input),
    listUsers: () => request<AdminUserRow[]>("GET", "/api/admin/users"),
    getUser: (id: string) =>
      request<AdminUserRow>("GET", `/api/admin/users/${id}`),
    setUserRole: (id: string, role: UserRole) =>
      request<AdminUserRow>("PATCH", `/api/admin/users/${id}/role`, { role }),
    setUserDisabled: (id: string, disabled: boolean) =>
      request<AdminUserRow>("PATCH", `/api/admin/users/${id}/disabled`, {
        disabled,
      }),
    deleteUser: (id: string) =>
      request<{ id: string }>("DELETE", `/api/admin/users/${id}`),

    kiosk: {
      listEvents: () => request<KioskEvent[]>("GET", "/api/admin/kiosk/events"),
      stats: () => request<AdminVenueStats>("GET", "/api/admin/kiosk/stats"),
      sellThrough: (scope?: SellThroughScope) =>
        request<AdminSellThroughReport>(
          "GET",
          `/api/admin/kiosk/sell-through${scope ? `?scope=${scope}` : ""}`,
        ),
      reconciliation: (opts?: { range?: ReconRange; eventId?: string }) => {
        const qs = new URLSearchParams();
        if (opts?.range) qs.set("range", opts.range);
        if (opts?.eventId) qs.set("eventId", opts.eventId);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request<AdminReconciliationReport>(
          "GET",
          `/api/admin/kiosk/reconciliation${suffix}`,
        );
      },
      admission: (opts?: { eventId?: string; scope?: "onsale" | "all" }) => {
        const qs = new URLSearchParams();
        if (opts?.eventId) qs.set("eventId", opts.eventId);
        if (opts?.scope) qs.set("scope", opts.scope);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request<AdminAdmissionReport>(
          "GET",
          `/api/admin/kiosk/admission${suffix}`,
        );
      },
      listOrders: (filter?: {
        status?: TicketStatus | "all";
        eventId?: string;
      }) => {
        const qs = new URLSearchParams();
        if (filter?.status) qs.set("status", filter.status);
        if (filter?.eventId) qs.set("eventId", filter.eventId);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request<AdminVenueOrderRow[]>(
          "GET",
          `/api/admin/kiosk/orders${suffix}`,
        );
      },
      getOrder: (id: string) =>
        request<AdminVenueOrderDetail>(
          "GET",
          `/api/admin/kiosk/orders/${encodeURIComponent(id)}`,
        ),
      createOrder: (input: {
        event_id: string;
        items: KioskOrderItemInput[];
        method: PaymentMethod;
        buyer_phone?: string | null;
      }) =>
        request<KioskCreateOrderResponse>(
          "POST",
          "/api/admin/kiosk/orders",
          input,
        ),
      orderStatus: (id: string) =>
        request<KioskOrderStatus>(
          "GET",
          `/api/admin/kiosk/orders/${encodeURIComponent(id)}/status`,
        ),
      cardResult: (
        id: string,
        input: { approved: boolean; ebarimt?: KioskEbarimt },
      ) =>
        request<KioskOrderStatus>(
          "POST",
          `/api/admin/kiosk/orders/${encodeURIComponent(id)}/card-result`,
          input,
        ),
    },

    uploadImage: async (
      file: File,
    ): Promise<ApiResult<{ url: string; key: string }>> => {
      const form = new FormData();
      form.append("file", file);
      const url = `${BASE_URL}/api/admin/uploads/image`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { ...(await authHeader()) },
          body: form,
        });
      } catch (err) {
        return {
          ok: false,
          error: "network_error",
          status: 0,
          details: (err as Error).message,
        };
      }
      let json: Record<string, unknown> = {};
      try {
        json = (await res.json()) as Record<string, unknown>;
      } catch {}
      if (!res.ok || json.ok === false) {
        return {
          ok: false,
          error: (json.error as string) ?? `http_${res.status}`,
          status: res.status,
          details: json,
        };
      }
      return {
        ok: true,
        data: json.data as { url: string; key: string },
      };
    },
  },
};
