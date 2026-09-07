import type { QPayInvoiceLink } from "@cs360/shared";
import { redactReceiptSecrets } from "./ebarimt";

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

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
  classificationCode?: string;
  barcode?: string;
  note?: string;
}

export interface CreateInvoiceInput {
  senderInvoiceNo: string;

  receiverCode: string;
  amountMnt: number;
  description: string;
  callbackUrl: string;
  branchCode?: string;
  lines?: InvoiceLine[];
  customerTin?: string | null;
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
  ebarimt_id?: string | null;
  ebarimt_qr_data?: string | null;
  ebarimt_lottery?: string | null;
}

export interface PaymentCheckResult {
  count: number;
  paid_amount: number;
  rows: PaymentCheckRow[];
}

let tokenCache: CachedToken | null = null;

const EPOCH_THRESHOLD_SEC = 1_000_000_000;

function tokenExpiryMs(expiresIn: number): number {
  if (!Number.isFinite(expiresIn)) return Date.now() + 60_000;
  const lifetimeSec =
    expiresIn > EPOCH_THRESHOLD_SEC
      ? expiresIn - Math.floor(Date.now() / 1000)
      : expiresIn;
  return Date.now() + Math.max(1, lifetimeSec - 60) * 1000;
}

interface EbarimtV3Config {
  invoiceCode: string;
  districtCode: string;
  taxType: string;
  classificationCode: string;
  taxProductCode: string;
  vatEnabled: boolean;
}

function env() {
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  const baseUrl = (
    process.env.QPAY_BASE_URL ?? "https://merchant.qpay.mn"
  ).replace(/\/$/, "");
  const vatEnabled = process.env.EBARIMT_VAT !== "0";
  const ebarimt: EbarimtV3Config = {
    invoiceCode: process.env.QPAY_EBARIMT_INVOICE_CODE ?? "",
    districtCode:
      process.env.QPAY_EBARIMT_DISTRICT_CODE ??
      process.env.EBARIMT_DISTRICT_CODE ??
      "",
    taxType: process.env.QPAY_EBARIMT_TAX_TYPE ?? (vatEnabled ? "1" : "2"),
    classificationCode: process.env.EBARIMT_CLASSIFICATION_CODE ?? "",
    taxProductCode: vatEnabled
      ? ""
      : (process.env.EBARIMT_TAX_PRODUCT_CODE ?? ""),
    vatEnabled,
  };
  return { username, password, invoiceCode, baseUrl, ebarimt };
}

export function isEbarimtV3Enabled(): boolean {
  return Boolean(env().ebarimt.invoiceCode);
}

export function isQPayConfigured(): boolean {
  const { username, password, invoiceCode, ebarimt } = env();
  return Boolean(username && password && (invoiceCode || ebarimt.invoiceCode));
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

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: tokenExpiryMs(data.expires_in),
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
      expires_at: tokenExpiryMs(data.expires_in),
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
    const text = redactReceiptSecrets(await res.text());
    throw new Error(`qpay_${path}_failed:${res.status}:${text}`);
  }
  return (await res.json()) as T;
}

async function qpayDelete<T>(path: string): Promise<T> {
  const { baseUrl } = env();
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = redactReceiptSecrets(await res.text());
    throw new Error(`qpay_${path}_failed:${res.status}:${text}`);
  }
  return (await res.json().catch(() => ({}))) as T;
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
    const text = redactReceiptSecrets(await res.text());
    throw new Error(`qpay_${path}_failed:${res.status}:${text}`);
  }
  return (await res.json()) as T;
}

const VAT_DIVISOR = 11;

function trunc4(n: number): number {
  return Math.floor((n + Number.EPSILON) * 10000) / 10000;
}

function toApiInvoice(data: QPayCreateInvoiceApi): CreateInvoiceResult {
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

async function createEbarimtV3Invoice(
  input: CreateInvoiceInput,
  cfg: EbarimtV3Config,
): Promise<CreateInvoiceResult> {
  const lines = input.lines ?? [];
  if (lines.length === 0) throw new Error("qpay_ebarimt_lines_required");
  if (!cfg.districtCode) throw new Error("qpay_ebarimt_district_missing");

  const payload = {
    invoice_code: cfg.invoiceCode,
    sender_invoice_no: input.senderInvoiceNo,
    invoice_receiver_code: input.receiverCode,
    ...(input.customerTin
      ? { invoice_receiver_data: { register: input.customerTin } }
      : {}),
    ...(input.branchCode ? { sender_branch_code: input.branchCode } : {}),
    invoice_description: input.description,
    callback_url: input.callbackUrl,
    tax_type: cfg.taxType,
    district_code: cfg.districtCode,
    lines: lines.map((line) => {
      const lineTotal = line.qty * line.unitPrice;
      return {
        tax_product_code: cfg.taxProductCode,
        line_description: line.description,
        ...(line.barcode ? { barcode: line.barcode } : {}),
        line_quantity: line.qty.toFixed(2),
        line_unit_price: line.unitPrice.toFixed(2),
        ...(line.note ? { note: line.note } : {}),
        classification_code:
          line.classificationCode ?? cfg.classificationCode ?? "",
        ...(cfg.vatEnabled
          ? {
              taxes: [
                {
                  tax_code: "VAT",
                  description: "НӨАТ",
                  amount: trunc4(lineTotal / VAT_DIVISOR),
                  note: "НӨАТ",
                },
              ],
            }
          : {}),
      };
    }),
  };

  const data = await qpayPost<QPayCreateInvoiceApi>(
    "/v2/ebarimt_v3/create",
    payload,
  );
  return toApiInvoice(data);
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const { invoiceCode, ebarimt } = env();
  if (ebarimt.invoiceCode) {
    return createEbarimtV3Invoice(input, ebarimt);
  }
  if (!invoiceCode) throw new Error("qpay_not_configured");

  const payload = {
    invoice_code: invoiceCode,
    sender_invoice_no: input.senderInvoiceNo,
    invoice_receiver_code: input.receiverCode,
    invoice_description: input.description,
    amount: input.amountMnt,
    callback_url: input.callbackUrl,
    ...(input.branchCode ? { sender_branch_code: input.branchCode } : {}),
  };

  const data = await qpayPost<QPayCreateInvoiceApi>("/v2/invoice", payload);
  return toApiInvoice(data);
}

export async function getInvoice(
  invoiceId: string,
): Promise<CreateInvoiceResult> {
  const data = await qpayGet<QPayCreateInvoiceApi>(
    `/v2/invoice/${encodeURIComponent(invoiceId)}`,
  );
  return toApiInvoice(data);
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

export function paidPaymentId(check: PaymentCheckResult): string | null {
  const row = check.rows.find(
    (r) => String(r.payment_status).toUpperCase() === "PAID",
  );
  return row ? String(row.payment_id) : null;
}

export interface EbarimtCreateResult {
  id: string;
  ebarimt_qr_data: string;
  ebarimt_lottery: string;
  ebarimt_status: string;
}

export async function createEbarimt(
  paymentId: string,
  receiverType: "CITIZEN" | "COMPANY" = "CITIZEN",
): Promise<EbarimtCreateResult> {
  return qpayPost<EbarimtCreateResult>("/v2/ebarimt/create", {
    payment_id: paymentId,
    ebarimt_receiver_type: receiverType,
  });
}

export async function cancelEbarimt(ebarimtId: string): Promise<void> {
  await qpayDelete(`/v2/ebarimt/${encodeURIComponent(ebarimtId)}`);
}

export interface EbarimtReceipt {
  id: string;
  qrData: string;
  lottery: string;
}

export function ebarimtFromCheck(
  check: PaymentCheckResult,
): EbarimtReceipt | null {
  const row = check.rows.find(
    (r) => String(r.payment_status).toUpperCase() === "PAID",
  );
  if (!row?.ebarimt_id) return null;
  return {
    id: String(row.ebarimt_id),
    qrData: row.ebarimt_qr_data ?? "",
    lottery: row.ebarimt_lottery ?? "",
  };
}

export async function cancelEbarimtV3(paymentId: string): Promise<void> {
  await qpayDelete(`/v2/ebarimt_v3/${encodeURIComponent(paymentId)}`);
}
