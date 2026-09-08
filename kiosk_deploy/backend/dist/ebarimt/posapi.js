import { config } from '../config.js';
const base = () => config.ebarimtPosApiUrl.replace(/\/$/, '');
function r2(n) {
    return Math.round(n * 100) / 100;
}
let infoCache = null;
/** GET /rest/info — operator + registered merchants. Cached briefly. */
export async function getInfo(force = false) {
    if (!force && infoCache && Date.now() - infoCache.at < 60_000)
        return infoCache.info;
    const res = await fetch(`${base()}/rest/info`);
    if (!res.ok)
        throw new Error(`posapi /rest/info ${res.status}: ${await res.text()}`);
    const info = (await res.json());
    infoCache = { at: Date.now(), info };
    return info;
}
export async function issueReceipt(input) {
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
    const json = (await res.json());
    if (!res.ok || json.status !== 'SUCCESS') {
        throw new Error(`posapi_receipt_failed: ${json.message ?? res.status} ${JSON.stringify(json).slice(0, 300)}`);
    }
    return {
        id: String(json.id ?? ''),
        qrData: String(json.qrData ?? ''),
        lottery: String(json.lottery ?? ''),
        totalAmount,
        totalVAT,
        merchantName: String(merchant.name ?? merchant.brandName ?? merchant.legalName ?? ''),
        merchantTin,
        posNo: String(info.posNo ?? ''),
        districtCode: config.ebarimtDistrictCode,
        branchNo: config.ebarimtBranchNo,
        date: String(json.date ?? new Date().toISOString()),
        items,
        vatable,
        raw: json,
    };
}
//# sourceMappingURL=posapi.js.map