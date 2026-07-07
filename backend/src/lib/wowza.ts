const DEFAULT_BASE = "https://api.video.wowza.com/api/v2.0";

export type WowzaVideoState =
  | "UPLOADING"
  | "WAITING_FOR_ENCODER"
  | "PROCESSING"
  | "FINISHED"
  | "ERROR"
  | "DELETED";

export type WowzaEncoding = {
  video_container?: string | null;
  video_file_url?: string | null;
  file_size?: number | null;
  video_bitrate?: number | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  width?: number | null;
  height?: number | null;
};

export type WowzaVideo = {
  id: string;
  name: string | null;
  state: WowzaVideoState;
  duration_in_ms: number | null;
  created_at: string;
  updated_at?: string | null;
  encodings?: WowzaEncoding[] | null;
  origin?: { id?: string | null; type?: string | null } | null;
};

export type WowzaLiveStreamMeta = {
  id: string;
  name: string;
  state: string;
  save_asset: boolean;
  recording: boolean;
  aspect_ratio_width: number;
  aspect_ratio_height: number;
};

function envOrThrow(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

function baseUrl(): string {
  return process.env.WSC_API_BASE?.trim() || DEFAULT_BASE;
}

async function wowzaFetch(path: string, init?: RequestInit): Promise<Response> {
  const jwt = envOrThrow("WOWZA_JWT");
  const url = `${baseUrl()}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${jwt}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export function isWowzaConfigured(): boolean {
  return Boolean(process.env.WOWZA_JWT?.trim());
}

export async function getLiveStream(id: string): Promise<WowzaLiveStreamMeta> {
  const res = await wowzaFetch(`/live_streams/${id}`);
  if (!res.ok) {
    throw new Error(`wowza getLiveStream ${id} failed: ${res.status}`);
  }
  const json = (await res.json()) as { live_stream: WowzaLiveStreamMeta };
  return json.live_stream;
}

export async function enableSaveAsset(id: string): Promise<void> {
  const res = await wowzaFetch(`/live_streams/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ live_stream: { save_asset: true } }),
  });
  if (!res.ok) {
    throw new Error(`wowza enableSaveAsset ${id} failed: ${res.status}`);
  }
}

export async function listVideosForLiveStream(
  liveStreamId: string,
): Promise<WowzaVideo[]> {
  const params = new URLSearchParams({
    origin_id: liveStreamId,
    sort_column: "created_at",
    sort_direction: "desc",
    per_page: "50",
  });
  const res = await wowzaFetch(`/videos?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`wowza listVideosForLiveStream failed: ${res.status}`);
  }
  const json = (await res.json()) as { videos: WowzaVideo[] };
  return json.videos ?? [];
}

export async function getVideo(id: string): Promise<WowzaVideo> {
  const res = await wowzaFetch(`/videos/${id}`);
  if (!res.ok) {
    throw new Error(`wowza getVideo ${id} failed: ${res.status}`);
  }
  const json = (await res.json()) as { video: WowzaVideo };
  return json.video;
}

export function pickMp4DownloadUrl(video: WowzaVideo): string | null {
  if (video.state !== "FINISHED") return null;
  const mp4s = (video.encodings ?? []).filter(
    (e) => e.video_container?.toLowerCase() === "mp4" && e.video_file_url,
  );
  if (mp4s.length === 0) return null;
  mp4s.sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  return mp4s[0]?.video_file_url ?? null;
}

export function readCameraStreamIds(): Map<number, string> {
  const map = new Map<number, string>();
  for (const n of [1, 2, 3, 4]) {
    const v = process.env[`WOWZA_CAM${n}_STREAM_ID`]?.trim();
    if (v) map.set(n, v);
  }
  return map;
}
