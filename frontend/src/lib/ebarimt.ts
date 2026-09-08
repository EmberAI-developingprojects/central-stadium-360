export const EBARIMT_MERCHANT_NAME = "Төв цэнгэлдэх хүрээлэн";
export const EBARIMT_MERCHANT_TIN = "43900438296";

export function receiptDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

export function taxMoney(n: number): string {
  return (
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "₮"
  );
}
