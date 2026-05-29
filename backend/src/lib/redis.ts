import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

let identifierLimiter: Ratelimit | null = null;
let ipLimiter: Ratelimit | null = null;

export function getIdentifierLimiter(): Ratelimit | null {
  if (identifierLimiter) return identifierLimiter;
  const r = getRedis();
  if (!r) return null;
  identifierLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(3, "10 m"),
    prefix: "cs360:auth:id",
    analytics: false,
  });
  return identifierLimiter;
}

export function getIpLimiter(): Ratelimit | null {
  if (ipLimiter) return ipLimiter;
  const r = getRedis();
  if (!r) return null;
  ipLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "cs360:auth:ip",
    analytics: false,
  });
  return ipLimiter;
}
