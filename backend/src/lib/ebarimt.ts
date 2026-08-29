import type { KioskEbarimt } from "@cs360/shared";

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
}

const VAT_DIVISOR = 11;

export function redactReceiptSecrets(text: string): string {
  return text.replace(
    /("(?:ebarimt_)?(?:qrData|qr_data|lottery)"\s*:\s*)"(?:[^"\\]|\\.)*"/gi,
    '$1"[REDACTED]"',
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function env() {
  const baseUrl = (process.env.EBARIMT_POSAPI_URL ?? "").replace(/\/$/, "");
  return {
    baseUrl,
    merchantTin: process.env.EBARIMT_MERCHANT_TIN ?? "",
    posNo: process.env.EBARIMT_POS_NO ?? "",
    branchNo: process.env.EBARIMT_BRANCH_NO ?? "001",
    districtCode: process.env.EBARIMT_DISTRICT_CODE ?? "3420",
    classificationCode: process.env.EBARIMT_CLASSIFICATION_CODE ?? "6201200",
    taxProductCode: process.env.EBARIMT_TAX_PRODUCT_CODE ?? "83100",
    measureUnit: process.env.EBARIMT_MEASURE_UNIT ?? "sh",
    vatEnabled: process.env.EBARIMT_VAT !== "0",
  };
}

export function isEbarimtConfigured(): boolean {
  const { baseUrl, merchantTin, posNo } = env();
  return Boolean(baseUrl && merchantTin && posNo);
}

const PLACEHOLDER_CODES: Record<string, string> = {
  EBARIMT_CLASSIFICATION_CODE: "6201200",
  EBARIMT_DISTRICT_CODE: "3420",
  EBARIMT_BRANCH_NO: "001",
};

export function warnIfEbarimtPlaceholders(): void {
  if (!isEbarimtConfigured()) return;
  const cfg = env();
  const current: Record<string, string> = {
    EBARIMT_CLASSIFICATION_CODE: cfg.classificationCode,
    EBARIMT_DISTRICT_CODE: cfg.districtCode,
    EBARIMT_BRANCH_NO: cfg.branchNo,
  };
  const hits = Object.keys(PLACEHOLDER_CODES).filter(
    (k) => current[k] === PLACEHOLDER_CODES[k],
  );
  if (hits.length > 0) {
    console.warn(
      `[ebarimt] WARNING: using PLACEHOLDER staging codes for ${hits.join(
        ", ",
      )}. Set your merchant's real registered values before production.`,
    );
  }
}

interface PosInfoResponse {
  operatorName: string;
  operatorTIN: string;
  posNo: string;
  posId: number;
  version: string;
  lastSentDate: string;
  leftLotteries: number;
  merchants: Array<{ tin: string; name: string; vatPayer: boolean }>;
}

function timeoutMs(): number {
  const v = Number(process.env.EBARIMT_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 15000;
}

function maxRetries(): number {
  const v = Number(process.env.EBARIMT_RETRIES);
  return Number.isFinite(v) && v >= 0 ? Math.min(v, 5) : 2;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function isNetworkError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return err instanceof TypeError || name === "AbortError";
}

async function posFetch(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  opts?: { retry?: boolean },
): Promise<Response> {
  const { baseUrl } = env();
  const url = `${baseUrl}${path}`;
  const retries = opts?.retry === false ? 0 : maxRetries();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());
    try {
      return await fetch(url, {
        method,
        headers:
          body !== undefined
            ? { "Content-Type": "application/json" }
            : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      lastErr = err;
      if (isNetworkError(err) && attempt < retries) {
        console.warn(
          `[ebarimt] network error on ${method} ${path} ` +
            `(attempt ${attempt + 1}/${retries + 1}), retrying`,
        );
        await sleep(250 * (attempt + 1));
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `ebarimt_unreachable:${method}:${path}:${
      (lastErr as Error)?.message ?? "unknown"
    }`,
  );
}

async function posGet<T>(path: string): Promise<T> {
  const res = await posFetch("GET", path);
  if (!res.ok) {
    throw new Error(
      `ebarimt_${path}_failed:${res.status}:${redactReceiptSecrets(
        await res.text(),
      )}`,
    );
  }
  return (await res.json()) as T;
}

export async function getPosInfo(): Promise<PosInfoResponse> {
  return posGet<PosInfoResponse>("/rest/info");
}

interface PosReceiptItem {
  name: string;
  barCode: string;
  barCodeType: string;
  classificationCode: string;
  taxProductCode: string;
  measureUnit: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  totalVAT: number;
  totalCityTax: number;
}

interface PosReceiptResponse {
  id: string;
  status: "SUCCESS" | "ERROR" | "PAYMENT";
  qrData?: string;
  lottery?: string;
  message?: string;
  date?: string;
}

export interface IssueReceiptResult extends KioskEbarimt {
  id: string;
  date: string;
}

export async function issueReceipt(input: {
  lines: ReceiptLine[];
  paymentCode?: "CASH" | "PAYMENT_CARD";
  customerTin?: string | null;
}): Promise<IssueReceiptResult> {
  const cfg = env();
  if (!isEbarimtConfigured()) throw new Error("ebarimt_not_configured");
  const isB2B = Boolean(input.customerTin);

  const lines: PosReceiptItem[] = input.lines.map((it) => {
    const totalAmount = round2(it.qty * it.unitPrice);
    const totalVAT = cfg.vatEnabled ? round2(totalAmount / VAT_DIVISOR) : 0;
    return {
      name: it.name || "Ticket",
      barCode: cfg.classificationCode,
      barCodeType: "UNDEFINED",
      classificationCode: cfg.classificationCode,
      taxProductCode: cfg.vatEnabled ? "" : cfg.taxProductCode,
      measureUnit: cfg.measureUnit,
      qty: it.qty,
      unitPrice: round2(it.unitPrice),
      totalAmount,
      totalVAT,
      totalCityTax: 0,
    };
  });

  const totalAmount = round2(lines.reduce((s, l) => s + l.totalAmount, 0));
  const totalVAT = cfg.vatEnabled ? round2(totalAmount / VAT_DIVISOR) : 0;

  const payload = {
    totalAmount,
    totalVAT,
    totalCityTax: 0,
    branchNo: cfg.branchNo,
    districtCode: cfg.districtCode,
    merchantTin: cfg.merchantTin,
    posNo: cfg.posNo,
    type: isB2B ? "B2B_RECEIPT" : "B2C_RECEIPT",
    ...(isB2B ? { customerTin: input.customerTin } : {}),
    receipts: [
      {
        totalAmount,
        totalVAT,
        totalCityTax: 0,
        taxType: cfg.vatEnabled ? "VAT_ABLE" : "VAT_FREE",
        merchantTin: cfg.merchantTin,
        items: lines,
      },
    ],
    payments: [
      {
        code: input.paymentCode ?? "PAYMENT_CARD",
        status: "PAID",
        paidAmount: totalAmount,
      },
    ],
  };

  const res = await posFetch("POST", "/rest/receipt", payload, {
    retry: false,
  });
  const data = (await res.json().catch(() => ({}))) as PosReceiptResponse;
  if (!res.ok || data.status !== "SUCCESS") {
    throw new Error(
      `ebarimt_receipt_failed:${res.status}:${data.status ?? "?"}:${
        data.message ?? "no message"
      }`,
    );
  }

  return {
    id: data.id,
    qrData: data.qrData ?? "",
    lottery: data.lottery ?? "",
    date: data.date ?? new Date().toISOString(),
  };
}

interface PosVoidErrorResponse {
  status?: number | string;
  message?: string;
  date?: string;
}

export interface VoidReceiptResult {
  voided: boolean;
  alreadyVoided: boolean;
}

export async function voidReceipt(input: {
  id: string;
  date?: string | null;
}): Promise<VoidReceiptResult> {
  if (!isEbarimtConfigured()) throw new Error("ebarimt_not_configured");

  const res = await posFetch("DELETE", "/rest/receipt", {
    id: input.id,
    ...(input.date ? { date: input.date } : {}),
  });
  if (res.ok) return { voided: true, alreadyVoided: false };

  const data = (await res.json().catch(() => ({}))) as PosVoidErrorResponse;
  const msg = data.message ?? "";
  if (/UNIQUE constraint failed/i.test(msg)) {
    return { voided: true, alreadyVoided: true };
  }
  throw new Error(`ebarimt_void_failed:${res.status}:${msg || "no message"}`);
}

export async function sendData(): Promise<boolean> {
  if (!isEbarimtConfigured()) throw new Error("ebarimt_not_configured");
  const res = await posFetch("GET", "/rest/sendData");
  return res.ok;
}
