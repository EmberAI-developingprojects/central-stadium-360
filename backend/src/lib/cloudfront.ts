import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

const SIGN_TTL_MS = 60 * 60 * 1000;

export function isCloudFrontConfigured(): boolean {
  return Boolean(
    process.env.AWS_CLOUDFRONT_DOMAIN &&
      process.env.AWS_CLOUDFRONT_KEY_PAIR_ID &&
      process.env.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64,
  );
}

export function signRecordingUrl(s3KeyPath: string): string {
  const domain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.AWS_CLOUDFRONT_KEY_PAIR_ID;
  const privateKeyB64 = process.env.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64;
  if (!domain || !keyPairId || !privateKeyB64) {
    throw new Error("cloudfront_not_configured");
  }
  const privateKey = Buffer.from(privateKeyB64, "base64").toString("utf-8");
  const path = s3KeyPath.startsWith("/") ? s3KeyPath.slice(1) : s3KeyPath;
  const url = `https://${domain}/${path}`;
  const dateLessThan = new Date(Date.now() + SIGN_TTL_MS).toISOString();
  return getSignedUrl({ url, keyPairId, privateKey, dateLessThan });
}
