import { Resend } from "resend";

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
  html: string;
  /** Optional plain-text alternative. */
  text?: string;
  /** Optional display name for the To header ("Name <email>"). */
  fullName?: string | null;
  /** Override the default From address. */
  from?: string;
  replyTo?: string;
  /** Short label attached as a Resend tag (analytics). */
  tag?: string;
  /** Dedup key — a retried webhook with the same key won't send twice. */
  idempotencyKey?: string;
}

export interface EmailSendResult {
  ok: boolean;
  provider: "resend" | "dev";
  messageId?: string;
  note?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape then convert newlines to <br/> — safe for interpolating into HTML. */
function escapeMultiline(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

/**
 * The verify endpoint lives on the SUPABASE project domain
 * (…supabase.co/auth/v1/verify). The hook's `site_url` points at the public
 * site (stadium.mn) where that path doesn't exist — links built on it landed
 * on the SPA and appeared dead. Always build on the project URL.
 */
export function buildConfirmationUrl(
  payload: SupabaseEmailHookPayload,
): string {
  const { token_hash, redirect_to, email_action_type, site_url } =
    payload.email_data;
  const base = (process.env.SUPABASE_URL || site_url || "").replace(
    /\/+$/,
    "",
  );
  // GoTrue's verify endpoint knows a single "email_change" type.
  const verifyType =
    email_action_type === "email_change_current" ||
    email_action_type === "email_change_new"
      ? "email_change"
      : email_action_type;
  const params = new URLSearchParams({
    token: token_hash,
    type: verifyType,
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

// --- Brand & config ---------------------------------------------------------

const BRAND_NAME = "Төв Цэнгэлдэх Хүрээлэн";
/** Short label shown in the footer context line. */
const BRAND_TAGLINE = "Монголын спорт, соёлын төв";

/** Optional logo image shown in the header. Set EMAIL_LOGO_URL to a hosted
 *  PNG/SVG (recommended: white/light logo on transparent bg, ~150px wide).
 *  When unset the header shows a gold monogram chip + brand name. */
const LOGO_URL = process.env.EMAIL_LOGO_URL?.trim() || "";
/** Public site link used in the footer. */
const SITE_LINK = process.env.EMAIL_SITE_LINK?.trim() || "https://stadium.mn";
/** Support address shown for security-sensitive notes. */
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT?.trim() || "help@stadium.mn";

// Palette — pre-blended tones (no CSS opacity, which many clients drop).
const C = {
  page: "#eef0f6",
  card: "#ffffff",
  cardBorder: "#e4e7f0",
  headerBase: "#131c7a",
  headerFrom: "#0b1130",
  chip: "#1b2350",
  divider: "#2e3564",
  ink: "#0b1130",
  text: "#31374a",
  muted: "#6b7280",
  faint: "#8a93b2",
  accent: "#2230c6",
  accentDark: "#1a249e",
  accentText: "#ffffff",
  gold: "#e8dec4",
  soft: "#f7f8fc",
  softBorder: "#e4e7f0",
  warnBg: "#fff8f0",
  warnBorder: "#f59e0b",
  warnText: "#9a3412",
};

// --- Shell ------------------------------------------------------------------

type NoteKind = "info" | "warn";

/** Dark-mode overrides. Honored by clients that support prefers-color-scheme
 *  (Apple Mail, iOS Mail, some others); Gmail keeps the light inline styles. */
const DARK_STYLE = `
  @media (prefers-color-scheme: dark) {
    .em-body { background:#0b0e1c !important; }
    .em-card { background:#141a33 !important; border-color:#232a45 !important; }
    .em-h1 { color:#f5f6fb !important; }
    .em-text { color:#c9cdde !important; }
    .em-muted { color:#9aa1b8 !important; }
    .em-eyebrow { color:#9aa1b8 !important; }
    .em-callout { background:#1b2137 !important; }
    .em-fallback { background:#1b2137 !important; border-color:#2a3050 !important; }
    .em-mono { color:#c9cdde !important; }
    .em-divider { border-color:#232a45 !important; }
    .em-footbrand { color:#e8dec4 !important; }
  }
  @media (max-width: 600px) {
    .em-card { width:100% !important; }
    .em-cta { width:100% !important; box-sizing:border-box; }
    .em-pad { padding-left:22px !important; padding-right:22px !important; }
  }
`;

function renderShell(opts: {
  preheader: string;
  eyebrow: string;
  greeting: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  closing: string;
  note?: { kind: NoteKind; text: string };
}): { html: string; text: string } {
  const safeCta = escapeHtml(opts.ctaUrl);
  const safeLabel = escapeHtml(opts.ctaLabel);
  const year = new Date().getFullYear();

  const brandMark = LOGO_URL
    ? `<img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(
        BRAND_NAME,
      )}" width="150" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:150px;" />`
    : `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td width="44" style="width:44px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="44" style="width:44px;height:44px;background:${C.chip};border-radius:12px;">
            <tr><td align="center" valign="middle" style="height:44px;font-size:15px;font-weight:800;letter-spacing:0.5px;color:${C.gold};">ТЦХ</td></tr>
          </table>
        </td>
        <td style="padding-left:14px;font-size:16px;font-weight:800;letter-spacing:-0.01em;color:${C.gold};">${escapeHtml(
          BRAND_NAME,
        )}</td>
      </tr></table>`;

  const noteBlock = opts.note
    ? (() => {
        const warn = opts.note.kind === "warn";
        const leftBar = warn ? C.warnBorder : C.gold;
        const fg = warn ? C.warnText : C.muted;
        return `<tr>
              <td class="em-pad" style="padding:4px 32px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="em-callout" style="background:${C.soft};border-radius:10px;">
                  <tr>
                    <td width="4" style="width:4px;background:${leftBar};border-radius:10px 0 0 10px;">&nbsp;</td>
                    <td class="em-text" style="padding:13px 16px;font-size:13px;line-height:1.55;color:${fg};">${escapeMultiline(
                      opts.note.text,
                    )}</td>
                  </tr>
                </table>
              </td>
            </tr>`;
      })()
    : "";

  const vmlButton = `<!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeCta}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="19%" strokecolor="${C.accent}" fillcolor="${C.accent}">
                  <w:anchorlock/>
                  <center style="color:${C.accentText};font-family:sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center>
                </v:roundrect>
                <![endif]-->`;

  const html = `<!doctype html>
<html lang="mn" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escapeHtml(BRAND_NAME)}</title>
    <style>${DARK_STYLE}</style>
    <!--[if mso]><style>a,td,div,h1{font-family:'Segoe UI',Arial,sans-serif !important;}</style><![endif]-->
  </head>
  <body class="em-body" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;color:${C.text};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;mso-hide:all;">
      ${escapeHtml(opts.preheader)}
      &#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="em-body" style="background:${C.page};">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" class="em-card" style="max-width:560px;width:100%;background:${C.card};border:1px solid ${C.cardBorder};border-radius:16px;overflow:hidden;">
            <tr>
              <td bgcolor="${C.headerBase}" style="background-color:${C.headerBase};background:linear-gradient(135deg,${C.headerFrom} 0%,${C.headerBase} 100%);padding:28px 32px;">
                ${brandMark}
                <div style="border-top:1px solid ${C.divider};margin-top:20px;font-size:1px;line-height:1px;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td class="em-pad" style="padding:30px 32px 0;">
                <div class="em-eyebrow" style="font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.faint};">${escapeHtml(
                  opts.eyebrow,
                )}</div>
                <div class="em-h1" style="margin-top:8px;font-size:22px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;color:${C.ink};">${escapeHtml(
                  opts.greeting,
                )}</div>
              </td>
            </tr>
            <tr>
              <td class="em-pad em-text" style="padding:14px 32px 0;font-size:15px;line-height:1.65;color:${C.text};">
                ${escapeMultiline(opts.intro)}
              </td>
            </tr>
            <tr>
              <td class="em-pad" style="padding:28px 32px;" align="center">
                ${vmlButton}
                <!--[if !mso]><!-- -->
                <a href="${safeCta}" class="em-cta" style="display:inline-block;background:${C.accent};color:${C.accentText};text-decoration:none;font-weight:700;font-size:16px;line-height:1;padding:16px 32px;border-radius:10px;border-bottom:2px solid ${C.accentDark};letter-spacing:0.01em;">${safeLabel}</a>
                <!--<![endif]-->
              </td>
            </tr>
            <tr>
              <td class="em-pad em-muted" style="padding:0 32px 8px;font-size:12.5px;line-height:1.55;color:${C.muted};">
                ${escapeHtml(
                  // fallback helper text is action-agnostic
                  "Хэрэв товч ажиллахгүй бол доорх холбоосыг хөтчийнхөө хаягийн мөрөнд хуулж тавина уу:",
                )}
              </td>
            </tr>
            <tr>
              <td class="em-pad" style="padding:0 32px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="em-fallback" style="background:${C.soft};border:1px solid ${C.softBorder};border-radius:8px;">
                  <tr><td class="em-mono" style="padding:12px 16px;font-family:'SF Mono',SFMono-Regular,ui-monospace,Consolas,Menlo,monospace;font-size:12.5px;line-height:1.5;word-break:break-all;color:${C.accent};">
                    <a href="${safeCta}" style="color:${C.accent};text-decoration:none;word-break:break-all;">${safeCta}</a>
                  </td></tr>
                </table>
              </td>
            </tr>
            ${noteBlock}
            <tr>
              <td class="em-pad" style="padding:18px 32px 26px;">
                <div class="em-divider" style="border-top:1px solid ${C.cardBorder};padding-top:20px;">
                  <div class="em-text" style="font-size:13px;line-height:1.6;color:${C.muted};">${escapeHtml(
                    opts.closing,
                  )}</div>
                  <div class="em-footbrand" style="font-size:14px;font-weight:800;color:${C.ink};margin-top:2px;">${escapeHtml(
                    BRAND_NAME,
                  )}</div>
                </div>
              </td>
            </tr>
          </table>
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;">
            <tr>
              <td align="center" style="padding:18px 24px 0;">
                <div class="em-muted" style="font-size:12px;line-height:1.6;color:${C.faint};">${escapeHtml(
                  BRAND_TAGLINE,
                )}</div>
                <div style="margin-top:6px;">
                  <a href="${escapeHtml(
                    SITE_LINK,
                  )}" style="font-size:12px;color:${C.accent};text-decoration:underline;">${escapeHtml(
                    SITE_LINK.replace(/^https?:\/\//, ""),
                  )}</a>
                </div>
                <div class="em-muted" style="margin-top:16px;font-size:12px;line-height:1.6;color:${C.faint};">© ${year} ${escapeHtml(
                  BRAND_NAME,
                )}. Бүх эрх хуулиар хамгаалагдсан.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    opts.eyebrow,
    "",
    opts.greeting,
    "",
    opts.intro,
    "",
    `${opts.ctaLabel}: ${opts.ctaUrl}`,
    "",
    opts.note?.text ?? "",
    "",
    opts.closing,
    BRAND_NAME,
    SITE_LINK,
  ]
    .filter((line, i, a) => !(line === "" && a[i - 1] === ""))
    .join("\n");

  return { html, text };
}

// --- Per-action content -----------------------------------------------------

type ActionContent = {
  subject: string;
  preheader: string;
  eyebrow: string;
  intro: string;
  ctaLabel: string;
  closing: string;
  tag: string;
  note?: { kind: NoteKind; text: string };
};

const CLOSING = "Хүндэтгэсэн,";

function contentFor(action: EmailActionType): ActionContent {
  switch (action) {
    case "signup":
      return {
        subject: "Бүртгэлээ баталгаажуулна уу — Төв Цэнгэлдэх Хүрээлэн",
        preheader: "Бүртгэлээ баталгаажуулна уу — Төв Цэнгэлдэх Хүрээлэн",
        eyebrow: "Бүртгэл баталгаажуулах",
        intro:
          "Та манай сайтад имэйл хаягаараа шинээр бүртгүүллээ. Бүртгэлээ баталгаажуулахын тулд доорх товч дээр дарна уу.\nЭнэ холбоос 24 цагийн дараа хүчингүй болно.",
        ctaLabel: "Бүртгэлээ баталгаажуулах",
        closing: CLOSING,
        tag: "signup-verify",
        note: {
          kind: "info",
          text: "Хэрэв та бүртгэл үүсгээгүй бол энэ имэйлийг тоохгүй орхино уу.",
        },
      };

    case "recovery":
      return {
        subject: "Нууц үг сэргээх — Төв Цэнгэлдэх Хүрээлэн",
        preheader: "Нууц үгээ сэргээх холбоос — Төв Цэнгэлдэх Хүрээлэн",
        eyebrow: "Нууц үг сэргээх",
        intro:
          "Та нууц үгээ сэргээх хүсэлт илгээсэн байна. Доорх товч дээр дараад шинэ нууц үгээ тохируулна уу.\nЭнэ холбоос 1 цагийн дараа хүчингүй болно.",
        ctaLabel: "Нууц үг сэргээх",
        closing: CLOSING,
        tag: "password-recovery",
        note: {
          kind: "warn",
          text: "Хэрэв та энэ хүсэлтийг өөрөө илгээгээгүй бол энэ имэйлийг тоохгүй орхино уу — таны бүртгэл аюулгүй хэвээр байна.",
        },
      };

    case "magiclink":
      return {
        subject: "Холбоосоор нэвтрэх — Төв Цэнгэлдэх Хүрээлэн",
        preheader: "Нэг товшилтоор нэвтрэх холбоос — Төв Цэнгэлдэх Хүрээлэн",
        eyebrow: "Нэвтрэх холбоос",
        intro:
          "Доорх товч дээр дарж бүртгэлдээ шууд нэвтэрнэ үү.\nЭнэ холбоос 1 цагийн дараа хүчингүй болно.",
        ctaLabel: "Нэвтрэх",
        closing: CLOSING,
        tag: "magiclink",
        note: {
          kind: "warn",
          text: "Хэрэв та нэвтрэх хүсэлтийг өөрөө илгээгээгүй бол энэ имэйлийг тоохгүй орхино уу.",
        },
      };

    case "email_change_current":
    case "email_change_new":
      return {
        subject: "Имэйл хаяг өөрчлөх — Төв Цэнгэлдэх Хүрээлэн",
        preheader: "Имэйл хаягийн өөрчлөлтийг баталгаажуулна уу",
        eyebrow: "Имэйл хаяг өөрчлөх",
        intro:
          "Та бүртгэлийнхээ имэйл хаягаа өөрчлөх хүсэлт илгээсэн байна. Доорх товч дээр дараад өөрчлөлтийг баталгаажуулна уу.",
        ctaLabel: "Имэйл өөрчлөлтийг баталгаажуулах",
        closing: CLOSING,
        tag: "email-change",
        note: {
          kind: "warn",
          text: `Хэрэв та энэ хүсэлтийг өөрөө илгээгээгүй бол нэн даруй ${SUPPORT_EMAIL} хаягаар бидэнтэй холбогдоно уу.`,
        },
      };

    case "invite":
      return {
        subject: "Урилга — Төв Цэнгэлдэх Хүрээлэн",
        preheader: "Танд урилга ирлээ — Төв Цэнгэлдэх Хүрээлэн",
        eyebrow: "Урилга",
        intro:
          "Танд манай платформд нэгдэх урилга ирлээ. Доорх товч дээр дарж бүртгэлээ үүсгэнэ үү.",
        ctaLabel: "Урилгыг хүлээн авах",
        closing: CLOSING,
        tag: "invite",
      };

    case "reauthentication":
    default:
      return {
        subject: "Баталгаажуулах хүсэлт — Төв Цэнгэлдэх Хүрээлэн",
        preheader: "Үйлдлээ баталгаажуулна уу — Төв Цэнгэлдэх Хүрээлэн",
        eyebrow: "Баталгаажуулалт",
        intro:
          "Та бүртгэлдээ хийж буй үйлдлээ баталгаажуулах шаардлагатай байна. Доорх товч дээр дарна уу.",
        ctaLabel: "Баталгаажуулах",
        closing: CLOSING,
        tag: `auth-${action}`,
      };
  }
}

export function renderEmail(payload: SupabaseEmailHookPayload): RenderedEmail {
  const fullName = pickFullName(payload);
  const ctaUrl = buildConfirmationUrl(payload);
  const action = payload.email_data.email_action_type;
  const greeting = fullName ? `Сайн байна уу, ${fullName}!` : "Сайн байна уу!";

  const c = contentFor(action);
  const r = renderShell({
    preheader: c.preheader,
    eyebrow: c.eyebrow,
    greeting,
    intro: c.intro,
    ctaLabel: c.ctaLabel,
    ctaUrl,
    closing: c.closing,
    note: c.note,
  });

  return {
    subject: c.subject,
    htmlBody: r.html,
    textBody: r.text,
    tag: c.tag,
  };
}

// --- Resend transactional email ------------------------------------------

// Default sender. Resend requires the domain (stadium.mn) to be verified.
// Override per-deploy with RESEND_FROM.
const DEFAULT_FROM =
  process.env.RESEND_FROM?.trim() || `${BRAND_NAME} <no-reply@stadium.mn>`;

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 300;

// Resend error names worth retrying (transient / server-side). Validation and
// auth errors are permanent, so we fail fast on those.
const TRANSIENT_ERROR_NAMES = new Set([
  "rate_limit_exceeded",
  "internal_server_error",
  "application_error",
]);

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Send one transactional email via Resend. Retries transient failures up to
 * twice with exponential backoff; pass `idempotencyKey` so a retried Supabase
 * webhook can't send the same mail twice. When RESEND_API_KEY is unset it logs
 * and returns without sending, so local dev works without credentials.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<EmailSendResult> {
  const resend = getResend();
  if (!resend) {
    console.log("[email:dev] RESEND_API_KEY not set — not sending", {
      to: input.to,
      subject: input.subject,
      tag: input.tag,
    });
    return {
      ok: true,
      provider: "dev",
      note: "logged to console; RESEND_API_KEY not set",
    };
  }

  const to = input.fullName ? `${input.fullName} <${input.to}>` : input.to;
  const payload = {
    from: input.from?.trim() || DEFAULT_FROM,
    to: [to],
    subject: input.subject,
    html: input.html,
    ...(input.text ? { text: input.text } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.tag
      ? {
          tags: [
            { name: "tag", value: input.tag.replace(/[^A-Za-z0-9_-]/g, "_") },
          ],
        }
      : {}),
  };
  const options = input.idempotencyKey
    ? { idempotencyKey: input.idempotencyKey }
    : undefined;

  let lastError = "unknown_error";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend.emails.send(payload, options);
      if (!error) {
        return { ok: true, provider: "resend", messageId: data?.id };
      }
      lastError = `${error.name}: ${error.message}`;
      // Permanent error (validation, bad from, etc.) — don't retry.
      if (!TRANSIENT_ERROR_NAMES.has(error.name) || attempt === MAX_RETRIES) {
        break;
      }
    } catch (err) {
      // Network / unexpected throw — always transient.
      lastError = (err as Error).message ?? "network_error";
      if (attempt === MAX_RETRIES) break;
    }
    await sleep(RETRY_BASE_MS * 2 ** attempt);
  }

  console.error("[email:resend] send failed", {
    to: input.to,
    subject: input.subject,
    tag: input.tag,
    error: lastError,
  });
  throw new Error(`resend_send_failed: ${lastError}`);
}
