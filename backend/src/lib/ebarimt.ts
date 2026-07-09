import type { KioskEbarimt } from "@cs360/shared";

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
}

const VAT_DIVISOR = 11;

/**
 * COMPLIANCE POLICY — `qrData` and `lottery` are DISPLAY/PRINT-ONLY per the
 * PosAPI 3.0 manual. The platform persists them on `tickets` solely to re-render
 * the buyer's own receipt QR on their order page (the online equivalent of
 * printing them on a paper receipt) — they MUST NEVER be written to server logs,
 * error strings, analytics, or any other sink. When an upstream response body is
 * folded into an Error/log, scrub these fields first with
 * {@link redactReceiptSecrets}. Matches both PosAPI (`qrData`, `lottery`) and
 * QPay-cloud (`ebarimt_qr_data`, `ebarimt_lottery`) field names.
 */
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
      )}. Set your merchant's real registered values before production — ` +
        `receipts will otherwise register under the wrong product/location.`,
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

/** Transient failures worth retrying: connection errors + our own timeout abort. */
function isNetworkError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return err instanceof TypeError || name === "AbortError";
}

/**
 * Fetch a PosAPI endpoint with a request timeout and bounded retries on
 * transient network/timeout failures ONLY. HTTP error *responses* (4xx/5xx) are
 * returned to the caller unretried — those are business outcomes the caller
 * inspects (e.g. an already-voided receipt), not flakiness. The POS is a local
 * Windows service that can hang or briefly drop, so a bare `fetch` could stall
 * the payment-completion path indefinitely.
 *
 * `opts.retry: false` disables the retries (timeout still applies) — used for
 * receipt ISSUANCE, which is not idempotent: a retried POST whose first attempt
 * actually reached the POS could double-issue a fiscal receipt. Reads
 * (`/rest/info`), the return/void (`DELETE`, idempotent), and `sendData` are
 * safe to retry.
 */
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

  // No retry: issuance is not idempotent (a retried POST could double-issue).
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
  /** True when the POS reported the receipt was already voided (idempotent). */
  alreadyVoided: boolean;
}

/**
 * Void ("буцаалт") a previously-issued fiscal receipt on the local POS. Maps to
 * `DELETE {baseUrl}/rest/receipt` with the original receipt `id` (the optional
 * `date` is accepted but the id alone identifies the receipt).
 *
 * The POS returns an empty `200` on success. Two error bodies are known and
 * handled here (learned by probing the PosAPI 3.0 test rig):
 *  - `UNIQUE constraint failed: receipt.id` → the return record already exists,
 *    i.e. the receipt is already voided. Treated as success so a retried refund
 *    is idempotent instead of throwing.
 *  - `Баримтын дугаар нь ААН-н жагсаалттай таарсангүй.` → unknown/foreign id.
 *
 * Note: like issuance, a void only enters the POS's local queue — call
 * {@link sendData} to transmit it to the national eBarimt system.
 */
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

  const data = (await res
    .json()
    .catch(() => ({}))) as PosVoidErrorResponse;
  const msg = data.message ?? "";
  if (/UNIQUE constraint failed/i.test(msg)) {
    return { voided: true, alreadyVoided: true };
  }
  throw new Error(`ebarimt_void_failed:${res.status}:${msg || "no message"}`);
}

/**
 * Flush the POS's local queue of issued/voided receipts to the national eBarimt
 * system. `GET {baseUrl}/rest/sendData`; resolves true on a 2xx. Best-effort —
 * the POS also transmits on its own schedule.
 */
export async function sendData(): Promise<boolean> {
  if (!isEbarimtConfigured()) throw new Error("ebarimt_not_configured");
  const res = await posFetch("GET", "/rest/sendData");
  return res.ok;
}
