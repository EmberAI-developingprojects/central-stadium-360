import { getSupabaseAdmin } from "./supabase";

const STALE_SECONDS = 90;

export type DeviceAdmitResult =
  | { ok: true; active: number }
  | { ok: false; error: "device_limit_reached"; active: number; limit: number }
  | { ok: false; error: "internal_error" };

export async function admitDevice(
  ticketId: string,
  deviceId: string,
  maxDevices: number,
): Promise<DeviceAdmitResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "internal_error" };
  const nowIso = new Date().toISOString();

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
