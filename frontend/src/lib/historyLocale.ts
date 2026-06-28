import type { HistoryFigure } from "../data/history";

export type LocalizedHistoryFigure = {
  name: string;
  role: string;
  bio: string;
  bioIsFallback: boolean;
};

const CYR_TO_LAT: Record<string, string> = {
  А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v",
  Г: "G", г: "g", Д: "D", д: "d", Е: "Ye", е: "ye",
  Ё: "Yo", ё: "yo", Ж: "J", ж: "j", З: "Z", з: "z",
  И: "I", и: "i", Й: "I", й: "i", К: "K", к: "k",
  Л: "L", л: "l", М: "M", м: "m", Н: "N", н: "n",
  О: "O", о: "o", Ө: "O", ө: "o", П: "P", п: "p",
  Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t",
  У: "U", у: "u", Ү: "U", ү: "u", Ф: "F", ф: "f",
  Х: "Kh", х: "kh", Ц: "Ts", ц: "ts", Ч: "Ch", ч: "ch",
  Ш: "Sh", ш: "sh", Щ: "Shch", щ: "shch",
  Ъ: "", ъ: "", Ы: "Y", ы: "y", Ь: "", ь: "",
  Э: "E", э: "e", Ю: "Yu", ю: "yu", Я: "Ya", я: "ya",
};

export function transliterateMn(input: string): string {
  if (!input) return input;
  let out = "";
  for (const ch of input) {
    out += CYR_TO_LAT[ch] ?? ch;
  }
  return out;
}

const ROLE_EN: Record<string, string> = {
  "захирал": "Director",
  "гүйцэтгэх захирал": "Executive Director",
  "ерөнхий захирал": "General Director",
  "дэд захирал": "Deputy Director",
  "үндэслэгч": "Founder",
  "тэргүүн": "President",
  "ерөнхийлөгч": "President",
  "дарга": "Chairman",
  "ахлах захирал": "Senior Director",
};

export function defaultRoleEn(role: string): string {
  const key = role.trim().toLowerCase();
  return ROLE_EN[key] ?? transliterateMn(role);
}

export function pickHistoryLocale(
  figure: HistoryFigure,
  language: string,
): LocalizedHistoryFigure {
  const isEn = language.toLowerCase().startsWith("en");
  if (!isEn) {
    return {
      name: figure.name,
      role: figure.role,
      bio: figure.bio,
      bioIsFallback: false,
    };
  }
  const bioEn = figure.bioEn?.trim();
  return {
    name: figure.nameEn?.trim() || transliterateMn(figure.name),
    role: figure.roleEn?.trim() || defaultRoleEn(figure.role),
    bio: bioEn || figure.bio,
    bioIsFallback: !bioEn && Boolean(figure.bio),
  };
}
