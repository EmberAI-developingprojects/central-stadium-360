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

if (!env.QPAY_USERNAME || !env.QPAY_PASSWORD) {
  console.error("QPAY_USERNAME / QPAY_PASSWORD missing from backend/.env");
  process.exit(1);
}
if (!INVOICE_CODE) {
  console.error("QPAY_EBARIMT_INVOICE_CODE missing from backend/.env");
  process.exit(1);
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
  invoice_description: "eBarimt 3.0 probe — Төв цэнгэлдэх хүрээлэн",
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

console.log("\nrequest ->", `${BASE}/v2/ebarimt_v3/create`);
console.log(JSON.stringify(payload, null, 2));

const res = await fetch(`${BASE}/v2/ebarimt_v3/create`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log("\nresponse <-", res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
process.exit(res.ok ? 0 : 1);
