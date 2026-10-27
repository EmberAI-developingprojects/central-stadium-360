import bcrypt from "bcryptjs";
import type { Db } from "../db";

// Accounts live in auth.users, laid out exactly as Supabase GoTrue left them:
// phones are stored without the leading "+", passwords as bcrypt hashes.

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  encrypted_password: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  banned_until: string | null;
  raw_user_meta_data: Record<string, unknown> | null;
}

const USER_COLS = `id, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at,
                   banned_until, raw_user_meta_data`;

// 100 years — what GoTrue's ban_duration "876000h" amounted to.
const BAN_INTERVAL = "876000 hours";

export function phoneDigits(phone: string): string {
  return phone.replace(/^\+/, "");
}

export function isBanned(user: Pick<AuthUser, "banned_until">): boolean {
  return !!user.banned_until && new Date(user.banned_until).getTime() > Date.now();
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(user: Pick<AuthUser, "encrypted_password">, password: string): Promise<boolean> {
  if (!user.encrypted_password) return false;
  return bcrypt.compare(password, user.encrypted_password);
}

export async function findAuthUserById(db: Db, id: string): Promise<AuthUser | null> {
  const { rows } = await db.query<AuthUser>(`SELECT ${USER_COLS} FROM auth.users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findAuthUserByPhone(db: Db, phone: string): Promise<AuthUser | null> {
  const digits = phoneDigits(phone);
  const { rows } = await db.query<AuthUser>(
    `SELECT ${USER_COLS} FROM auth.users WHERE phone IN ($1, $2) ORDER BY created_at DESC LIMIT 1`,
    [digits, `+${digits}`],
  );
  return rows[0] ?? null;
}

export async function findAuthUserByEmail(db: Db, email: string): Promise<AuthUser | null> {
  const { rows } = await db.query<AuthUser>(
    `SELECT ${USER_COLS} FROM auth.users WHERE lower(email) = lower($1) AND is_sso_user = false LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Create an account. The on_auth_user_created trigger copies it into
 * public.users (id, phone, email, full_name).
 */
export async function createAuthUser(
  db: Db,
  input: {
    phone?: string;
    email?: string;
    password: string;
    fullName: string;
    phoneConfirmed?: boolean;
    emailConfirmed?: boolean;
  },
): Promise<string> {
  const provider = input.phone ? "phone" : "email";
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO auth.users (
       instance_id, id, aud, role, email, phone, encrypted_password,
       email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at
     ) VALUES (
       '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       $1, $2, $3,
       CASE WHEN $4 THEN now() END, CASE WHEN $5 THEN now() END,
       $6::jsonb, $7::jsonb, now(), now()
     ) RETURNING id`,
    [
      input.email ?? null,
      input.phone ? phoneDigits(input.phone) : null,
      await hashPassword(input.password),
      input.emailConfirmed === true,
      input.phoneConfirmed === true,
      JSON.stringify({ provider, providers: [provider] }),
      JSON.stringify({ full_name: input.fullName }),
    ],
  );
  return rows[0].id;
}

export async function setPassword(db: Db, userId: string, password: string): Promise<void> {
  await db.query(`UPDATE auth.users SET encrypted_password = $2, updated_at = now() WHERE id = $1`, [
    userId,
    await hashPassword(password),
  ]);
}

/** Re-registration of a not-yet-confirmed account: take the new password and name. */
export async function resetPendingSignup(db: Db, userId: string, password: string, fullName: string): Promise<void> {
  await db.query(
    `UPDATE auth.users
        SET encrypted_password = $2,
            raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $3::jsonb,
            updated_at = now()
      WHERE id = $1`,
    [userId, await hashPassword(password), JSON.stringify({ full_name: fullName })],
  );
  await db.query(`UPDATE public.users SET full_name = $2 WHERE id = $1 AND deleted_at IS NULL`, [userId, fullName]);
}

export async function markPhoneConfirmed(db: Db, userId: string): Promise<void> {
  await db.query(
    `UPDATE auth.users SET phone_confirmed_at = coalesce(phone_confirmed_at, now()), updated_at = now() WHERE id = $1`,
    [userId],
  );
}

export async function markEmailConfirmed(db: Db, userId: string): Promise<void> {
  await db.query(
    `UPDATE auth.users SET email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() WHERE id = $1`,
    [userId],
  );
}

export async function mergeUserMetadata(db: Db, userId: string, patch: Record<string, unknown>): Promise<void> {
  await db.query(
    `UPDATE auth.users
        SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb, updated_at = now()
      WHERE id = $1`,
    [userId, JSON.stringify(patch)],
  );
}

export async function setBanned(db: Db, userId: string, banned: boolean): Promise<void> {
  await db.query(
    `UPDATE auth.users
        SET banned_until = CASE WHEN $2 THEN now() + $3::interval END, updated_at = now()
      WHERE id = $1`,
    [userId, banned, BAN_INTERVAL],
  );
}

/**
 * Release a phone or email held by an old, soft-deleted account so it can
 * be registered again (auth.users keeps them unique).
 */
export async function releaseIdentifier(db: Db, userId: string, kind: "phone" | "email"): Promise<void> {
  await db.query(`UPDATE auth.users SET ${kind} = NULL, updated_at = now() WHERE id = $1`, [userId]);
}

/**
 * Remove the account for good. Accounts that still own tickets cannot be
 * deleted (public.users → tickets is ON DELETE RESTRICT); those are banned
 * and stripped of their phone/email instead, as GoTrue's fallback did.
 */
export async function deleteAuthUser(db: Db, userId: string): Promise<void> {
  try {
    await db.query(`DELETE FROM auth.users WHERE id = $1`, [userId]);
  } catch {
    await db.query(
      `UPDATE auth.users
          SET banned_until = now() + $2::interval, phone = NULL, email = NULL, updated_at = now(),
              raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('deleted_at', now())
        WHERE id = $1`,
      [userId, BAN_INTERVAL],
    );
  }
}
