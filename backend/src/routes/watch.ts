import { Hono } from "hono";
import { createSign, createPrivateKey } from "node:crypto";
import type { AuthEnv } from "../middleware/require-user";
import { requireUser } from "../middleware/require-user";

const watch = new Hono<AuthEnv>();

type CamType = "normal" | "360";

export type WatchCam = {
  id: string;
  label: string;
  sub: string;
  type: CamType;
  hlsUrl: string | null;
};

const CAM_DEFS: Omit<WatchCam, "hlsUrl">[] = [
  { id: "cam1", label: "cam1", sub: "CAM 01 · 360°", type: "360" },
  { id: "cam2", label: "cam2", sub: "CAM 02 · 360°", type: "360" },
  { id: "cam3", label: "cam3", sub: "CAM 03 · 360°", type: "360" },
  { id: "cam4", label: "cam4", sub: "CAM 04 · 360°", type: "360" },
];

function b64url(input: string | Buffer): string {
  const b64 = Buffer.isBuffer(input)
    ? input.toString("base64")
    : Buffer.from(input).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function derToRawEcdsa(derSig: Buffer, coordBytes: number): Buffer {
  let pos = 1;
  if (derSig[pos]! & 0x80) {
    pos += 1 + (derSig[pos]! & 0x7f);
  } else {
    pos += 1;
  }

  pos++;
  const rLen = derSig[pos++]!;
  const r = derSig.subarray(pos, pos + rLen);
  pos += rLen;

  pos++;
  const sLen = derSig[pos++]!;
  const s = derSig.subarray(pos, pos + sLen);

  const pad = (n: Buffer) => {
    const stripped = n[0] === 0 ? n.subarray(1) : n;
    const out = Buffer.alloc(coordBytes, 0);
    stripped.copy(out, coordBytes - stripped.length);
    return out;
  };

  return Buffer.concat([pad(r), pad(s)]);
}

function signIvsToken(
  channelArn: string,
  keyArn: string,
  keyDer: Buffer,
): string {
  const kid = keyArn.split("/").pop()!;
  const header = b64url(JSON.stringify({ alg: "ES384", kid }));
  const payload = b64url(
    JSON.stringify({
      "aws:channel-arn": channelArn,
      exp: Math.floor(Date.now() / 1000) + 21600,
    }),
  );
  const signingInput = `${header}.${payload}`;

  const privateKey = createPrivateKey({
    key: keyDer,
    format: "der",
    type: "pkcs8",
  });
  const signer = createSign("SHA384");
  signer.update(signingInput);
  const derSig = signer.sign(privateKey);
  const rawSig = derToRawEcdsa(derSig, 48);

  return `${signingInput}.${b64url(rawSig)}`;
}

function buildCamUrls(): { id: string; url: string | null }[] {
  const keyArn = process.env.IVS_PLAYBACK_KEY_ARN ?? "";
  const privateKeyB64 = process.env.IVS_PRIVATE_KEY_BASE64 ?? "";
  const useAuth = Boolean(keyArn && privateKeyB64);
  const keyDer = useAuth ? Buffer.from(privateKeyB64, "base64") : null;

  return CAM_DEFS.map((cam) => {
    const rawUrl = process.env[`AWS_IVS_${cam.id.toUpperCase()}_URL`] ?? null;
    const channelArn = process.env[`AWS_IVS_${cam.id.toUpperCase()}_ARN`] ?? "";
    if (!rawUrl) return { id: cam.id, url: null };
    if (useAuth && keyDer && channelArn) {
      const token = signIvsToken(channelArn, keyArn, keyDer);
      return { id: cam.id, url: `${rawUrl}?token=${token}` };
    }
    return { id: cam.id, url: rawUrl };
  });
}

const viewedUserIds = new Set<string>();

export function getViewedUserCount(): number {
  return viewedUserIds.size;
}

watch.get("/token", requireUser, (c) => {
  const user = c.get("user");
  if (user?.id) viewedUserIds.add(user.id);
  const urls = buildCamUrls();
  const cams: WatchCam[] = CAM_DEFS.map((cam, i) => ({
    ...cam,
    hlsUrl: urls[i]!.url,
  }));
  return c.json({ ok: true, data: { cams } } as const);
});

type CamProbe = {
  id: string;
  hasUrl: boolean;
  status: number | null;
  ok: boolean;
  error?: string;
};
type StatusCache = {
  live: boolean;
  checkedAt: number;
  startedAt: number | null;
  probes: CamProbe[];
};
let statusCache: StatusCache | null = null;
const STATUS_TTL_MS = 5000;

async function probeHls(
  id: string,
  url: string | null,
): Promise<CamProbe> {
  if (!url) return { id, hasUrl: false, status: null, ok: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return { id, hasUrl: true, status: res.status, ok: res.ok };
  } catch (err) {
    return {
      id,
      hasUrl: true,
      status: null,
      ok: false,
      error: (err as Error).message,
    };
  }
}

watch.get("/status", requireUser, async (c) => {
  const now = Date.now();
  if (statusCache && now - statusCache.checkedAt < STATUS_TTL_MS) {
    return c.json({
      ok: true,
      data: {
        live: statusCache.live,
        checkedAt: statusCache.checkedAt,
        startedAt: statusCache.startedAt,
        probes: statusCache.probes,
      },
    } as const);
  }

  const cams = buildCamUrls();
  const probes = await Promise.all(cams.map((c) => probeHls(c.id, c.url)));
  const live = probes.some((p) => p.ok);
  const prevLive = statusCache?.live ?? false;
  const prevStart = statusCache?.startedAt ?? null;
  let startedAt: number | null = null;
  if (live) startedAt = prevLive && prevStart ? prevStart : now;
  statusCache = { live, checkedAt: now, startedAt, probes };
  return c.json({
    ok: true,
    data: { live, checkedAt: now, startedAt, probes },
  } as const);
});

export default watch;
