export type LocalizableEvent = {
  title: string;
  desc?: string;
  titleEn?: string;
  descEn?: string;
};

export type LocalizedEvent = {
  title: string;
  desc: string;
};

export function pickEventLocale(
  event: LocalizableEvent,
  language: string,
): LocalizedEvent {
  const isEn = language.toLowerCase().startsWith("en");
  if (!isEn) {
    return { title: event.title, desc: event.desc ?? "" };
  }
  return {
    title: event.titleEn?.trim() || event.title,
    desc: event.descEn?.trim() || event.desc || "",
  };
}
