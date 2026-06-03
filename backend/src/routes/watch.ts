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

// Node's ECDSA sign() returns DER; JWT ES384 requires raw R||S (48 bytes each)
function derToRawEcdsa(derSig: Buffer, coordBytes: number): Buffer {
  let pos = 1; // skip SEQUENCE tag 0x30
  if (derSig[pos]! & 0x80) {
    pos += 1 + (derSig[pos]! & 0x7f); // long-form length
  } else {
    pos += 1;
  }

  pos++; // INTEGER tag 0x02
  const rLen = derSig[pos++]!;
  const r = derSig.subarray(pos, pos + rLen);
  pos += rLen;

  pos++; // INTEGER tag 0x02
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
      exp: Math.floor(Date.now() / 1000) + 21600, // 6 h
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
  const rawSig = derToRawEcdsa(derSig, 48); // P-384: 48 bytes per coordinate

  return `${signingInput}.${b64url(rawSig)}`;
}

watch.get("/token", requireUser, (c) => {
  const keyArn = process.env.IVS_PLAYBACK_KEY_ARN ?? "";
  const privateKeyB64 = process.env.IVS_PRIVATE_KEY_BASE64 ?? "";
  const useAuth = Boolean(keyArn && privateKeyB64);

  let keyDer: Buffer | null = null;
  if (useAuth) {
    keyDer = Buffer.from(privateKeyB64, "base64");
  }

  const cams: WatchCam[] = CAM_DEFS.map((cam) => {
    const rawUrl = process.env[`AWS_IVS_${cam.id.toUpperCase()}_URL`] ?? null;
    const channelArn = process.env[`AWS_IVS_${cam.id.toUpperCase()}_ARN`] ?? "";

    if (!rawUrl) return { ...cam, hlsUrl: null };

    if (useAuth && keyDer && channelArn) {
      const token = signIvsToken(channelArn, keyArn, keyDer);
      return { ...cam, hlsUrl: `${rawUrl}?token=${token}` };
    }

    // TODO: gate behind ticket ownership once QPay is live
    return { ...cam, hlsUrl: rawUrl };
  });

  return c.json({ ok: true, data: { cams } } as const);
});

export default watch;
