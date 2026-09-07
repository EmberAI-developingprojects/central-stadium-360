import { readCameraStreamIds } from "./wowza";

const DEFAULT_BASE = "https://api.video.wowza.com/api/v2.0";

export type StopStreamsResult = {
  total: number;
  stopped: string[];
  alreadyOffline: string[];
  failed: Array<{ arn: string; error: string }>;
};

function baseUrl(): string {
  return process.env.WSC_API_BASE?.trim() || DEFAULT_BASE;
}

async function stopOne(
  streamId: string,
  jwt: string,
): Promise<"stopped" | "already_offline" | { error: string }> {
  const res = await fetch(`${baseUrl()}/live_streams/${streamId}/stop`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (res.ok) return "stopped";
  const text = await res.text().catch(() => "");
  if (/not.?running|already.?stopped|invalid.?state/i.test(text)) {
    return "already_offline";
  }
  return { error: `${res.status} ${text.slice(0, 200)}` };
}

export async function stopAllCameraStreams(): Promise<StopStreamsResult> {
  const cams = readCameraStreamIds();
  const streamIds = [...cams.values()];
  const result: StopStreamsResult = {
    total: streamIds.length,
    stopped: [],
    alreadyOffline: [],
    failed: [],
  };
  const jwt = process.env.WOWZA_JWT?.trim();
  if (!jwt) {
    for (const id of streamIds) {
      result.failed.push({ arn: id, error: "wowza_jwt_not_configured" });
    }
    return result;
  }
  await Promise.all(
    streamIds.map(async (id) => {
      try {
        const outcome = await stopOne(id, jwt);
        if (outcome === "stopped") result.stopped.push(id);
        else if (outcome === "already_offline") result.alreadyOffline.push(id);
        else result.failed.push({ arn: id, error: outcome.error });
      } catch (err) {
        result.failed.push({
          arn: id,
          error: (err as Error).message || "unknown_error",
        });
      }
    }),
  );
  return result;
}
