import { config } from '../config.js';

const base = (): string => config.ebarimtPosApiUrl.replace(/\/$/, '');

/** Round to 2 decimals (MNT receipts carry tugrik with fractional VAT). */
function r2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** A merchant registered on the local PosAPI service (from /rest/info). */
export interface PosApiMerchant {
    tin: string;
    vatPayer: boolean;
    name?: string;
    brandName?: string;
    legalName?: string;
}

/** Decoded GET /rest/info response — only the fields we read are typed. */
export interface PosApiInfo {
    posNo?: string;
    merchants: PosApiMerchant[];
}

/** Decoded POST /rest/receipt response — dynamic; only the fields we read are typed. */
interface PosApiReceiptResponse {
    status?: string;
    message?: string;
    id?: string | number;
    qrData?: string;
    lottery?: string;
    date?: string;
    [key: string]: unknown;
}

/** One line item as POSAPI records (and the printer prints) it. */
export interface PosApiReceiptItem {
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

export interface ReceiptItemInput {
    name: string;
    qty: number;
    unitPrice: number;
    classificationCode?: string;
    measureUnit?: string;
}

export interface ReceiptInput {
    items: ReceiptItemInput[];
    customerTin?: string;
    paymentCode?: string;
}

export interface IssuedReceipt {
    id: string;
    qrData: string;
    lottery: string;
    totalAmount: number;
    totalVAT: number;
    merchantName: string;
    merchantTin: string;
    posNo: string;
    districtCode: string;
    branchNo: string;
    date: string;
    items: PosApiReceiptItem[];
    vatable: boolean;
    raw: unknown;
}

let infoCache: { at: number; info: PosApiInfo } | null = null;

/** GET /rest/info — operator + registered merchants. Cached briefly. */
export async function getInfo(force = false): Promise<PosApiInfo> {
    if (!force && infoCache && Date.now() - infoCache.at < 60_000)
        return infoCache.info;
    const res = await fetch(`${base()}/rest/info`);
    if (!res.ok)
        throw new Error(`posapi /rest/info ${res.status}: ${await res.text()}`);
    const info = (await res.json()) as PosApiInfo;
    infoCache = { at: Date.now(), info };
    return info;
}

/**
 * Issue a fiscal receipt. Resolves merchantTin/posNo from /rest/info (the
 * registered merchant) and computes VAT (10% inclusive) per line.
 */
export async function issueReceipt(input: ReceiptInput): Promise<IssuedReceipt> {
    const info = await getInfo();
    const merchant = info.merchants[0];
    if (!merchant) {
        // No company synced — see the merchant-sync gotcha (restart PosAPI).
        throw new Error('posapi_no_merchant: no company registered on the POS (restart PosAPI to sync)');
    }
    const merchantTin = merchant.tin;
    const vatable = config.ebarimtVatable && merchant.vatPayer;
    const taxType = vatable ? 'VAT_ABLE' : 'VAT_FREE';
    const items: PosApiReceiptItem[] = input.items.map((it) => {
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
    const json = (await res.json()) as PosApiReceiptResponse;
    if (!res.ok || json.status !== 'SUCCESS') {
        throw new Error(`posapi_receipt_failed: ${json.message ?? res.status} ${JSON.stringify(json).slice(0, 300)}`);
    }
    return {
        id: String(json.id ?? ''),
        qrData: String(json.qrData ?? ''),
        lottery: String(json.lottery ?? ''),
        totalAmount,
        totalVAT,
        // Header fields the paper receipt must show per TEG's official layout.
        merchantName: String(merchant.name ?? merchant.brandName ?? merchant.legalName ?? ''),
        merchantTin,
        posNo: String(info.posNo ?? ''),
        districtCode: config.ebarimtDistrictCode,
        branchNo: config.ebarimtBranchNo,
        // POSAPI stamps `date` on the accepted bill; fall back to now if it did not.
        date: String(json.date ?? new Date().toISOString()),
        // The signed items (post-VAT) — the printer prints exactly what POSAPI recorded.
        items,
        vatable,
        raw: json,
    };
}
