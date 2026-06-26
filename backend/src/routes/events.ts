import { Hono } from "hono";
import type { DbEvent, DbRecording, EventStatus } from "@cs360/shared";
import { getSupabaseAdmin } from "../lib/supabase";
import { getSupabaseForAccessToken } from "../lib/supabase-anon";
import {
  createTicketInvoice,
  findRecentPendingTicket,
  hasPaidTicket,
  hasValidTicketForEvent,
  reusePendingInvoice,
} from "../lib/tickets";
import { requireUser, type AuthEnv } from "../middleware/require-user";
import { discoverRecordingsForEvent } from "../lib/recordings";

const events = new Hono<AuthEnv>();

events.get("/", async (c) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const FULL =
    "id,title,description,status,start_time,price,live_price,replay_price,live_start_at,live_end_at,replay_available_until,thumbnail_url,image,featured,created_at,title_en,description_en";
  const NO_EN =
    "id,title,description,status,start_time,price,live_price,replay_price,live_start_at,live_end_at,replay_available_until,thumbnail_url,image,featured,created_at";

  let { data, error } = await supabase
    .from("events")
    .select(FULL)
    .order("start_time", { ascending: true });

  if (
    error &&
    (error.code === "42703" ||
      (typeof error.message === "string" &&
        (error.message.includes("title_en") ||
          error.message.includes("description_en"))))
  ) {
    const retry = await supabase
      .from("events")
      .select(NO_EN)
      .order("start_time", { ascending: true });
    data = (retry.data ?? null) as typeof data;
    error = retry.error;
  }

  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }

  return c.json({
    ok: true,
    data: (data ?? []) as unknown as DbEvent[],
  } as const);
});

export type ArchivedEventRow = {
  id: string;
  name: string;
  date: string;
  thumbnail_url: string | null;
  replay_price: number;
  recording_count: number;
};

type ArchivedRaw = {
  id: string;
  title: string;
  start_time: string;
  thumbnail_url: string | null;
  image: string | null;
  replay_price: number;
  live_end_at: string | null;
  recordings: { count: number }[] | { count: number } | null;
};

events.get("/archived", async (c) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const now = new Date();
  const nowIso = now.toISOString();
  const archiveReadyIso = new Date(
    now.getTime() - 10 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,title,start_time,thumbnail_url,image,replay_price,live_end_at,recordings(count)",
    )
    .not("live_end_at", "is", null)
    .lt("live_end_at", archiveReadyIso)
    .gt("replay_available_until", nowIso)
    .order("live_end_at", { ascending: false });
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  const rows: ArchivedEventRow[] = ((data ?? []) as ArchivedRaw[]).map((r) => {
    const rc = Array.isArray(r.recordings)
      ? (r.recordings[0]?.count ?? 0)
      : (r.recordings?.count ?? 0);
    return {
      id: r.id,
      name: r.title,
      date: r.start_time,
      thumbnail_url: r.thumbnail_url ?? r.image ?? null,
      replay_price: Number(r.replay_price ?? 0),
      recording_count: rc,
    };
  });
  return c.json({ ok: true, data: rows } as const);
});

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
  recordings_pending: boolean;
};

type EventDetailRaw = Pick<
  DbEvent,
  | "id"
  | "title"
  | "description"
  | "start_time"
  | "status"
  | "replay_price"
  | "thumbnail_url"
  | "image"
  | "replay_available_until"
  | "live_start_at"
  | "live_end_at"
>;

const ARCHIVE_GRACE_MS = 10 * 60 * 1000;

const RECORDING_COLS =
  "id,event_id,camera_number,channel_arn,s3_bucket,s3_key_prefix,master_playlist_path,duration_seconds,recording_started_at,recording_ended_at,status,created_at";

async function resolveUserIdFromAuth(
  authHeader: string | undefined,
): Promise<string | null> {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const sb = getSupabaseForAccessToken(token);
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

events.get("/:id/replay", async (c) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,title,description,start_time,status,replay_price,thumbnail_url,image,replay_available_until,live_start_at,live_end_at",
    )
    .eq("id", id)
    .maybeSingle<EventDetailRaw>();
  if (error) {
    return c.json({ ok: false, error: error.message } as const, 500);
  }
  if (!event) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }

  const now = Date.now();
  const liveEndMs = event.live_end_at
    ? new Date(event.live_end_at).getTime()
    : NaN;
  const archiveReady =
    !Number.isNaN(liveEndMs) && liveEndMs + ARCHIVE_GRACE_MS < now;
  const replayExpired = event.replay_available_until
    ? new Date(event.replay_available_until).getTime() <= now
    : false;
  if (!archiveReady || replayExpired) {
    return c.json({ ok: false, error: "not_found" } as const, 404);
  }

  const userId = await resolveUserIdFromAuth(c.req.header("authorization"));
  const hasAccess = userId
    ? await hasValidTicketForEvent(userId, event.id)
    : false;

  let recordings: DbRecording[] = [];
  if (hasAccess) {
    const { data: recRows, error: recErr } = await supabase
      .from("recordings")
      .select(RECORDING_COLS)
      .eq("event_id", event.id)
      .eq("status", "ready")
      .order("camera_number", { ascending: true });
    if (recErr) {
      return c.json({ ok: false, error: recErr.message } as const, 500);
    }
    recordings = (recRows ?? []) as DbRecording[];

    if (recordings.length === 0) {
      const discovered = await discoverRecordingsForEvent(event);
      if (discovered.length > 0) {
        recordings = discovered
          .filter((r) => r.status === "ready")
          .sort((a, b) => a.camera_number - b.camera_number);
      }
    }
  }

  const detail: VODEventDetail = {
    id: event.id,
    name: event.title,
    date: event.start_time,
    description: event.description,
    thumbnail_url: event.thumbnail_url ?? event.image ?? null,
    replay_price: Number(event.replay_price ?? 0),
    status: event.status,
    has_access: hasAccess,
    recordings,
    recordings_pending: hasAccess && recordings.length === 0,
  };
  return c.json({ ok: true, data: detail } as const);
});

events.post("/:id/buy-replay", requireUser, async (c) => {
  const user = c.get("user");
  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }
  const id = c.req.param("id");
  const { data: event, error } = await admin
    .from("events")
    .select("id,title,status,replay_price,replay_available_until")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      title: string;
      status: EventStatus;
      replay_price: number;
      replay_available_until: string | null;
    }>();
  if (error) {
    return c.json({ ok: false, error: "internal_error" } as const, 500);
  }
  if (!event) {
    return c.json({ ok: false, error: "event_not_found" } as const, 404);
  }
  if (event.status !== "archived") {
    return c.json({ ok: false, error: "replay_not_available" } as const, 409);
  }
  const expired = event.replay_available_until
    ? new Date(event.replay_available_until).getTime() <= Date.now()
    : false;
  if (expired) {
    return c.json({ ok: false, error: "replay_expired" } as const, 409);
  }

  const alreadyOwned = await hasPaidTicket(user.id, event.id, "replay");
  if (alreadyOwned) {
    return c.json({ ok: false, error: "ticket_already_owned" } as const, 409);
  }

  const pending = await findRecentPendingTicket(user.id, event.id, "replay");
  if (pending) {
    const reuse = await reusePendingInvoice(pending, event.id);
    if (reuse.ok) {
      return c.json({ ok: true, data: reuse.data } as const);
    }
  }

  const price = Number(event.replay_price ?? 0);
  const res = await createTicketInvoice({
    userId: user.id,
    event: { id: event.id, title: event.title },
    ticketType: "replay",
    price,
  });
  if (!res.ok) {
    return c.json(
      { ok: false, error: res.error } as const,
      res.status as 400 | 403 | 404 | 409 | 500 | 502 | 503,
    );
  }
  return c.json({ ok: true, data: res.data } as const);
});

export default events;
