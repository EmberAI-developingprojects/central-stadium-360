import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import type { DbEvent, DbRecording } from "@cs360/shared";
import { getSupabaseAdmin } from "./supabase";

const HOUR_MS = 60 * 60 * 1000;
const CAMERA_NUMBERS = [1, 2, 3, 4] as const;
// IVS auto-record sessions are bucketed by the hour the session *started* —
// which can be slightly before the event's official live_start_at, and the
// final write of recording-ended.json can land well after live_end_at.
// Widen the scan window so off-by-an-hour sessions still get discovered.
const DISCOVERY_LOOKBACK_MS = 60 * 60 * 1000;
const DISCOVERY_LOOKAHEAD_MS = 2 * 60 * 60 * 1000;

const RECORDING_COLS =
  "id,event_id,camera_number,channel_arn,s3_bucket,s3_key_prefix,master_playlist_path,duration_seconds,recording_started_at,recording_ended_at,status,created_at";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;
  const region = process.env.AWS_REGION;
  if (!region) return null;
  s3Client = new S3Client({ region });
  return s3Client;
}

/**
 * Parse the AWS account id (5th colon-separated segment) and channel id
 * (last segment after `channel/`) from an IVS channel ARN.
 *
 * Example: arn:aws:ivs:us-east-1:123456789012:channel/AbCdEf123456
 *  → { accountId: "123456789012", channelId: "AbCdEf123456" }
 */
function parseChannelArn(
  arn: string,
): { accountId: string; channelId: string } | null {
  const parts = arn.split(":");
  if (parts.length < 6) return null;
  const accountId = parts[4];
  const resource = parts[5];
  if (!accountId || !resource) return null;
  const channelId = resource.startsWith("channel/")
    ? resource.slice("channel/".length)
    : null;
  if (!channelId) return null;
  return { accountId, channelId };
}

function readCameraArns(): Map<number, string> {
  const map = new Map<number, string>();
  for (const cam of CAMERA_NUMBERS) {
    const arn = process.env[`AWS_IVS_CAM${cam}_ARN`];
    if (arn && arn.trim().length > 0) map.set(cam, arn.trim());
  }
  return map;
}

/**
 * Inclusive hour buckets [floor(start), floor(end)] in UTC.
 * 10:55 → 15:05 returns [10, 11, 12, 13, 14, 15] (six hours).
 */
function* iterateUtcHours(
  startMs: number,
  endMs: number,
): Generator<{ year: number; month: number; day: number; hour: number }> {
  const startHour = Math.floor(startMs / HOUR_MS) * HOUR_MS;
  const endHour = Math.floor(endMs / HOUR_MS) * HOUR_MS;
  for (let t = startHour; t <= endHour; t += HOUR_MS) {
    const d = new Date(t);
    yield {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
    };
  }
}

function buildHourPrefix(
  accountId: string,
  channelId: string,
  year: number,
  month: number,
  day: number,
  hour: number,
): string {
  // IVS auto-record-to-S3 path segments are NOT zero-padded:
  //   ivs/v1/<acct>/<ch>/2026/6/16/2/48/<session>/...
  return `ivs/v1/${accountId}/${channelId}/${year}/${month}/${day}/${hour}/`;
}

/**
 * Given a master.m3u8 key, return the session folder prefix.
 *   ivs/v1/acct/ch/2026/06/10/13/<session>/media/hls/master.m3u8
 *     → ivs/v1/acct/ch/2026/06/10/13/<session>/
 */
function sessionPrefixFromMasterKey(key: string): string | null {
  const idx = key.indexOf("/media/");
  if (idx < 0) return null;
  return key.slice(0, idx + 1); // includes trailing slash
}

type EndedJson = {
  recording_duration_ms?: number;
  recording_started_at?: string;
  recording_ended_at?: string;
};

async function readEndedJson(
  s3: S3Client,
  bucket: string,
  sessionPrefix: string,
): Promise<EndedJson | null> {
  const key = `${sessionPrefix}events/recording-ended.json`;
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text) as EndedJson;
  } catch {
    return null;
  }
}

/**
 * Fallback when recording-ended.json is missing: pick the lowest-named
 * rendition folder under <session>/media/hls/ and count its *.ts segments.
 * Returns 0 if no renditions or no segments are found.
 */
async function countSegmentsFallback(
  s3: S3Client,
  bucket: string,
  sessionPrefix: string,
): Promise<number> {
  const renditionList = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${sessionPrefix}media/hls/`,
      Delimiter: "/",
      MaxKeys: 100,
    }),
  );
  const renditions = (renditionList.CommonPrefixes ?? [])
    .map((p) => p.Prefix)
    .filter((p): p is string => Boolean(p))
    .sort();
  if (renditions.length === 0) return 0;
  const firstRendition = renditions[0];

  let count = 0;
  let token: string | undefined;
  do {
    const segs = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: firstRendition,
        MaxKeys: 1000,
        ContinuationToken: token,
      }),
    );
    for (const obj of segs.Contents ?? []) {
      if (obj.Key && obj.Key.endsWith(".ts")) count += 1;
    }
    token = segs.IsTruncated ? segs.NextContinuationToken : undefined;
  } while (token);
  return count;
}

type SessionStats = {
  sessionPrefix: string;
  durationSeconds: number | null;
  segmentCount: number | null;
  startedAt: string | null;
  endedAt: string | null;
  /** Numeric weight for "longest" comparison. */
  rank: number;
};

async function evaluateSession(
  s3: S3Client,
  bucket: string,
  sessionPrefix: string,
): Promise<SessionStats> {
  const ended = await readEndedJson(s3, bucket, sessionPrefix);
  if (ended && typeof ended.recording_duration_ms === "number") {
    const durationSeconds = Math.floor(ended.recording_duration_ms / 1000);
    return {
      sessionPrefix,
      durationSeconds,
      segmentCount: null,
      startedAt: ended.recording_started_at ?? null,
      endedAt: ended.recording_ended_at ?? null,
      rank: durationSeconds,
    };
  }
  const segmentCount = await countSegmentsFallback(s3, bucket, sessionPrefix);
  console.warn(
    `[recordings] partial recording: ${sessionPrefix} missing events/recording-ended.json (segment_count=${segmentCount})`,
  );
  return {
    sessionPrefix,
    durationSeconds: null,
    segmentCount,
    startedAt: null,
    endedAt: null,
    rank: segmentCount,
  };
}

async function listMasterKeysForCamera(
  s3: S3Client,
  bucket: string,
  accountId: string,
  channelId: string,
  startMs: number,
  endMs: number,
): Promise<string[]> {
  const masters: string[] = [];
  for (const slot of iterateUtcHours(startMs, endMs)) {
    const prefix = buildHourPrefix(
      accountId,
      channelId,
      slot.year,
      slot.month,
      slot.day,
      slot.hour,
    );
    let token: string | undefined;
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: token,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key && obj.Key.endsWith("/media/hls/master.m3u8")) {
          masters.push(obj.Key);
        }
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  }
  return masters;
}

async function discoverCamera(
  s3: S3Client,
  bucket: string,
  accountId: string,
  cameraNumber: number,
  channelArn: string,
  startMs: number,
  endMs: number,
): Promise<
  Pick<
    DbRecording,
    | "camera_number"
    | "channel_arn"
    | "s3_bucket"
    | "s3_key_prefix"
    | "master_playlist_path"
    | "duration_seconds"
    | "recording_started_at"
    | "recording_ended_at"
    | "status"
  >
  | null
> {
  const parsed = parseChannelArn(channelArn);
  if (!parsed) return null;
  const masters = await listMasterKeysForCamera(
    s3,
    bucket,
    accountId,
    parsed.channelId,
    startMs,
    endMs,
  );
  const seenSessions = new Set<string>();
  const sessionPrefixes: string[] = [];
  for (const key of masters) {
    const prefix = sessionPrefixFromMasterKey(key);
    if (!prefix || seenSessions.has(prefix)) continue;
    seenSessions.add(prefix);
    sessionPrefixes.push(prefix);
  }
  if (sessionPrefixes.length === 0) return null;

  const stats = await Promise.all(
    sessionPrefixes.map((p) => evaluateSession(s3, bucket, p)),
  );
  // Longest by rank (duration_seconds, or segment_count fallback).
  // 0-ranked sessions are skipped: they have no playable content.
  const valid = stats.filter((s) => s.rank > 0);
  if (valid.length === 0) return null;
  const best = valid.reduce((a, b) => (b.rank > a.rank ? b : a));

  return {
    camera_number: cameraNumber,
    channel_arn: channelArn,
    s3_bucket: bucket,
    s3_key_prefix: best.sessionPrefix,
    master_playlist_path: `${best.sessionPrefix}media/hls/master.m3u8`,
    duration_seconds: best.durationSeconds,
    recording_started_at: best.startedAt,
    recording_ended_at: best.endedAt,
    status: "ready",
  };
}

/**
 * Scan S3 for the event's auto-recordings and upsert the rows into
 * the `recordings` table. Returns the rows for cameras that were found.
 * Cameras with no session in the time range are left without a row;
 * a later retry (or first viewer hit) may fill them in.
 */
export async function discoverRecordingsForEvent(
  event: Pick<DbEvent, "id" | "live_start_at" | "live_end_at">,
): Promise<DbRecording[]> {
  if (!event.live_start_at || !event.live_end_at) return [];
  const liveStartMs = new Date(event.live_start_at).getTime();
  const liveEndMs = new Date(event.live_end_at).getTime();
  if (
    Number.isNaN(liveStartMs) ||
    Number.isNaN(liveEndMs) ||
    liveEndMs <= liveStartMs
  )
    return [];
  const startMs = liveStartMs - DISCOVERY_LOOKBACK_MS;
  const endMs = liveEndMs + DISCOVERY_LOOKAHEAD_MS;

  const bucket = process.env.AWS_IVS_RECORDINGS_BUCKET;
  if (!bucket) {
    console.warn("[recordings] AWS_IVS_RECORDINGS_BUCKET not configured");
    return [];
  }
  const cameraArns = readCameraArns();
  if (cameraArns.size === 0) {
    console.warn("[recordings] no AWS_IVS_CAM*_ARN configured");
    return [];
  }
  const firstArn = cameraArns.get(1) ?? cameraArns.values().next().value;
  if (!firstArn) return [];
  const parsedFirst = parseChannelArn(firstArn);
  if (!parsedFirst) {
    console.warn("[recordings] could not parse account-id from camera ARN");
    return [];
  }
  const accountId = parsedFirst.accountId;

  const s3 = getS3Client();
  if (!s3) {
    console.warn("[recordings] AWS_REGION not configured");
    return [];
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  type Insertable = Pick<
    DbRecording,
    | "event_id"
    | "camera_number"
    | "channel_arn"
    | "s3_bucket"
    | "s3_key_prefix"
    | "master_playlist_path"
    | "duration_seconds"
    | "recording_started_at"
    | "recording_ended_at"
    | "status"
  >;
  const found: Insertable[] = [];
  const missingCams: number[] = [];
  for (const [cameraNumber, arn] of cameraArns) {
    try {
      const result = await discoverCamera(
        s3,
        bucket,
        accountId,
        cameraNumber,
        arn,
        startMs,
        endMs,
      );
      if (result) {
        found.push({ event_id: event.id, ...result });
      } else {
        missingCams.push(cameraNumber);
      }
    } catch (err) {
      missingCams.push(cameraNumber);
      console.warn(
        `[recordings] camera ${cameraNumber} discovery failed:`,
        (err as Error).message,
      );
    }
  }

  console.info(
    `[recordings] event=${event.id} window=${new Date(startMs).toISOString()}..${new Date(endMs).toISOString()} cams_found=[${found
      .map((f) => f.camera_number)
      .join(",")}] cams_missing=[${missingCams.join(",")}]`,
  );

  if (found.length === 0) return [];

  const { data, error } = await admin
    .from("recordings")
    .upsert(found, { onConflict: "event_id,camera_number" })
    .select(RECORDING_COLS);
  if (error) {
    console.error("[recordings] upsert failed:", error);
    return [];
  }
  return (data ?? []) as DbRecording[];
}
