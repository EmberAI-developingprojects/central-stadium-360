import { config } from '../config.js';

/**
 * Client for the on-box **E-Barimt PosAPI 3.0** service (the card rail's fiscal
 * receipt issuer). It's a headless local REST service on `EBARIMT_POSAPI_URL`
 * (default http://localhost:7080) — it returns the receipt data (id, QR,
 * lottery) but does NOT print; printing is the bridge's job (POS80 ESC/POS).
 *
 * Verified against PosAPI v3.2.45 staging: a B2C receipt POST to /rest/receipt
 * returns `{ status: 'SUCCESS', id, qrData, lottery }`.
 */

export interface PosApiInfo {
  operatorName: string;
  operatorTIN: string;
  posNo: string;
  version: string;
  merchants: Array<{ tin: string; name: string; vatPayer: boolean }>;
}

export interface ReceiptItemInput {
  name: string;
  qty: number;
  unitPrice: number; // MNT, VAT-inclusive
  /** Optional per-line classification code; falls back to config default. */
  classificationCode?: string;
  measureUnit?: string;
}

export interface IssueReceiptInput {
  items: ReceiptItemInput[];
  /** POSAPI payment code: CASH | PAYMENT_CARD | BANK_TRANSFER_QPAY … */
  paymentCode?: string;
  /** B2B receipt: the buyer company's TIN. Omitted → B2C (citizen). */
  customerTin?: string;
}

export interface IssuedReceipt {
  id: string;
  qrData: string;
  lottery: string;
  totalAmount: number;
  totalVAT: number;
  raw: unknown;
}

const base = () => config.ebarimtPosApiUrl.replace(/\/$/, '');

/** Round to 2 decimals (MNT receipts carry tugrik with fractional VAT). */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

let infoCache: { at: number; info: PosApiInfo } | null = null;

/** GET /rest/info — operator + registered merchants. Cached briefly. */
export async function getInfo(force = false): Promise<PosApiInfo> {
  if (!force && infoCache && Date.now() - infoCache.at < 60_000) return infoCache.info;
  const res = await fetch(`${base()}/rest/info`);
  if (!res.ok) throw new Error(`posapi /rest/info ${res.status}: ${await res.text()}`);
  const info = (await res.json()) as PosApiInfo;
  infoCache = { at: Date.now(), info };
  return info;
}

/**
 * Issue a fiscal receipt. Resolves merchantTin/posNo from /rest/info (the
 * registered merchant) and computes VAT (10% inclusive) per line.
 */
export async function issueReceipt(input: IssueReceiptInput): Promise<IssuedReceipt> {
  const info = await getInfo();
  const merchant = info.merchants[0];
  if (!merchant) {
    // No company synced — see the merchant-sync gotcha (restart PosAPI).
    throw new Error('posapi_no_merchant: no company registered on the POS (restart PosAPI to sync)');
  }
  const merchantTin = merchant.tin;
  const vatable = config.ebarimtVatable && merchant.vatPayer;
  const taxType = vatable ? 'VAT_ABLE' : 'VAT_FREE';

  const items = input.items.map((it) => {
    const lineTotal = r2(it.qty * it.unitPrice);
    const lineVat = vatable ? r2(lineTotal / 11) : 0;
    return {
      name: it.name,
      barCode: '',
      barCodeType: 'UNDEFINED',
      classificationCode: it.classificationCode ?? config.ebarimtClassificationCode,
      taxProductCode: '',
      measureUnit: it.measureUnit ?? 'ширхэг',
      qty: it.qty,
      unitPrice: it.unitPrice,
      totalAmount: lineTotal,
      totalVAT: lineVat,
      totalCityTax: 0,
    };
  });

  const totalAmount = r2(items.reduce((s, i) => s + i.totalAmount, 0));
  const totalVAT = r2(items.reduce((s, i) => s + i.totalVAT, 0));

  const body = {
    totalAmount,
    totalVAT,
    totalCityTax: 0,
    districtCode: config.ebarimtDistrictCode,
    branchNo: config.ebarimtBranchNo,
    merchantTin,
    posNo: info.posNo,
    type: input.customerTin ? 'B2B_RECEIPT' : 'B2C_RECEIPT',
    ...(input.customerTin ? { customerTin: input.customerTin } : {}),
    receipts: [
      {
        totalAmount,
        totalVAT,
        totalCityTax: 0,
        taxType,
        merchantTin,
        items,
      },
    ],
    payments: [
      { code: input.paymentCode ?? 'PAYMENT_CARD', status: 'PAID', paidAmount: totalAmount },
    ],
  };

  const res = await fetch(`${base()}/rest/receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json.status !== 'SUCCESS') {
    throw new Error(`posapi_receipt_failed: ${json.message ?? res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }
  return {
    id: String(json.id ?? ''),
    qrData: String(json.qrData ?? ''),
    lottery: String(json.lottery ?? ''),
    totalAmount,
    totalVAT,
    raw: json,
  };
}
