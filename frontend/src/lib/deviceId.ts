// Stable per-browser device identifier for the ticket tiers' concurrent-device
// cap (Standard=1, 3-User=3, 5-User=5). One browser profile = one device slot.

const KEY = "cs360_device_id";

let memoryId: string | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Storage unavailable (private mode) — keep one id for this page lifetime.
    if (!memoryId) memoryId = randomId();
    return memoryId;
  }
}
