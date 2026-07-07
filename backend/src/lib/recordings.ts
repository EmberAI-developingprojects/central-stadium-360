import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { DbEvent, DbRecording } from "@cs360/shared";
import { getSupabaseAdmin } from "./supabase";
import {
  isWowzaConfigured,
  listVideosForLiveStream,
  pickMp4DownloadUrl,
  readCameraStreamIds,
  type WowzaVideo,
} from "./wowza";

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

function s3KeyPrefix(eventId: string, camNumber: number): string {
  return `wowza/${eventId}/cam${camNumber}/`;
}

function s3Mp4Key(eventId: string, camNumber: number): string {
  return `${s3KeyPrefix(eventId, camNumber)}recording.mp4`;
}

async function objectExists(
  s3: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Pick the Wowza video that best matches an event window.
 * Prefers videos whose created_at falls inside the window (with lookback/lookahead
 * padding); falls back to the newest FINISHED asset within the padded window.
 */
function pickVideoForWindow(
  videos: WowzaVideo[],
  startMs: number,
  endMs: number,
): WowzaVideo | null {
  const paddedStart = startMs - DISCOVERY_LOOKBACK_MS;
  const paddedEnd = endMs + DISCOVERY_LOOKAHEAD_MS;
  const inWindow = videos
    .filter((v) => v.state === "FINISHED")
    .filter((v) => {
      const t = new Date(v.created_at).getTime();
      return Number.isFinite(t) && t >= paddedStart && t <= paddedEnd;
    });
  if (inWindow.length === 0) return null;
  inWindow.sort(
    (a, b) => (b.duration_in_ms ?? 0) - (a.duration_in_ms ?? 0),
  );
  return inWindow[0] ?? null;
}

/**
 * Stream a Wowza MP4 download URL directly into our S3 bucket via multipart
 * upload. Returns the object metadata written.
 */
async function copyWowzaVideoToS3(
  s3: S3Client,
  bucket: string,
  key: string,
  sourceUrl: string,
): Promise<{ contentLength: number | null }> {
  const res = await fetch(sourceUrl);
  if (!res.ok || !res.body) {
    throw new Error(
      `wowza download failed: ${res.status} ${res.statusText}`,
    );
  }
  const contentLengthHeader = res.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: res.body as unknown as ReadableStream,
      ContentType: "video/mp4",
    },
    queueSize: 4,
    partSize: 16 * 1024 * 1024,
  });
  await upload.done();
  return { contentLength };
}

/**
 * Discover recordings for an event by pulling Wowza VOD assets whose
 * created_at falls in the event window, copying each MP4 into our S3 bucket,
 * and upserting one row per camera.
 *
 * Idempotent: if a target S3 object already exists AND the recordings row is
 * already `ready`, the camera is skipped (no re-download).
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
  ) {
    return [];
  }

  if (!isWowzaConfigured()) {
    console.warn("[recordings] WOWZA_JWT not configured");
    return [];
  }
  const bucket = process.env.AWS_IVS_RECORDINGS_BUCKET;
  if (!bucket) {
    console.warn("[recordings] AWS_IVS_RECORDINGS_BUCKET not configured");
    return [];
  }
  const s3 = getS3Client();
  if (!s3) {
    console.warn("[recordings] AWS_REGION not configured");
    return [];
  }

  const cameraIds = readCameraStreamIds();
  if (cameraIds.size === 0) {
    console.warn("[recordings] no WOWZA_CAM*_STREAM_ID configured");
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

  for (const [cameraNumber, streamId] of cameraIds) {
    try {
      const videos = await listVideosForLiveStream(streamId);
      const video = pickVideoForWindow(videos, liveStartMs, liveEndMs);
      if (!video) {
        missingCams.push(cameraNumber);
        continue;
      }
      const mp4Url = pickMp4DownloadUrl(video);
      if (!mp4Url) {
        console.warn(
          `[recordings] cam${cameraNumber} video=${video.id} has no MP4 encoding yet`,
        );
        missingCams.push(cameraNumber);
        continue;
      }
      const key = s3Mp4Key(event.id, cameraNumber);
      const alreadyThere = await objectExists(s3, bucket, key);
      if (!alreadyThere) {
        console.info(
          `[recordings] cam${cameraNumber} → s3://${bucket}/${key} (from wowza video ${video.id})`,
        );
        await copyWowzaVideoToS3(s3, bucket, key, mp4Url);
      }
      const durationSeconds =
        video.duration_in_ms !== null && video.duration_in_ms !== undefined
          ? Math.floor(video.duration_in_ms / 1000)
          : null;
      found.push({
        event_id: event.id,
        camera_number: cameraNumber,
        channel_arn: `wowza:${streamId}:${video.id}`,
        s3_bucket: bucket,
        s3_key_prefix: s3KeyPrefix(event.id, cameraNumber),
        master_playlist_path: key,
        duration_seconds: durationSeconds,
        recording_started_at: video.created_at,
        recording_ended_at: video.updated_at ?? null,
        status: "ready",
      });
    } catch (err) {
      missingCams.push(cameraNumber);
      console.warn(
        `[recordings] camera ${cameraNumber} discovery failed:`,
        (err as Error).message,
      );
    }
  }

  console.info(
    `[recordings] event=${event.id} cams_found=[${found
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
