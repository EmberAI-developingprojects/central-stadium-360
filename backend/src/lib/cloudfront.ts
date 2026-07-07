import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

const SIGN_TTL_MS = 60 * 60 * 1000;

// ── Live-stream URL signing ────────────────────────────────────────────────
// Fronting the live camera HLS with CloudFront signed URLs means a leaked
// `.m3u8` link stops working after the TTL, and the signature is only minted
// server-side after admitDevice() succeeds — so stream access follows a valid
// ticket + device slot. Uses a wildcard custom policy scoped to the stream's
// ORIGIN so the player can reuse the same query params for the manifest and
// every segment (see the custom hls.js loader on the frontend).

const LIVE_SIGN_TTL_MS =
  (Number(process.env.LIVE_SIGN_TTL_SECONDS) || 6 * 60 * 60) * 1000;

// The cam distributions may use a different CloudFront key group than the VOD
// distribution; fall back to the VOD key pair when the LIVE_* vars are unset.
function liveKeyPairId(): string | undefined {
  return (
    process.env.LIVE_CLOUDFRONT_KEY_PAIR_ID ||
    process.env.AWS_CLOUDFRONT_KEY_PAIR_ID
  );
}
function livePrivateKeyB64(): string | undefined {
  return (
    process.env.LIVE_CLOUDFRONT_PRIVATE_KEY_BASE64 ||
    process.env.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64
  );
}

/** True when live-URL signing is switched on AND a signing key is available. */
export function isLiveSigningConfigured(): boolean {
  return (
    process.env.LIVE_SIGN_URLS === "1" &&
    Boolean(liveKeyPairId() && livePrivateKeyB64())
  );
}

/**
 * Sign a live HLS master URL. The wildcard policy authorizes any path on the
 * same origin (manifest, variant playlists, segments) until it expires, so the
 * player propagates the returned Policy/Signature/Key-Pair-Id query params to
 * every child request. Throws if no signing key is configured.
 */
export function signLiveUrl(
  hlsUrl: string,
  ttlMs: number = LIVE_SIGN_TTL_MS,
): string {
  const keyPairId = liveKeyPairId();
  const privateKeyB64 = livePrivateKeyB64();
  if (!keyPairId || !privateKeyB64) {
    throw new Error("cloudfront_not_configured");
  }
  let origin: string;
  try {
    origin = new URL(hlsUrl).origin;
  } catch {
    return hlsUrl;
  }
  const privateKey = Buffer.from(privateKeyB64, "base64").toString("utf-8");
  const epoch = Math.floor((Date.now() + ttlMs) / 1000);
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: `${origin}/*`,
        Condition: { DateLessThan: { "AWS:EpochTime": epoch } },
      },
    ],
  });
  return getSignedUrl({ url: hlsUrl, keyPairId, privateKey, policy });
}

export function isCloudFrontConfigured(): boolean {
  return Boolean(
    process.env.AWS_CLOUDFRONT_DOMAIN &&
    process.env.AWS_CLOUDFRONT_KEY_PAIR_ID &&
    process.env.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64,
  );
}

function stripLeadingSlash(s: string): string {
  return s.startsWith("/") ? s.slice(1) : s;
}

export function signRecordingUrl(
  masterPath: string,
  sessionPrefix: string,
): string {
  const domain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.AWS_CLOUDFRONT_KEY_PAIR_ID;
  const privateKeyB64 = process.env.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64;
  if (!domain || !keyPairId || !privateKeyB64) {
    throw new Error("cloudfront_not_configured");
  }
  const privateKey = Buffer.from(privateKeyB64, "base64").toString("utf-8");
  const masterUrl = `https://${domain}/${stripLeadingSlash(masterPath)}`;
  const resource = `https://${domain}/${stripLeadingSlash(sessionPrefix)}*`;
  const epoch = Math.floor((Date.now() + SIGN_TTL_MS) / 1000);
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resource,
        Condition: { DateLessThan: { "AWS:EpochTime": epoch } },
      },
    ],
  });
  return getSignedUrl({ url: masterUrl, keyPairId, privateKey, policy });
}
