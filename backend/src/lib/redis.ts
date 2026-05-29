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

/**
 * 3 register/resend attempts per identifier (phone or email) per 10 minutes.
 * Protects a single number/inbox from being pinned with a flood of OTPs.
 */
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

/** 5 OTP/verification requests per IP per 10 minutes (a second floor against abuse). */
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
