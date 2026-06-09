export type SmsProvider =
  | "dev"
  | "twilio"
  | "mobicom"
  | "skytel"
  | "callpro";

export interface SmsMessage {
  phone: string;
  otp: string;

  text?: string;
}

export interface SmsResult {
  ok: boolean;
  provider: SmsProvider;

  messageId?: string;

  note?: string;
}

function resolveProvider(): SmsProvider {
  const raw = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  if (
    raw === "twilio" ||
    raw === "mobicom" ||
    raw === "skytel" ||
    raw === "callpro"
  )
    return raw;
  return "dev";
}

function normalizeMnPhone(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (digits.startsWith("976") && digits.length === 11) return digits.slice(3);
  return digits;
}

function defaultText(otp: string): string {
  return `Төв Цэнгэлдэх — баталгаажуулах код: ${otp}`;
}

async function sendViaDev(msg: SmsMessage): Promise<SmsResult> {
  const text = msg.text ?? defaultText(msg.otp);

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
  const from = process.env.TWILIO_FROM;
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

  if (from.startsWith("MG")) body.set("MessagingServiceSid", from);
  else body.set("From", from);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
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
  throw new Error(
    "SMS_PROVIDER=mobicom is not implemented. Add the HTTP integration in " +
      "backend/src/lib/sms.ts (sendViaMobicom) when the carrier is finalized.",
  );
}

async function sendViaSkytel(_msg: SmsMessage): Promise<SmsResult> {
  throw new Error(
    "SMS_PROVIDER=skytel is not implemented. Add the HTTP integration in " +
      "backend/src/lib/sms.ts (sendViaSkytel) when the carrier is finalized.",
  );
}

async function sendViaCallPro(msg: SmsMessage): Promise<SmsResult> {
  const apiKey = process.env.CALLPRO_API_KEY;
  const from = process.env.CALLPRO_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "SMS_PROVIDER=callpro but CALLPRO_API_KEY / CALLPRO_FROM are not set.",
    );
  }
  const url = "https://api-text.callpro.mn/v1/sms/send";
  const body = {
    from,
    to: normalizeMnPhone(msg.phone),
    text: msg.text ?? defaultText(msg.otp),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`callpro_network_error: ${(err as Error).message}`);
  }

  const json = (await res.json().catch(() => ({}))) as {
    status?: string;
    message_id?: string;
    error?: string;
    reason?: string;
    issues?: unknown;
  };
  if (!res.ok) {
    const reason =
      json.error ??
      json.reason ??
      (json.issues ? JSON.stringify(json.issues) : res.statusText);
    throw new Error(`callpro_send_failed: ${reason}`);
  }
  return { ok: true, provider: "callpro", messageId: json.message_id };
}

export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  const provider = resolveProvider();
  switch (provider) {
    case "twilio":
      return sendViaTwilio(msg);
    case "mobicom":
      return sendViaMobicom(msg);
    case "skytel":
      return sendViaSkytel(msg);
    case "callpro":
      return sendViaCallPro(msg);
    case "dev":
    default:
      return sendViaDev(msg);
  }
}

export function currentSmsProvider(): SmsProvider {
  return resolveProvider();
}
