import { randomInt, timingSafeEqual } from "node:crypto";
import type { Db } from "../db";
import { sha256 } from "./tokens";

export type OtpPurpose = "signup_phone" | "email_verify";

export function generateNumericCode(digits = 6): string {
  return String(randomInt(0, 10 ** digits)).padStart(digits, "0");
}

/** Store (or replace) the code for `purpose`/`identifier`. Only its hash is kept. */
export async function issueOtp(
  db: Db,
  purpose: OtpPurpose,
  identifier: string,
  code: string,
  ttlSeconds: number,
): Promise<void> {
  await db.query(
    `INSERT INTO public.auth_otps (purpose, identifier, code_hash, attempts, expires_at)
     VALUES ($1, $2, $3, 0, now() + make_interval(secs => $4))
     ON CONFLICT (purpose, identifier)
     DO UPDATE SET code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at, created_at = now()`,
    [purpose, identifier, sha256(code), ttlSeconds],
  );
}

/**
 * Check a code and use it up. Wrong guesses count towards `maxAttempts`,
 * after which the code is discarded; expired codes are discarded too.
 */
export async function consumeOtp(
  db: Db,
  purpose: OtpPurpose,
  identifier: string,
  code: string,
  maxAttempts: number,
): Promise<boolean> {
  return db.transaction(async (client) => {
    const { rows } = await client.query<{ code_hash: string; attempts: number; expired: boolean }>(
      `SELECT code_hash, attempts, expires_at <= now() AS expired
         FROM public.auth_otps WHERE purpose = $1 AND identifier = $2 FOR UPDATE`,
      [purpose, identifier],
    );
    const row = rows[0];
    if (!row) return false;
    const remove = () =>
      client.query(`DELETE FROM public.auth_otps WHERE purpose = $1 AND identifier = $2`, [purpose, identifier]);
    if (row.expired) {
      await remove();
      return false;
    }
    const given = Buffer.from(sha256(code));
    const stored = Buffer.from(row.code_hash);
    if (given.length === stored.length && timingSafeEqual(given, stored)) {
      await remove();
      return true;
    }
    if (row.attempts + 1 >= maxAttempts) {
      await remove();
    } else {
      await client.query(
        `UPDATE public.auth_otps SET attempts = attempts + 1 WHERE purpose = $1 AND identifier = $2`,
        [purpose, identifier],
      );
    }
    return false;
  });
}
