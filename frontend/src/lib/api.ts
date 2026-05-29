

import { supabase } from './supabase';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeader()),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { ok: false, error: 'network_error', status: 0, details: (err as Error).message };
  }
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
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
  user: { id: string; phone: string | null; email?: string | null; role: 'user' | 'admin' };
};

export type MeResponse = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string | null;
  phone_confirmed_at: string | null;
  email_confirmed_at: string | null;
};

export const api = {
  registerPhone: (input: { fullName: string; phone: string; password: string }) =>
    request<{ phone: string }>('POST', '/api/auth/register/phone', input),

  registerEmail: (input: { fullName: string; email: string; password: string }) =>
    request<{ email: string }>('POST', '/api/auth/register/email', input),

  verifyPhone: (input: { phone: string; code: string }) =>
    request<AuthSessionPayload>('POST', '/api/auth/verify-phone', input),

  login: (input: { identifier: string; password: string }) =>
    request<AuthSessionPayload>('POST', '/api/auth/login', input),

  resendCode: (input: { identifier: string }) =>
    request<{ kind: 'phone' | 'email'; identifier: string }>(
      'POST',
      '/api/auth/resend-code',
      input,
    ),

  logout: () => request<void>('POST', '/api/auth/logout'),

  me: () => request<MeResponse>('GET', '/api/auth/me'),

  deleteAccount: () => request<void>('DELETE', '/api/auth/account'),
};
