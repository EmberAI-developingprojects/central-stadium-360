import { Hono, type Context } from "hono";
import { z } from "zod";
import type { DbUser } from "@cs360/shared";
import {
  getSupabaseAnon,
  getSupabaseForAccessToken,
} from "../lib/supabase-anon";
import { getSupabaseAdmin } from "../lib/supabase";
import { checkIdentifierLimit, checkIpLimit } from "../lib/rate-limit";
import { sendSms } from "../lib/sms";
import { randomInt } from "node:crypto";

const auth = new Hono();

const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-]/g, ""))
  .refine((p) => /^(\+976)?[6789]\d{7}$/.test(p), {
    message: "Phone must be a Mongolian 8-digit mobile (6/7/8/9-prefixed).",
  })
  .transform((p) => (p.startsWith("+976") ? p : `+976${p}`));

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._%+-]+@gmail\.com$/, {
    message: "Only @gmail.com addresses are accepted.",
  });

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters.");

const registerPhoneSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

const registerEmailSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const verifyPhoneSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "OTP must be 4–8 digits."),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const resendSchema = z.object({
  identifier: z.string().trim().min(1),
});

const forgotSendSchema = z.object({
  phone: phoneSchema,
});

const forgotVerifySchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "OTP must be 4–8 digits."),
});

const forgotResetSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "OTP must be 4–8 digits."),
  password: passwordSchema,
});

function getClientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

function getBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function classifyIdentifier(
  raw: string,
): { kind: "phone" | "email"; value: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const parsed = emailSchema.safeParse(trimmed);
    return parsed.success ? { kind: "email", value: parsed.data } : null;
  }
  const parsed = phoneSchema.safeParse(trimmed);
  return parsed.success ? { kind: "phone", value: parsed.data } : null;
}

async function applyRateLimits(
  c: Context,
  identifier: string,
): Promise<Response | null> {
  const ip = getClientIp(c);
  const byId = checkIdentifierLimit(identifier);
  const byIp = checkIpLimit(ip);
  if (byId.success && byIp.success) return null;
  const reset = Math.max(byId.reset, byIp.reset);
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  c.header("Retry-After", String(retryAfter));
  return c.json(
    {
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: retryAfter,
      scope: !byId.success ? "identifier" : "ip",
    } as const,
    429,
  );
}

function invalidInput(
  c: Context,
  parsed: z.ZodSafeParseError<unknown>,
): Response {
  return c.json(
    {
      ok: false,
      error: "invalid_input",
      details: parsed.error.flatten(),
    } as const,
    400,
  );
}

auth.post("/register/phone", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = registerPhoneSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { fullName, phone, password } = parsed.data;

  const limited = await applyRateLimits(c, phone);
  if (limited) return limited;

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  // Pre-check: reject re-registration of an already-confirmed active phone
  // before invoking Supabase signUp. The downstream "stale user" fallback only
  // runs for truly abandoned (unconfirmed or soft-deleted) accounts, so a
  // genuinely-registered phone could otherwise slip through into a resend-OTP
  // path and look like the signup was accepted. Best-effort: if any of these
  // probes throw (e.g. transient admin-API hiccup) we fall through to the
  // existing signUp + fallback flow rather than 500-ing the whole request.
  try {
    const existingPublicId = await findUserIdByPhone(phone);
    if (existingPublicId) {
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const authUserId = await findAuthUserIdByPhone(adminClient, phone);
        if (authUserId) {
          const { data: authUser } =
            await adminClient.auth.admin.getUserById(authUserId);
          if (authUser?.user?.phone_confirmed_at) {
            return c.json(
              { ok: false, error: "already_registered" } as const,
              409,
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn(
      "[register/phone] pre-check failed, falling through:",
      err instanceof Error ? err.message : err,
    );
  }

  const trySignUp = () =>
    supabase.auth.signUp({
      phone,
      password,
      options: { data: { full_name: fullName } },
    });

  let { data: signUpData, error } = await trySignUp();

  if (error && /already.*registered|already.*exists/i.test(error.message ?? "")) {
    const admin = getSupabaseAdmin();
    if (admin) {
      const authUserId = await findAuthUserIdByPhone(admin, phone);
      const publicUserId = await findUserIdByPhone(phone);

      if (authUserId) {
        const { data: authUser } =
          await admin.auth.admin.getUserById(authUserId);
        const isConfirmed = Boolean(authUser?.user?.phone_confirmed_at);
        const isSoftDeleted = !publicUserId; // public.users either deleted or marked deleted

        if (isConfirmed && !isSoftDeleted) {
          return c.json(
            { ok: false, error: "already_registered" } as const,
            409,
          );
        }

        // Stale / deleted auth user blocking re-registration → hard delete + retry.
        const { error: delErr } =
          await admin.auth.admin.deleteUser(authUserId);
        if (!delErr) {
          ({ data: signUpData, error } = await trySignUp());
        }
      }
    }
  }

  if (error) {
    const msg = error.message ?? "";

    if (/already.*registered|already.*exists/i.test(msg)) {
      const { error: resendErr } = await supabase.auth.resend({
        type: "sms",
        phone,
      });
      if (resendErr) {
        return c.json(
          {
            ok: false,
            error: resendErr.message ?? "resend_failed",
          } as const,
          502,
        );
      }
      return c.json({ ok: true, data: { phone } } as const);
    }

    return c.json({ ok: false, error: msg || "signup_failed" } as const, 502);
  }

  return c.json({ ok: true, data: { phone } } as const);
});

auth.post("/register/email", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = registerEmailSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { fullName, email, password } = parsed.data;

  const limited = await applyRateLimits(c, email);
  if (limited) return limited;

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const redirectTo = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/login?verified=1`
    : undefined;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    if (/already.*registered|already.*exists/i.test(error.message ?? "")) {
      return c.json({ ok: false, error: "already_registered" } as const, 409);
    }
    return c.json(
      { ok: false, error: error.message ?? "signup_failed" } as const,
      502,
    );
  }
  return c.json({ ok: true, data: { email } } as const);
});

auth.post("/verify-phone", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = verifyPhoneSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
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
      user: { id: data.user.id, phone: data.user.phone ?? phone, role },
    },
  } as const);
});

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const cls = classifyIdentifier(parsed.data.identifier);
  if (!cls) {
    return c.json(
      {
        ok: false,
        error: "invalid_input",
        details: "identifier must be a Mongolian phone or @gmail.com email.",
      } as const,
      400,
    );
  }

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const creds =
    cls.kind === "phone"
      ? { phone: cls.value, password: parsed.data.password }
      : { email: cls.value, password: parsed.data.password };

  const { data, error } = await supabase.auth.signInWithPassword(creds);
  if (error || !data.session || !data.user) {
    const msg = error?.message ?? "";

    if (/not.*confirmed|not.*verified/i.test(msg)) {
      return c.json(
        {
          ok: false,
          error: "not_verified",
          kind: cls.kind,
          identifier: cls.value,
        } as const,
        403,
      );
    }
    return c.json({ ok: false, error: "invalid_credentials" } as const, 401);
  }

  const admin = getSupabaseAdmin();
  let role: "user" | "admin" = "user";
  if (admin) {
    const { data: row } = await admin
      .from("users")
      .select("role, deleted_at")
      .eq("id", data.user.id)
      .maybeSingle<Pick<DbUser, "role" | "deleted_at">>();
    if (row?.deleted_at) {
      await supabase.auth.signOut().catch(() => undefined);
      return c.json({ ok: false, error: "account_deleted" } as const, 403);
    }
    if (row?.role === "admin") role = "admin";
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
        phone: data.user.phone ?? null,
        email: data.user.email ?? null,
        role,
      },
    },
  } as const);
});

auth.post("/resend-code", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const cls = classifyIdentifier(parsed.data.identifier);
  if (!cls) {
    return c.json({ ok: false, error: "invalid_input" } as const, 400);
  }

  const limited = await applyRateLimits(c, cls.value);
  if (limited) return limited;

  const supabase = getSupabaseAnon();
  if (!supabase) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  if (cls.kind === "phone") {
    const { error } = await supabase.auth.resend({
      type: "sms",
      phone: cls.value,
    });
    if (error) {
      return c.json(
        { ok: false, error: error.message ?? "resend_failed" } as const,
        502,
      );
    }
  } else {
    const redirectTo = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login?verified=1`
      : undefined;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cls.value,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      return c.json(
        { ok: false, error: error.message ?? "resend_failed" } as const,
        502,
      );
    }
  }

  return c.json({
    ok: true,
    data: { kind: cls.kind, identifier: cls.value },
  } as const);
});

const RESET_OTP_TTL_SECONDS = 5 * 60;
const RESET_OTP_PREFIX = "cs360:auth:reset:";

const otpStore = new Map<string, { code: string; expiresAt: number }>();

function setResetOtp(phone: string, code: string): void {
  const key = `${RESET_OTP_PREFIX}${phone}`;
  otpStore.set(key, {
    code,
    expiresAt: Date.now() + RESET_OTP_TTL_SECONDS * 1000,
  });
}

function getResetOtp(phone: string): string | null {
  const key = `${RESET_OTP_PREFIX}${phone}`;
  const entry = otpStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(key);
    return null;
  }
  return entry.code;
}

function deleteResetOtp(phone: string): void {
  otpStore.delete(`${RESET_OTP_PREFIX}${phone}`);
}

async function findUserIdByPhone(phone: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const candidates = [phone, phone.replace(/^\+/, "")];
  for (const value of candidates) {
    const { data } = await admin
      .from("users")
      .select("id")
      .eq("phone", value)
      .is("deleted_at", null)
      .maybeSingle<{ id: string }>();
    if (data?.id) return data.id;
  }
  return null;
}

async function findAuthUserIdByPhone(
  admin: ReturnType<typeof getSupabaseAdmin> & object,
  phone: string,
): Promise<string | null> {
  const candidates = [phone, phone.replace(/^\+/, "")];
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      return null;
    }
    const users = data?.users ?? [];
    const match = users.find((u) =>
      candidates.includes((u.phone ?? "").trim()),
    );
    if (match) return match.id;
    if (users.length < 200) break;
  }
  return null;
}

auth.post("/forgot-password/send", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = forgotSendSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { phone } = parsed.data;

  const limited = await applyRateLimits(c, phone);
  if (limited) return limited;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const userId = await findUserIdByPhone(phone);
  if (!userId) {
    return c.json({ ok: false, error: "user_not_found" } as const, 404);
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  setResetOtp(phone, otp);

  try {
    await sendSms({ phone, otp });
  } catch (err) {
    return c.json(
      { ok: false, error: (err as Error).message ?? "send_failed" } as const,
      502,
    );
  }

  return c.json({ ok: true, data: { phone } } as const);
});

auth.post("/forgot-password/verify", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = forgotVerifySchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { phone, code } = parsed.data;

  const stored = getResetOtp(phone);
  if (!stored || stored !== code) {
    return c.json({ ok: false, error: "otp_invalid" } as const, 401);
  }
  return c.json({ ok: true, data: { phone } } as const);
});

auth.post("/forgot-password/reset", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = forgotResetSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { phone, code, password } = parsed.data;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const stored = getResetOtp(phone);
  if (!stored || stored !== code) {
    return c.json({ ok: false, error: "otp_invalid" } as const, 401);
  }

  const userId = await findUserIdByPhone(phone);
  if (!userId) {
    return c.json({ ok: false, error: "user_not_found" } as const, 404);
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    password,
  });
  if (updErr) {
    return c.json(
      { ok: false, error: updErr.message ?? "reset_failed" } as const,
      502,
    );
  }

  deleteResetOtp(phone);
  return c.json({ ok: true, data: { phone } } as const);
});

auth.post("/logout", async (c) => {
  const token = getBearer(c.req.header("authorization"));
  if (!token) return c.json({ ok: true } as const);
  const sb = getSupabaseForAccessToken(token);
  if (sb) {
    await sb.auth.signOut().catch(() => undefined);
  }
  return c.json({ ok: true } as const);
});

auth.get("/me", async (c) => {
  const token = getBearer(c.req.header("authorization"));
  if (!token) return c.json({ ok: false, error: "unauthorized" } as const, 401);

  const sb = getSupabaseForAccessToken(token);
  if (!sb) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }

  type Profile = Pick<
    DbUser,
    "role" | "phone" | "email" | "full_name" | "created_at" | "deleted_at"
  >;
  const admin = getSupabaseAdmin();
  let profile: Profile | null = null;
  if (admin) {
    const { data: row } = await admin
      .from("users")
      .select("role, phone, email, full_name, created_at, deleted_at")
      .eq("id", data.user.id)
      .maybeSingle<Profile>();
    profile = row ?? null;
  }

  if (profile?.deleted_at) {
    return c.json({ ok: false, error: "account_deleted" } as const, 403);
  }

  return c.json({
    ok: true,
    data: {
      id: data.user.id,
      phone: profile?.phone ?? data.user.phone ?? null,
      email: profile?.email ?? data.user.email ?? null,
      full_name: profile?.full_name ?? "",
      role: profile?.role ?? "user",
      created_at: profile?.created_at ?? null,
      phone_confirmed_at: data.user.phone_confirmed_at ?? null,
      email_confirmed_at: data.user.email_confirmed_at ?? null,
    },
  } as const);
});

auth.delete("/account", async (c) => {
  const token = getBearer(c.req.header("authorization"));
  if (!token) return c.json({ ok: false, error: "unauthorized" } as const, 401);

  const sb = getSupabaseForAccessToken(token);
  const admin = getSupabaseAdmin();
  if (!sb || !admin) {
    return c.json(
      { ok: false, error: "supabase_not_configured" } as const,
      503,
    );
  }

  const { data: u, error: uerr } = await sb.auth.getUser(token);
  if (uerr || !u.user) {
    return c.json({ ok: false, error: "unauthorized" } as const, 401);
  }
  const userId = u.user.id;

  const { error: dbErr } = await admin
    .from("users")
    .update({
      phone: null,
      email: null,
      full_name: "",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (dbErr) {
    return c.json({ ok: false, error: "delete_failed" } as const, 502);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    const banUntil = new Date(
      Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
      user_metadata: { deleted_at: banUntil },
    });
  }

  await sb.auth.signOut().catch(() => undefined);
  return c.json({ ok: true } as const);
});

export default auth;
