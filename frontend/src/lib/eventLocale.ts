import type { EventRecord } from "../data/store";

export type LocalizedEvent = {
  title: string;
  desc: string;
};

export function pickEventLocale(
  event: EventRecord,
  language: string,
): LocalizedEvent {
  const isEn = language.toLowerCase().startsWith("en");
  if (!isEn) {
    return { title: event.title, desc: event.desc };
  }
  return {
    title: event.titleEn?.trim() || event.title,
    desc: event.descEn?.trim() || event.desc,
  };
}
