import type { KioskEvent, KioskScanResult } from "@cs360/shared";

// Device-keyed client for the turnstile gate. Unlike `lib/api.ts` (which sends a
// Supabase user token), the gate authenticates with the static kiosk device key
// via the `X-Kiosk-Key` header — the same boundary the physical kiosk uses.

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export type GateResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

async function gateRequest<T>(
  method: "GET" | "POST",
  path: string,
  key: string,
  body?: unknown,
): Promise<GateResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        "X-Kiosk-Key": key,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, error: "network_error", status: 0 };
  }
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // empty / non-JSON body
  }
  if (!res.ok || json.ok === false) {
    return {
      ok: false,
      error: (json.error as string) ?? `http_${res.status}`,
      status: res.status,
    };
  }
  return { ok: true, data: json.data as T };
}

export const gate = {
  /** Events on sale, used to bind a gate to one event. Also validates the key. */
  events: (key: string) =>
    gateRequest<KioskEvent[]>("GET", "/api/kiosk/events", key),
  /** Redeem an admission ticket code. Returns a verdict, never throws on bad tickets. */
  scan: (key: string, code: string, eventId?: string | null) =>
    gateRequest<KioskScanResult>("POST", "/api/kiosk/scan", key, {
      code,
      event_id: eventId ?? null,
    }),
};
