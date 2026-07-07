import { createHmac } from "node:crypto";

const DEFAULT_TTL_SECONDS = 4 * 60 * 60;

export function isStreamTokenConfigured(): boolean {
  return Boolean(process.env.STREAM_TOKEN_SECRET?.trim());
}

function tokenTtlSeconds(): number {
  const raw = Number(process.env.STREAM_TOKEN_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_TTL_SECONDS;
}

export function signStreamToken(expEpochSeconds: number): string {
  const secret = process.env.STREAM_TOKEN_SECRET?.trim();
  if (!secret) throw new Error("stream_token_secret_missing");
  return createHmac("sha256", secret)
    .update(String(expEpochSeconds))
    .digest("hex");
}

function isTokenizableHost(hostname: string): boolean {
  return hostname === "stadium.mn" || hostname.endsWith(".stadium.mn");
}

export function tokenizeStreamUrl(url: string, nowMs = Date.now()): string {
  if (!isStreamTokenConfigured()) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!isTokenizableHost(parsed.hostname)) return url;
  const exp = Math.floor(nowMs / 1000) + tokenTtlSeconds();
  const sig = signStreamToken(exp);
  parsed.pathname = `/st/${exp}/${sig}${parsed.pathname}`;
  return parsed.toString();
}
