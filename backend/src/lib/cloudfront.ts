import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

const SIGN_TTL_MS = 60 * 60 * 1000;

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
