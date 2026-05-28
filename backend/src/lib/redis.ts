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

let phoneLimiter: Ratelimit | null = null;
let ipLimiter: Ratelimit | null = null;

/** 3 OTP requests per phone per 10 minutes. */
export function getPhoneLimiter(): Ratelimit | null {
  if (phoneLimiter) return phoneLimiter;
  const r = getRedis();
  if (!r) return null;
  phoneLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(3, "10 m"),
    prefix: "cs360:otp:phone",
    analytics: false,
  });
  return phoneLimiter;
}

/** 5 OTP requests per IP per 10 minutes (a second floor against abuse). */
export function getIpLimiter(): Ratelimit | null {
  if (ipLimiter) return ipLimiter;
  const r = getRedis();
  if (!r) return null;
  ipLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "cs360:otp:ip",
    analytics: false,
  });
  return ipLimiter;
}
