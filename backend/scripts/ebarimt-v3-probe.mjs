import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, "..", ".env");

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).trim()];
      }),
  );
}

const env = { ...loadEnv(envPath), ...process.env };
const BASE = (env.QPAY_BASE_URL ?? "https://merchant.qpay.mn").replace(
  /\/$/,
  "",
);
const INVOICE_CODE = env.QPAY_EBARIMT_INVOICE_CODE;
const DISTRICT =
  env.QPAY_EBARIMT_DISTRICT_CODE || env.EBARIMT_DISTRICT_CODE || "";
const CLASSIFICATION = env.EBARIMT_CLASSIFICATION_CODE || "";

for (const [k, v] of [
  ["QPAY_USERNAME", env.QPAY_USERNAME],
  ["QPAY_PASSWORD", env.QPAY_PASSWORD],
  ["QPAY_EBARIMT_INVOICE_CODE", INVOICE_CODE],
  ["QPAY_EBARIMT_DISTRICT_CODE", DISTRICT],
  ["EBARIMT_CLASSIFICATION_CODE", CLASSIFICATION],
]) {
  if (!v) {
    console.error(`${k} missing from backend/.env`);
    process.exit(1);
  }
}

const vat = (total) =>
  Math.floor((total / 11 + Number.EPSILON) * 10000) / 10000;

const basic = Buffer.from(`${env.QPAY_USERNAME}:${env.QPAY_PASSWORD}`).toString(
  "base64",
);
const authRes = await fetch(`${BASE}/v2/auth/token`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/json",
  },
});
if (!authRes.ok) {
  console.error("AUTH FAILED", authRes.status, await authRes.text());
  process.exit(1);
}
const { access_token } = await authRes.json();
console.log("auth ok");

const products = [
  { name: "Тасалбар — VIP", qty: 1, unitPrice: 50000 },
  { name: "Тасалбар — Задгай", qty: 2, unitPrice: 25000 },
];

const payload = {
  invoice_code: INVOICE_CODE,
  sender_invoice_no: `PROBE-${Date.now()}`,
  invoice_receiver_code: "83",
  sender_branch_code: "web",
  invoice_description: "eBarimt 3.0 probe",
  callback_url: "https://example.com/callback",
  tax_type: env.QPAY_EBARIMT_TAX_TYPE || "1",
  district_code: DISTRICT,
  lines: products.map((p) => ({
    tax_product_code: "",
    line_description: p.name,
    line_quantity: p.qty.toFixed(2),
    line_unit_price: p.unitPrice.toFixed(2),
    note: "PROBE",
    classification_code: CLASSIFICATION,
    taxes: [
      {
        tax_code: "VAT",
        description: "НӨАТ",
        amount: vat(p.qty * p.unitPrice),
        note: "НӨАТ",
      },
    ],
  })),
};

const expected = products.reduce((s, p) => s + p.qty * p.unitPrice, 0);
console.log(`\nPOST ${BASE}/v2/invoice`);

const res = await fetch(`${BASE}/v2/invoice`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = null;
}

console.log(`response ${res.status}`);
if (!res.ok || !data?.invoice_id) {
  console.log(text);
  process.exit(1);
}

console.log("invoice_id:", data.invoice_id);
console.log("qr_text length:", (data.qr_text ?? "").length);
console.log("bank urls:", (data.urls ?? []).length);

const detail = await fetch(`${BASE}/v2/invoice/${data.invoice_id}`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
const inv = await detail.json();
console.log("\ninvoice_status:", inv.invoice_status);
console.log("total_amount:", inv.total_amount, `(expected ${expected})`);
console.log("tax_amount:", inv.tax_amount, `(expected ${expected / 11})`);
for (const l of inv.lines ?? []) {
  console.log(
    `  ${l.line_description} | ${l.line_quantity} x ${l.line_unit_price} | VAT ${l.taxes?.[0]?.amount}`,
  );
}
console.log("\nOK. Unpaid probe invoice, it will simply expire.");
