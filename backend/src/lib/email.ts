export type EmailProvider = "dev" | "postmark";

export type EmailActionType =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change_current"
  | "email_change_new"
  | "reauthentication";

export interface SupabaseEmailHookPayload {
  user: {
    id: string;
    email?: string;
    phone?: string;
    user_metadata?: Record<string, unknown> | null;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fullName?: string | null;
  tag?: string;
}

export interface EmailSendResult {
  ok: boolean;
  provider: EmailProvider;
  messageId?: string;
  note?: string;
}

function resolveProvider(): EmailProvider {
  const raw = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "postmark") return "postmark";
  return "dev";
}

export function currentEmailProvider(): EmailProvider {
  return resolveProvider();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildConfirmationUrl(
  payload: SupabaseEmailHookPayload,
): string {
  const { token_hash, redirect_to, email_action_type, site_url } =
    payload.email_data;
  const base = (site_url || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const params = new URLSearchParams({
    token: token_hash,
    type: email_action_type,
    redirect_to,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function pickFullName(payload: SupabaseEmailHookPayload): string | null {
  const md = payload.user.user_metadata ?? null;
  if (md && typeof md === "object") {
    const v = (md as Record<string, unknown>).full_name;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

type RenderedEmail = {
  subject: string;
  htmlBody: string;
  textBody: string;
  tag: string;
};

const BRAND_NAME = "Төв Цэнгэлдэх Хүрээлэн";

function renderShell(opts: {
  preheader: string;
  greeting: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  closing: string;
  note?: string;
}): { html: string; text: string } {
  const safeCta = escapeHtml(opts.ctaUrl);
  const safeLabel = escapeHtml(opts.ctaLabel);
  const html = `<!doctype html>
<html lang="mn">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(BRAND_NAME)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#111;">
    <div style="display:none;opacity:0;visibility:hidden;height:0;overflow:hidden;">
      ${escapeHtml(opts.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px -16px rgba(15,23,42,0.18);">
            <tr>
              <td style="background:linear-gradient(180deg,#0b1130 0%,#131c7a 100%);padding:28px 32px;color:#fff;">
                <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.7);">${escapeHtml(BRAND_NAME)}</div>
                <div style="margin-top:6px;font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#E8DEC4;">${escapeHtml(opts.greeting)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;font-size:15px;line-height:1.65;color:#1f2937;">
                ${escapeHtml(opts.intro).replace(/\n/g, "<br/>")}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;" align="left">
                <a href="${safeCta}" style="display:inline-block;background:#2230C6;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;letter-spacing:0.01em;">${safeLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 4px;font-size:12.5px;line-height:1.6;color:#52525b;">
                Товч ажиллахгүй бол энэ линкийг хуулж браузэртаа нааж нээгээрэй:<br/>
                <a href="${safeCta}" style="color:#2230C6;word-break:break-all;text-decoration:underline;">${safeCta}</a>
              </td>
            </tr>
            ${
              opts.note
                ? `<tr><td style="padding:14px 32px 4px;font-size:12px;line-height:1.55;color:#71717a;">${escapeHtml(opts.note)}</td></tr>`
                : ""
            }
            <tr>
              <td style="padding:20px 32px 28px;font-size:13px;line-height:1.6;color:#52525b;border-top:1px solid #f1f1f4;margin-top:12px;">
                ${escapeHtml(opts.closing)}<br/>
                <strong style="color:#0f172a;">${escapeHtml(BRAND_NAME)}</strong>
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin:14px auto 0;text-align:center;font-size:11px;color:#a1a1aa;">
            © ${new Date().getFullYear()} ${escapeHtml(BRAND_NAME)}. Бүх эрх хуулиар хамгаалагдсан.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    opts.greeting,
    "",
    opts.intro,
    "",
    `${opts.ctaLabel}: ${opts.ctaUrl}`,
    "",
    opts.note ?? "",
    opts.closing,
    BRAND_NAME,
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

export function renderEmail(payload: SupabaseEmailHookPayload): RenderedEmail {
  const fullName = pickFullName(payload);
  const ctaUrl = buildConfirmationUrl(payload);
  const action = payload.email_data.email_action_type;
  const greetingName = fullName ? fullName : "Сайн байна уу";

  switch (action) {
    case "signup": {
      const r = renderShell({
        preheader: "Бүртгэлээ баталгаажуулна уу — Төв Цэнгэлдэх",
        greeting: `${greetingName}!`,
        intro:
          "Та манай вэбсайт дээр имэйл хаягаараа шинээр бүртгүүлсэн байна. Бүртгэлээ баталгаажуулахын тулд доорх товчин дээр дарна уу. Линкийн хүчинтэй хугацаа: 24 цаг.",
        ctaLabel: "Бүртгэлээ баталгаажуулах",
        ctaUrl,
        note: "Хэрэв та энэ үйлдлийг хийгээгүй бол энэ имэйлийг үл тоомсорлоорой.",
        closing: "Хүндэтгэсэн,",
      });
      return {
        subject: "Бүртгэлээ баталгаажуулна уу — Төв Цэнгэлдэх",
        htmlBody: r.html,
        textBody: r.text,
        tag: "signup-verify",
      };
    }

    case "recovery": {
      const r = renderShell({
        preheader: "Нууц үг сэргээх — Төв Цэнгэлдэх",
        greeting: `${greetingName}!`,
        intro:
          "Та нууц үгээ сэргээх хүсэлт илгээсэн байна. Доорх товчин дээр дараад шинэ нууц үгээ тохируулна уу. Линкийн хүчинтэй хугацаа: 1 цаг.",
        ctaLabel: "Нууц үг сэргээх",
        ctaUrl,
        note: "Хэрэв та энэ хүсэлтийг өөрөө илгээгээгүй бол энэ имэйлийг үл тоомсорлоорой — таны бүртгэл аюулгүй хэвээр байгаа.",
        closing: "Хүндэтгэсэн,",
      });
      return {
        subject: "Нууц үг сэргээх — Төв Цэнгэлдэх",
        htmlBody: r.html,
        textBody: r.text,
        tag: "password-recovery",
      };
    }

    case "magiclink": {
      const r = renderShell({
        preheader: "Холбоосоор нэвтрэх — Төв Цэнгэлдэх",
        greeting: `${greetingName}!`,
        intro:
          "Доорх товчин дээр дарж бүртгэлдээ нэвтэрнэ үү. Линкийн хүчинтэй хугацаа: 1 цаг.",
        ctaLabel: "Нэвтрэх",
        ctaUrl,
        note: "Хэрэв та нэвтрэх хүсэлт өөрөө илгээгээгүй бол энэ имэйлийг үл тоомсорлоорой.",
        closing: "Хүндэтгэсэн,",
      });
      return {
        subject: "Холбоосоор нэвтрэх — Төв Цэнгэлдэх",
        htmlBody: r.html,
        textBody: r.text,
        tag: "magiclink",
      };
    }

    case "email_change_current":
    case "email_change_new": {
      const r = renderShell({
        preheader: "Имэйл хаяг өөрчлөх — Төв Цэнгэлдэх",
        greeting: `${greetingName}!`,
        intro:
          "Та бүртгэлийнхээ имэйл хаягийг өөрчлөх хүсэлт илгээсэн байна. Доорх товчин дээр дараад баталгаажуулна уу.",
        ctaLabel: "Имэйл өөрчлөлтийг баталгаажуулах",
        ctaUrl,
        note: "Хэрэв та энэ хүсэлтийг өөрөө илгээгээгүй бол нэн даруй бидэнтэй холбогдоно уу.",
        closing: "Хүндэтгэсэн,",
      });
      return {
        subject: "Имэйл хаяг өөрчлөх — Төв Цэнгэлдэх",
        htmlBody: r.html,
        textBody: r.text,
        tag: "email-change",
      };
    }

    case "invite": {
      const r = renderShell({
        preheader: "Урилга — Төв Цэнгэлдэх",
        greeting: `${greetingName}!`,
        intro:
          "Танд манай платформын урилга илгээгдлээ. Доорх товчин дээр дарж бүртгэлээ үүсгэнэ үү.",
        ctaLabel: "Урилгыг хүлээн авах",
        ctaUrl,
        closing: "Хүндэтгэсэн,",
      });
      return {
        subject: "Урилга — Төв Цэнгэлдэх",
        htmlBody: r.html,
        textBody: r.text,
        tag: "invite",
      };
    }

    case "reauthentication":
    default: {
      const r = renderShell({
        preheader: "Баталгаажуулах хүсэлт — Төв Цэнгэлдэх",
        greeting: `${greetingName}!`,
        intro:
          "Та бүртгэлийнхээ үйлдлийг баталгаажуулах шаардлагатай байна. Доорх товчин дээр дарна уу.",
        ctaLabel: "Баталгаажуулах",
        ctaUrl,
        closing: "Хүндэтгэсэн,",
      });
      return {
        subject: "Баталгаажуулах хүсэлт — Төв Цэнгэлдэх",
        htmlBody: r.html,
        textBody: r.text,
        tag: `auth-${action}`,
      };
    }
  }
}

async function sendViaDev(input: SendEmailInput): Promise<EmailSendResult> {
  console.log("[email:dev]", {
    to: input.to,
    subject: input.subject,
    tag: input.tag,
  });
  return {
    ok: true,
    provider: "dev",
    note: "logged to console; no email sent",
  };
}

async function sendViaPostmark(
  input: SendEmailInput,
): Promise<EmailSendResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.POSTMARK_FROM;
  if (!token || !from) {
    throw new Error(
      "EMAIL_PROVIDER=postmark but POSTMARK_SERVER_TOKEN / POSTMARK_FROM are not set.",
    );
  }
  const stream = process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";

  const body = {
    From: from,
    To: input.fullName ? `${input.fullName} <${input.to}>` : input.to,
    Subject: input.subject,
    HtmlBody: input.htmlBody,
    TextBody: input.textBody,
    MessageStream: stream,
    Tag: input.tag,
    TrackOpens: false,
  };

  let res: Response;
  try {
    res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`postmark_network_error: ${(err as Error).message}`);
  }

  const json = (await res.json().catch(() => ({}))) as {
    MessageID?: string;
    ErrorCode?: number;
    Message?: string;
  };

  if (!res.ok || (json.ErrorCode ?? 0) !== 0) {
    const reason = json.Message ?? res.statusText;
    throw new Error(
      `postmark_send_failed: ${reason}${json.ErrorCode ? ` (code ${json.ErrorCode})` : ""}`,
    );
  }

  return {
    ok: true,
    provider: "postmark",
    messageId: json.MessageID,
  };
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<EmailSendResult> {
  switch (resolveProvider()) {
    case "postmark":
      return sendViaPostmark(input);
    case "dev":
    default:
      return sendViaDev(input);
  }
}
