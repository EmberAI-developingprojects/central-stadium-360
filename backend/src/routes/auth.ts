import { Hono, type Context } from "hono";
import { z } from "zod";
import { getDb, type Db } from "../lib/db";
import {
  checkIdentifierLimit,
  checkIpLimit,
  checkLoginIdentifierLimit,
  checkLoginIpLimit,
  checkOtpIdentifierLimit,
  checkOtpIpLimit,
  type RateLimitResult,
} from "../lib/rate-limit";
import { sendSms } from "../lib/sms";
import { renderEmail, sendEmail } from "../lib/email";
import {
  createAuthUser,
  deleteAuthUser,
  findAuthUserByEmail,
  findAuthUserById,
  findAuthUserByPhone,
  isBanned,
  markEmailConfirmed,
  markPhoneConfirmed,
  mergeUserMetadata,
  phoneDigits,
  releaseIdentifier,
  resetPendingSignup,
  setPassword,
  verifyPassword,
  type AuthUser,
} from "../lib/auth/accounts";
import {
  createSession,
  refreshSession,
  revokeSession,
  revokeSessionByRefreshToken,
  revokeUserSessions,
  verifyAccessToken,
  type SessionTokens,
} from "../lib/auth/tokens";
import { consumeOtp, generateNumericCode, issueOtp } from "../lib/auth/otp";
import { getBearer, requireUser, type AuthEnv } from "../middleware/require-user";
import { randomBytes } from "node:crypto";

const auth = new Hono<AuthEnv>();

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

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "OTP must be 4–8 digits.");

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

const verifyPhoneSchema = z.object({ phone: phoneSchema, code: otpCodeSchema });

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const resendSchema = z.object({
  identifier: z.string().trim().min(1),
});

const forgotSendSchema = z.object({ phone: phoneSchema });

const forgotVerifySchema = z.object({ phone: phoneSchema, code: otpCodeSchema });

const forgotResetSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  password: passwordSchema,
});

const refreshSchema = z.object({ refresh_token: z.string().min(1) });

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordSchema,
});

const profilePatchSchema = z.object({
  full_name: z.string().trim().max(120).optional(),
  bio: z.string().max(2000).optional(),
  avatar: z.string().max(2000).nullable().optional(),
  phone: z.string().trim().max(32).optional(),
});

const SIGNUP_OTP_TTL_SECONDS = 10 * 60;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;
const RESET_OTP_TTL_SECONDS = 5 * 60;
const RESET_OTP_MAX_ATTEMPTS = 5;

function getClientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  const last = xff
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();
  return last || c.req.header("x-real-ip") || "0.0.0.0";
}

function clientInfo(c: Context) {
  return { userAgent: c.req.header("user-agent") ?? null, ip: getClientIp(c) };
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

function rateLimited(
  c: Context,
  byId: RateLimitResult,
  byIp: RateLimitResult,
): Response | null {
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

async function applyRateLimits(c: Context, identifier: string) {
  const [byId, byIp] = await Promise.all([
    checkIdentifierLimit(identifier),
    checkIpLimit(getClientIp(c)),
  ]);
  return rateLimited(c, byId, byIp);
}

async function applyOtpAttemptLimits(c: Context, identifier: string) {
  const [byId, byIp] = await Promise.all([
    checkOtpIdentifierLimit(identifier),
    checkOtpIpLimit(getClientIp(c)),
  ]);
  return rateLimited(c, byId, byIp);
}

async function applyLoginLimits(c: Context, identifier: string) {
  const [byId, byIp] = await Promise.all([
    checkLoginIdentifierLimit(identifier),
    checkLoginIpLimit(getClientIp(c)),
  ]);
  return rateLimited(c, byId, byIp);
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

function notConfigured(c: Context): Response {
  return c.json({ ok: false, error: "supabase_not_configured" } as const, 503);
}

type Profile = {
  role: "user" | "admin";
  phone: string | null;
  email: string | null;
  full_name: string;
  created_at: string;
  deleted_at: string | null;
};

async function loadProfile(db: Db, userId: string): Promise<Profile | null> {
  const { data } = await db
    .from("users")
    .select("role,phone,email,full_name,created_at,deleted_at")
    .eq("id", userId)
    .maybeSingle<Profile>();
  return data ?? null;
}

function sessionPayload(
  tokens: SessionTokens,
  user: AuthUser,
  role: "user" | "admin",
) {
  return {
    session: tokens,
    user: {
      id: user.id,
      phone: user.phone ?? null,
      email: user.email ?? null,
      role,
    },
  };
}

async function sendSignupOtp(db: Db, phone: string): Promise<void> {
  const code = generateNumericCode();
  await issueOtp(db, "signup_phone", phoneDigits(phone), code, SIGNUP_OTP_TTL_SECONDS);
  await sendSms({ phone, otp: code });
}

async function sendVerificationEmail(db: Db, user: Pick<AuthUser, "id" | "email" | "raw_user_meta_data">) {
  if (!user.email) return;
  const token = randomBytes(32).toString("base64url");
  await issueOtp(db, "email_verify", user.id, token, EMAIL_VERIFY_TTL_SECONDS);
  const base = (process.env.PUBLIC_BACKEND_URL ?? "").replace(/\/+$/, "");
  const params = new URLSearchParams({ uid: user.id, token });
  const fullName =
    typeof user.raw_user_meta_data?.full_name === "string"
      ? user.raw_user_meta_data.full_name
      : null;
  const rendered = renderEmail({
    action: "signup",
    fullName,
    ctaUrl: `${base}/api/auth/verify-email?${params.toString()}`,
  });
  await sendEmail({
    to: user.email,
    subject: rendered.subject,
    html: rendered.htmlBody,
    text: rendered.textBody,
    fullName,
    tag: rendered.tag,
  });
}

/** True when the account behind `user` was soft-deleted from public.users. */
async function isSoftDeleted(db: Db, userId: string): Promise<boolean> {
  const profile = await loadProfile(db, userId);
  return !profile || !!profile.deleted_at;
}

auth.post("/register/phone", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = registerPhoneSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { fullName, phone, password } = parsed.data;

  const limited = await applyRateLimits(c, phone);
  if (limited) return limited;

  const db = getDb();
  if (!db) return notConfigured(c);

  try {
    let pending: AuthUser | null = null;
    const existing = await findAuthUserByPhone(db, phone);
    if (existing) {
      if (await isSoftDeleted(db, existing.id)) {
        await releaseIdentifier(db, existing.id, "phone");
      } else if (existing.phone_confirmed_at) {
        return c.json({ ok: false, error: "already_registered" } as const, 409);
      } else {
        pending = existing;
      }
    }

    if (pending) {
      await resetPendingSignup(db, pending.id, password, fullName);
    } else {
      await createAuthUser(db, { phone, password, fullName });
    }
    await sendSignupOtp(db, phone);
  } catch (err) {
    console.error("[register/phone] failed:", err);
    return c.json(
      { ok: false, error: (err as Error).message || "signup_failed" } as const,
      502,
    );
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

  const db = getDb();
  if (!db) return notConfigured(c);

  try {
    let user = await findAuthUserByEmail(db, email);
    if (user && (await isSoftDeleted(db, user.id))) {
      await releaseIdentifier(db, user.id, "email");
      user = null;
    }
    if (user?.email_confirmed_at) {
      return c.json({ ok: false, error: "already_registered" } as const, 409);
    }
    if (user) {
      await resetPendingSignup(db, user.id, password, fullName);
    } else {
      await createAuthUser(db, { email, password, fullName });
    }
    const fresh = await findAuthUserByEmail(db, email);
    if (fresh) await sendVerificationEmail(db, fresh);
  } catch (err) {
    console.error("[register/email] failed:", err);
    return c.json(
      { ok: false, error: (err as Error).message || "signup_failed" } as const,
      502,
    );
  }
  return c.json({ ok: true, data: { email } } as const);
});

auth.get("/verify-email", async (c) => {
  const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
  const uid = c.req.query("uid") ?? "";
  const token = c.req.query("token") ?? "";
  const db = getDb();
  const valid =
    !!db &&
    /^[0-9a-f-]{36}$/i.test(uid) &&
    token.length > 0 &&
    (await consumeOtp(db, "email_verify", uid, token, SIGNUP_OTP_MAX_ATTEMPTS));
  if (valid && db) await markEmailConfirmed(db, uid);
  return c.redirect(`${frontend}/login?verified=${valid ? "1" : "0"}`, 302);
});

auth.post("/verify-phone", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = verifyPhoneSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { phone, code } = parsed.data;

  const limited = await applyOtpAttemptLimits(c, phone);
  if (limited) return limited;

  const db = getDb();
  if (!db) return notConfigured(c);

  const user = await findAuthUserByPhone(db, phone);
  const ok =
    !!user &&
    (await consumeOtp(db, "signup_phone", phoneDigits(phone), code, SIGNUP_OTP_MAX_ATTEMPTS));
  if (!user || !ok || isBanned(user)) {
    return c.json({ ok: false, error: "otp_invalid" } as const, 401);
  }
  await markPhoneConfirmed(db, user.id);

  const profile = await loadProfile(db, user.id);
  const tokens = await createSession(db, user.id, clientInfo(c));
  const role = profile?.role === "admin" ? "admin" : "user";
  return c.json({
    ok: true,
    data: {
      session: tokens,
      user: { id: user.id, phone: user.phone ?? phone, role },
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

  const limited = await applyLoginLimits(c, cls.value);
  if (limited) return limited;

  const db = getDb();
  if (!db) return notConfigured(c);

  const user =
    cls.kind === "phone"
      ? await findAuthUserByPhone(db, cls.value)
      : await findAuthUserByEmail(db, cls.value);
  if (!user || isBanned(user) || !(await verifyPassword(user, parsed.data.password))) {
    return c.json({ ok: false, error: "invalid_credentials" } as const, 401);
  }
  const confirmed = cls.kind === "phone" ? user.phone_confirmed_at : user.email_confirmed_at;
  if (!confirmed) {
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

  const profile = await loadProfile(db, user.id);
  if (profile?.deleted_at) {
    return c.json({ ok: false, error: "account_deleted" } as const, 403);
  }

  const tokens = await createSession(db, user.id, clientInfo(c));
  return c.json({
    ok: true,
    data: sessionPayload(tokens, user, profile?.role === "admin" ? "admin" : "user"),
  } as const);
});

auth.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);

  const db = getDb();
  if (!db) return notConfigured(c);

  const refreshed = await refreshSession(db, parsed.data.refresh_token);
  if (!refreshed) {
    return c.json({ ok: false, error: "invalid_refresh_token" } as const, 401);
  }
  const user = await findAuthUserById(db, refreshed.userId);
  const profile = user ? await loadProfile(db, user.id) : null;
  if (!user || isBanned(user) || profile?.deleted_at) {
    await revokeUserSessions(db, refreshed.userId);
    return c.json({ ok: false, error: "invalid_refresh_token" } as const, 401);
  }
  return c.json({
    ok: true,
    data: sessionPayload(refreshed.tokens, user, profile?.role === "admin" ? "admin" : "user"),
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

  const db = getDb();
  if (!db) return notConfigured(c);

  try {
    if (cls.kind === "phone") {
      const user = await findAuthUserByPhone(db, cls.value);
      if (user && !user.phone_confirmed_at) await sendSignupOtp(db, cls.value);
    } else {
      const user = await findAuthUserByEmail(db, cls.value);
      if (user && !user.email_confirmed_at) await sendVerificationEmail(db, user);
    }
  } catch (err) {
    return c.json(
      { ok: false, error: (err as Error).message || "resend_failed" } as const,
      502,
    );
  }

  return c.json({
    ok: true,
    data: { kind: cls.kind, identifier: cls.value },
  } as const);
});

async function findUserIdByPhone(db: Db, phone: string): Promise<string | null> {
  const candidates = [phone, phone.replace(/^\+/, "")];
  for (const value of candidates) {
    const { data } = await db
      .from("users")
      .select("id")
      .eq("phone", value)
      .is("deleted_at", null)
      .maybeSingle<{ id: string }>();
    if (data?.id) return data.id;
  }
  return null;
}

async function checkResetOtp(db: Db, phone: string, code: string): Promise<boolean> {
  const { data, error } = await db.rpc("consume_reset_otp", {
    p_phone: phone,
    p_code: code,
    p_max_attempts: RESET_OTP_MAX_ATTEMPTS,
  });
  return !error && data === "ok";
}

auth.post("/forgot-password/send", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = forgotSendSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { phone } = parsed.data;

  const limited = await applyRateLimits(c, phone);
  if (limited) return limited;

  const db = getDb();
  if (!db) return notConfigured(c);

  const userId = await findUserIdByPhone(db, phone);
  if (!userId) {
    return c.json({ ok: false, error: "user_not_found" } as const, 404);
  }

  const otp = generateNumericCode();
  const { error: storeErr } = await db.from("auth_reset_otps").upsert({
    phone,
    code: otp,
    attempts: 0,
    expires_at: new Date(Date.now() + RESET_OTP_TTL_SECONDS * 1000).toISOString(),
  });
  if (storeErr) {
    return c.json({ ok: false, error: "otp_store_failed" } as const, 502);
  }

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

  const limited = await applyOtpAttemptLimits(c, phone);
  if (limited) return limited;

  const db = getDb();
  if (!db) return notConfigured(c);

  if (!(await checkResetOtp(db, phone, code))) {
    return c.json({ ok: false, error: "otp_invalid" } as const, 401);
  }
  return c.json({ ok: true, data: { phone } } as const);
});

auth.post("/forgot-password/reset", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = forgotResetSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const { phone, code, password } = parsed.data;

  const limited = await applyOtpAttemptLimits(c, phone);
  if (limited) return limited;

  const db = getDb();
  if (!db) return notConfigured(c);

  if (!(await checkResetOtp(db, phone, code))) {
    return c.json({ ok: false, error: "otp_invalid" } as const, 401);
  }

  const userId = await findUserIdByPhone(db, phone);
  if (!userId) {
    return c.json({ ok: false, error: "user_not_found" } as const, 404);
  }

  try {
    await setPassword(db, userId, password);
    await revokeUserSessions(db, userId);
  } catch (err) {
    return c.json(
      { ok: false, error: (err as Error).message || "reset_failed" } as const,
      502,
    );
  }

  await db.from("auth_reset_otps").delete().eq("phone", phone);
  return c.json({ ok: true, data: { phone } } as const);
});

auth.post("/logout", async (c) => {
  const db = getDb();
  if (!db) return c.json({ ok: true } as const);
  const body = (await c.req.json().catch(() => ({}))) as { refresh_token?: unknown };
  if (typeof body.refresh_token === "string" && body.refresh_token) {
    await revokeSessionByRefreshToken(db, body.refresh_token);
  }
  const token = getBearer(c.req.header("authorization"));
  const claims = token ? await verifyAccessToken(token) : null;
  if (claims) await revokeSession(db, claims.sessionId);
  return c.json({ ok: true } as const);
});

auth.get("/me", requireUser, async (c) => {
  const db = getDb();
  if (!db) return notConfigured(c);
  const userId = c.get("user").id;

  const [user, profile] = await Promise.all([
    findAuthUserById(db, userId),
    loadProfile(db, userId),
  ]);
  if (!user) return c.json({ ok: false, error: "unauthorized" } as const, 401);
  if (profile?.deleted_at) {
    return c.json({ ok: false, error: "account_deleted" } as const, 403);
  }

  const md = user.raw_user_meta_data ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return c.json({
    ok: true,
    data: {
      id: user.id,
      phone: profile?.phone ?? user.phone ?? null,
      email: profile?.email ?? user.email ?? null,
      full_name: profile?.full_name || str(md.full_name) || "",
      role: profile?.role ?? "user",
      created_at: profile?.created_at ?? null,
      phone_confirmed_at: user.phone_confirmed_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      bio: str(md.bio) ?? "",
      avatar: str(md.avatar),
      metadata_phone: str(md.phone),
    },
  } as const);
});

auth.patch("/me", requireUser, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const db = getDb();
  if (!db) return notConfigured(c);
  const userId = c.get("user").id;

  const patch = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  await mergeUserMetadata(db, userId, patch);
  if (parsed.data.full_name !== undefined) {
    await db.from("users").update({ full_name: parsed.data.full_name }).eq("id", userId);
  }
  return c.json({ ok: true } as const);
});

auth.post("/change-password", requireUser, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return invalidInput(c, parsed);
  const db = getDb();
  if (!db) return notConfigured(c);
  const userId = c.get("user").id;

  const user = await findAuthUserById(db, userId);
  if (!user || !(await verifyPassword(user, parsed.data.current_password))) {
    return c.json({ ok: false, error: "invalid_credentials" } as const, 401);
  }
  await setPassword(db, userId, parsed.data.new_password);
  // Keep this device signed in; every other device has to log in again.
  await revokeUserSessions(db, userId, c.get("sessionId"));
  return c.json({ ok: true } as const);
});

auth.delete("/account", requireUser, async (c) => {
  const db = getDb();
  if (!db) return notConfigured(c);
  const userId = c.get("user").id;

  const { error: dbErr } = await db
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

  await revokeUserSessions(db, userId);
  await deleteAuthUser(db, userId);
  return c.json({ ok: true } as const);
});

export default auth;
