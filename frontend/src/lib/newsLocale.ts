import type { NewsItem } from "../data/store";

export type LocalizedNews = {
  label: string;
  title: string;
  body: string;
};

export function pickNewsLocale(
  item: NewsItem,
  language: string,
): LocalizedNews {
  const isEn = language.toLowerCase().startsWith("en");
  if (!isEn) {
    return { label: item.label, title: item.title, body: item.body };
  }
  return {
    label: item.labelEn?.trim() || item.label,
    title: item.titleEn?.trim() || item.title,
    body: item.bodyEn?.trim() || item.body,
  };
}
