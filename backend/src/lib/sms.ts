// Provider-agnostic SMS dispatch.
//
// Supabase's "Send SMS Hook" calls our backend whenever it wants to send an
// OTP. We receive { user, sms: { phone, otp } } and route the message
// according to SMS_PROVIDER:
//
//   unset / "dev"       — log the OTP to the console (no real SMS sent)
//   "twilio"            — Twilio REST API
//   "mobicom"|"skytel"  — local Mongolian aggregator (adapter stubs)
//
// Each adapter is fully self-contained; switching providers is a config
// change (env vars), never a code change to the call sites.

export type SmsProvider = "dev" | "twilio" | "mobicom" | "skytel";

export interface SmsMessage {
  phone: string; // E.164, e.g. +97699112233
  otp: string;   // the one-time code Supabase wants to deliver
  /** Optional override of the rendered text. Default: localized OTP message. */
  text?: string;
}

export interface SmsResult {
  ok: boolean;
  provider: SmsProvider;
  /** Provider-side message id, when available. */
  messageId?: string;
  /** Non-fatal note (e.g. "logged to console; no provider configured"). */
  note?: string;
}

function resolveProvider(): SmsProvider {
  const raw = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "twilio" || raw === "mobicom" || raw === "skytel") return raw;
  return "dev";
}

function defaultText(otp: string): string {
  // Mongolian by default — matches the rest of the app.
  return `Төв Цэнгэлдэх — баталгаажуулах код: ${otp}`;
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

async function sendViaDev(msg: SmsMessage): Promise<SmsResult> {
  const text = msg.text ?? defaultText(msg.otp);
  // Visible in dev: prefixed banner so devs can grep for it.
  // eslint-disable-next-line no-console
  console.log(
    `\n────────── [DEV SMS] no SMS_PROVIDER configured ──────────\n` +
      `to:   ${msg.phone}\n` +
      `otp:  ${msg.otp}\n` +
      `body: ${text}\n` +
      `──────────────────────────────────────────────────────────\n`,
  );
  return {
    ok: true,
    provider: "dev",
    note: "logged to console; no SMS sent",
  };
}

async function sendViaTwilio(msg: SmsMessage): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM; // E.164 sender or Messaging Service SID
  if (!sid || !token || !from) {
    throw new Error(
      "SMS_PROVIDER=twilio but TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM are not set.",
    );
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    To: msg.phone,
    Body: msg.text ?? defaultText(msg.otp),
  });
  // MessagingServiceSid takes precedence over From when set
  if (from.startsWith("MG")) body.set("MessagingServiceSid", from);
  else body.set("From", from);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(`twilio_send_failed: ${json.message ?? res.statusText}`);
  }
  return { ok: true, provider: "twilio", messageId: json.sid };
}

async function sendViaMobicom(_msg: SmsMessage): Promise<SmsResult> {
  // STUB. Real implementation goes here once Mobicom credentials are issued.
  // Expected env: MOBICOM_API_KEY, MOBICOM_SENDER (alpha sender id).
  throw new Error(
    "SMS_PROVIDER=mobicom is not implemented. Add the HTTP integration in " +
      "backend/src/lib/sms.ts (sendViaMobicom) when the carrier is finalized.",
  );
}

async function sendViaSkytel(_msg: SmsMessage): Promise<SmsResult> {
  // STUB. Same shape as Mobicom — fill in the carrier's REST endpoint.
  throw new Error(
    "SMS_PROVIDER=skytel is not implemented. Add the HTTP integration in " +
      "backend/src/lib/sms.ts (sendViaSkytel) when the carrier is finalized.",
  );
}

// ---------------------------------------------------------------------------
// Public dispatcher
// ---------------------------------------------------------------------------

export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  const provider = resolveProvider();
  switch (provider) {
    case "twilio":   return sendViaTwilio(msg);
    case "mobicom":  return sendViaMobicom(msg);
    case "skytel":   return sendViaSkytel(msg);
    case "dev":
    default:         return sendViaDev(msg);
  }
}

export function currentSmsProvider(): SmsProvider {
  return resolveProvider();
}
