import { IvsClient, StopStreamCommand } from "@aws-sdk/client-ivs";

const CAMERA_NUMBERS = [1, 2, 3, 4] as const;

let ivsClient: IvsClient | null = null;

function getIvsClient(): IvsClient | null {
  if (ivsClient) return ivsClient;
  const region = process.env.AWS_REGION;
  if (!region) return null;
  ivsClient = new IvsClient({ region });
  return ivsClient;
}

function readCameraArns(): string[] {
  const arns: string[] = [];
  for (const cam of CAMERA_NUMBERS) {
    const arn = process.env[`AWS_IVS_CAM${cam}_ARN`];
    if (arn && arn.trim().length > 0) arns.push(arn.trim());
  }
  return arns;
}

export type StopStreamsResult = {
  total: number;
  stopped: string[];
  alreadyOffline: string[];
  failed: Array<{ arn: string; error: string }>;
};

export async function stopAllCameraStreams(): Promise<StopStreamsResult> {
  const arns = readCameraArns();
  const result: StopStreamsResult = {
    total: arns.length,
    stopped: [],
    alreadyOffline: [],
    failed: [],
  };
  const client = getIvsClient();
  if (!client) {
    for (const arn of arns) {
      result.failed.push({ arn, error: "aws_region_not_configured" });
    }
    return result;
  }
  await Promise.all(
    arns.map(async (arn) => {
      try {
        await client.send(new StopStreamCommand({ channelArn: arn }));
        result.stopped.push(arn);
      } catch (err) {
        const name = (err as Error & { name?: string }).name ?? "";
        const msg = (err as Error).message ?? "";
        if (
          name === "ChannelNotBroadcasting" ||
          /not broadcasting/i.test(msg)
        ) {
          result.alreadyOffline.push(arn);
        } else if (name === "ResourceNotFoundException") {
          result.failed.push({ arn, error: "channel_not_found" });
        } else {
          result.failed.push({ arn, error: msg || name || "unknown_error" });
        }
      }
    }),
  );
  return result;
}
