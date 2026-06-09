import type {
  AdminTicketRow,
  AdminTicketStats,
  AdminUserRow,
  DbEvent,
  DbHomeHero,
  DbHomeNews,
  DbHomePartner,
  DbHomeRoadmap,
  DbHomeService,
  DbTicket,
  EventInput,
  EventPatch,
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
  } catch {

  }
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

  getHomeContent: () => request<HomeContentResponse>("GET", "/api/content"),

  getWatchToken: () =>
    request<{ cams: WatchCam[] }>("GET", "/api/watch/token"),

  getWatchStatus: () =>
    request<{
      live: boolean;
      checkedAt: number;
      startedAt: number | null;
    }>("GET", "/api/watch/status"),

  createTicket: (input: { event_id: string }) =>
    request<TicketCreateResponse>("POST", "/api/tickets/create", input),

  getPaymentStatus: (invoiceId: string) =>
    request<PaymentStatus>(
      "GET",
      `/api/payments/status/${encodeURIComponent(invoiceId)}`,
    ),

  listMyTickets: () => request<DbTicket[]>("GET", "/api/tickets/my"),

  admin: {
    listEvents: () => request<DbEvent[]>("GET", "/api/admin/events"),
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

    replaceContentSection: (
      section: HomeContentSection,
      items:
        | Partial<DbHomeNews>[]
        | Partial<DbHomePartner>[]
        | Partial<DbHomeRoadmap>[]
        | Partial<DbHomeService>[]
        | DbHomeHero[],
    ) => request<unknown[]>("PUT", `/api/admin/content/${section}`, items),

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

    createUser: (input: { email: string; password: string; full_name?: string; role?: "user" | "admin" }) =>
      request<AdminUserRow>("POST", "/api/admin/users", input),
    listUsers: () => request<AdminUserRow[]>("GET", "/api/admin/users"),
    getUser: (id: string) => request<AdminUserRow>("GET", `/api/admin/users/${id}`),
    setUserRole: (id: string, role: UserRole) =>
      request<AdminUserRow>("PATCH", `/api/admin/users/${id}/role`, { role }),
    setUserDisabled: (id: string, disabled: boolean) =>
      request<AdminUserRow>("PATCH", `/api/admin/users/${id}/disabled`, { disabled }),
    deleteUser: (id: string) =>
      request<{ id: string }>("DELETE", `/api/admin/users/${id}`),

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
      } catch {

      }
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
