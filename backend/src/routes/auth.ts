import { Hono, type Context } from "hono";
import { z } from "zod";
import type { DbUser } from "@cs360/shared";
import {
  getSupabaseAnon,
  getSupabaseForAccessToken,
} from "../lib/supabase-anon";
import { getSupabaseAdmin } from "../lib/supabase";
import { getIdentifierLimiter, getIpLimiter } from "../lib/redis";

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
  const idRl = getIdentifierLimiter();
  const ipRl = getIpLimiter();
  if (!idRl || !ipRl) return null;
  const [byId, byIp] = await Promise.all([
    idRl.limit(identifier),
    ipRl.limit(ip),
  ]);
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

  const { error } = await supabase.auth.signUp({
    phone,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    if (/already.*registered|already.*exists/i.test(error.message ?? "")) {
      return c.json({ ok: false, error: "already_registered" } as const, 409);
    }
    console.error("[auth] signUp phone:", error);
    return c.json(
      { ok: false, error: error.message ?? "signup_failed" } as const,
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
    console.error("[auth] signUp email:", error);
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
      console.error("[auth] resend sms:", error);
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
      console.error("[auth] resend email:", error);
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
    console.error("[auth] delete account update:", dbErr);
    return c.json({ ok: false, error: "delete_failed" } as const, 502);
  }

  const banUntil = new Date(
    Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
    user_metadata: { deleted_at: banUntil },
  });
  if (banErr) {
    console.error("[auth] delete account ban:", banErr);
  }

  await sb.auth.signOut().catch(() => undefined);
  return c.json({ ok: true } as const);
});

export default auth;
