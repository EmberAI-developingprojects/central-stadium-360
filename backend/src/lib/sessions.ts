// Concurrent-device enforcement for ticket tiers (Standard=1, 3-User=3, 5-User=5).
// Backed by the public.sessions table (ticket_id, device_id, last_seen_at), which
// existed in the schema but was previously unused.

import { getSupabaseAdmin } from "./supabase";

// A device counts as "active" if its session was seen within this window. The
// player should heartbeat (touchSession) well inside it; a closed tab goes stale
// and frees the slot.
const STALE_SECONDS = 90;

export type DeviceAdmitResult =
  | { ok: true; active: number }
  | { ok: false; error: "device_limit_reached"; active: number; limit: number }
  | { ok: false; error: "internal_error" };

/**
 * Admit `deviceId` to stream on `ticketId`, enforcing `maxDevices`. Re-admits a
 * device that already holds a slot (heartbeat); otherwise admits only if the
 * count of distinct active devices is below the cap. Blocks the (N+1)th device.
 */
export async function admitDevice(
  ticketId: string,
  deviceId: string,
  maxDevices: number,
): Promise<DeviceAdmitResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "internal_error" };
  const nowIso = new Date().toISOString();

  // Already holding a slot? Just refresh the heartbeat.
  const { data: existing, error: exErr } = await admin
    .from("sessions")
    .select("id")
    .eq("ticket_id", ticketId)
    .eq("device_id", deviceId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (exErr) return { ok: false, error: "internal_error" };
  if (existing) {
    await admin
      .from("sessions")
      .update({ last_seen_at: nowIso })
      .eq("id", existing.id);
    const active = await countActiveDevices(ticketId);
    return { ok: true, active };
  }

  // New device — enforce the cap against currently-active distinct devices.
  const active = await countActiveDevices(ticketId);
  if (active >= maxDevices) {
    return {
      ok: false,
      error: "device_limit_reached",
      active,
      limit: maxDevices,
    };
  }
  const { error: insErr } = await admin.from("sessions").insert({
    ticket_id: ticketId,
    device_id: deviceId,
    started_at: nowIso,
    last_seen_at: nowIso,
  });
  if (insErr) return { ok: false, error: "internal_error" };
  return { ok: true, active: active + 1 };
}

/** Heartbeat an already-admitted device so it keeps its slot. */
export async function touchSession(
  ticketId: string,
  deviceId: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("ticket_id", ticketId)
    .eq("device_id", deviceId);
}

/** Release a device's slot (e.g. on explicit stream stop / logout). */
export async function releaseDevice(
  ticketId: string,
  deviceId: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("sessions")
    .delete()
    .eq("ticket_id", ticketId)
    .eq("device_id", deviceId);
}

async function countActiveDevices(ticketId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const staleIso = new Date(Date.now() - STALE_SECONDS * 1000).toISOString();
  const { data, error } = await admin
    .from("sessions")
    .select("device_id")
    .eq("ticket_id", ticketId)
    .gt("last_seen_at", staleIso);
  if (error || !data) return 0;
  return new Set(data.map((r) => r.device_id)).size;
}
