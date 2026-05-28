import { Hono, type Context } from "hono";
import { z } from "zod";
import type { DbUser } from "@cs360/shared";
import {
  getSupabaseAnon,
  getSupabaseForAccessToken,
} from "../lib/supabase-anon";
import { getSupabaseAdmin } from "../lib/supabase";
import { getPhoneLimiter, getIpLimiter } from "../lib/redis";

const auth = new Hono();

const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-]/g, ""))
  .refine((p) => /^(\+976)?[89]\d{7}$/.test(p), {
    message: "Phone must be a Mongolian mobile number (+976 9xxxxxxx).",
  })
  .transform((p) => (p.startsWith("+976") ? p : `+976${p}`));

const requestOtpSchema = z.object({ phone: phoneSchema });
const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "OTP must be 4–8 digits."),
});

function getClientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

// ----------------------------------------------------------------------------
// POST /api/auth/request-otp
// ----------------------------------------------------------------------------
auth.post("/request-otp", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = requestOtpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
      400,
    );
  }
  const { phone } = parsed.data;
  const ip = getClientIp(c);

  const phoneRl = getPhoneLimiter();
  const ipRl = getIpLimiter();
  if (phoneRl && ipRl) {
    const [byPhone, byIp] = await Promise.all([
      phoneRl.limit(phone),
      ipRl.limit(ip),
    ]);
    if (!byPhone.success || !byIp.success) {
      const reset = Math.max(byPhone.reset, byIp.reset);
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          ok: false,
          error: "rate_limited",
          retryAfterSeconds: retryAfter,
          scope: !byPhone.success ? "phone" : "ip",
        } as const,
        429,
      );
    }
  }

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  });
  if (error) {
    console.error("[auth] signInWithOtp:", error);
    return c.json(
      { ok: false, error: error.message ?? "otp_send_failed" } as const,
      502,
    );
  }

  return c.json({ ok: true, data: { phone } } as const);
});

// ----------------------------------------------------------------------------
// POST /api/auth/verify-otp
// ----------------------------------------------------------------------------
auth.post("/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: parsed.error.flatten(),
      } as const,
      400,
    );
  }
  const { phone, code } = parsed.data;

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: "sms",
  });
  if (error || !data.session || !data.user) {
    return c.json(
      { ok: false, error: error?.message ?? "otp_invalid" } as const,
      401,
    );
  }

  // Look up role from public.users (the auth trigger inserts the row on signup).
  const admin = getSupabaseAdmin();
  let role: "user" | "admin" = "user";
  if (admin) {
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.role === "admin") role = "admin";
  }

  return c.json({
    ok: true,
    data: {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? null,
        expires_in: data.session.expires_in ?? null,
      },
      user: {
        id: data.user.id,
        phone: data.user.phone ?? phone,
        role,
      },
    },
  } as const);
});

// ----------------------------------------------------------------------------
// Bearer middleware
// ----------------------------------------------------------------------------
function getBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

// ----------------------------------------------------------------------------
// POST /api/auth/logout
// ----------------------------------------------------------------------------
auth.post("/logout", async (c) => {
  const token = getBearer(c.req.header("authorization"));
  if (!token) return c.json({ ok: true } as const);

  const sb = getSupabaseForAccessToken(token);
  if (sb) {
    // Best-effort — invalidates the refresh token on the server side.
    await sb.auth.signOut().catch(() => undefined);
  }
  return c.json({ ok: true } as const);
});

// ----------------------------------------------------------------------------
// GET /api/auth/me
// ----------------------------------------------------------------------------
auth.get("/me", async (c) => {
  const token = getBearer(c.req.header("authorization"));
  if (!token) return c.json({ ok: false, error: "unauthorized" } as const, 401);

  const sb = getSupabaseForAccessToken(token);
  if (!sb)
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }

  type Profile = Pick<DbUser, "role" | "phone" | "created_at">;
  const admin = getSupabaseAdmin();
  let profile: Profile | null = null;
  if (admin) {
    const { data: row } = await admin
      .from("users")
      .select("role, phone, created_at")
      .eq("id", data.user.id)
      .maybeSingle<Profile>();
    profile = row ?? null;
  }

  return c.json({
    ok: true,
    data: {
      id: data.user.id,
      phone: profile?.phone ?? data.user.phone ?? null,
      role: profile?.role ?? "user",
      created_at: profile?.created_at ?? null,
    },
  } as const);
});

export default auth;
