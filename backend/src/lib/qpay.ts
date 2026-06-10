import type { QPayInvoiceLink } from "@cs360/shared";

interface TokenResponse {
  token_type: "bearer";
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  scope?: string;
}

interface CachedToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface CreateInvoiceInput {
  senderInvoiceNo: string;

  receiverCode: string;
  amountMnt: number;
  description: string;
  callbackUrl: string;
}

export interface CreateInvoiceResult {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  urls: QPayInvoiceLink[];
}

interface QPayCreateInvoiceApi {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  urls?: Array<{
    name?: string;
    description?: string;
    logo?: string;
    link: string;
  }>;
}

export interface PaymentCheckRow {
  payment_id: string;
  payment_status: "PAID" | "FAILED" | "REFUNDED" | string;
  payment_amount: number | string;
  payment_date?: string;
  payment_currency?: string;
}

export interface PaymentCheckResult {
  count: number;
  paid_amount: number;
  rows: PaymentCheckRow[];
}

let tokenCache: CachedToken | null = null;

function env() {
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  const baseUrl = (
    process.env.QPAY_BASE_URL ?? "https://merchant.qpay.mn"
  ).replace(/\/$/, "");
  return { username, password, invoiceCode, baseUrl };
}

export function isQPayConfigured(): boolean {
  const { username, password, invoiceCode } = env();
  return Boolean(username && password && invoiceCode);
}

async function fetchNewToken(): Promise<CachedToken> {
  const { username, password, baseUrl } = env();
  if (!username || !password) {
    throw new Error("qpay_not_configured");
  }
  const basic = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch(`${baseUrl}/v2/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`qpay_auth_failed:${res.status}:${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;

  const expires_at = Date.now() + Math.max(1, data.expires_in - 60) * 1000;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at,
  };
}

async function refreshToken(refresh: string): Promise<CachedToken | null> {
  const { baseUrl } = env();
  try {
    const res = await fetch(`${baseUrl}/v2/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refresh}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TokenResponse;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Math.max(1, data.expires_in - 60) * 1000,
    };
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expires_at > Date.now()) {
    return tokenCache.access_token;
  }
  if (tokenCache) {
    const refreshed = await refreshToken(tokenCache.refresh_token);
    if (refreshed) {
      tokenCache = refreshed;
      return tokenCache.access_token;
    }
  }
  tokenCache = await fetchNewToken();
  return tokenCache.access_token;
}

async function qpayPost<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl } = env();
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`qpay_${path}_failed:${res.status}:${text}`);
  }
  return (await res.json()) as T;
}

async function qpayGet<T>(path: string): Promise<T> {
  const { baseUrl } = env();
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`qpay_${path}_failed:${res.status}:${text}`);
  }
  return (await res.json()) as T;
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const { invoiceCode } = env();
  if (!invoiceCode) throw new Error("qpay_not_configured");

  const payload = {
    invoice_code: invoiceCode,
    sender_invoice_no: input.senderInvoiceNo,
    invoice_receiver_code: input.receiverCode,
    invoice_description: input.description,
    amount: input.amountMnt,
    callback_url: input.callbackUrl,
  };

  const data = await qpayPost<QPayCreateInvoiceApi>("/v2/invoice", payload);
  return {
    invoice_id: data.invoice_id,
    qr_text: data.qr_text,
    qr_image: data.qr_image,
    urls: (data.urls ?? []).map((u) => ({
      name: u.name ?? "Bank",
      description: u.description,
      logo: u.logo,
      link: u.link,
    })),
  };
}

export async function getInvoice(
  invoiceId: string,
): Promise<CreateInvoiceResult> {
  const data = await qpayGet<QPayCreateInvoiceApi>(
    `/v2/invoice/${encodeURIComponent(invoiceId)}`,
  );
  return {
    invoice_id: data.invoice_id,
    qr_text: data.qr_text,
    qr_image: data.qr_image,
    urls: (data.urls ?? []).map((u) => ({
      name: u.name ?? "Bank",
      description: u.description,
      logo: u.logo,
      link: u.link,
    })),
  };
}

export async function checkInvoicePayment(
  invoiceId: string,
): Promise<PaymentCheckResult> {
  const data = await qpayPost<PaymentCheckResult>("/v2/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
  return {
    count: data.count ?? 0,
    paid_amount: Number(data.paid_amount ?? 0),
    rows: data.rows ?? [],
  };
}

export function isPaid(check: PaymentCheckResult): boolean {
  if (check.count <= 0) return false;
  return check.rows.some(
    (r) => String(r.payment_status).toUpperCase() === "PAID",
  );
}
