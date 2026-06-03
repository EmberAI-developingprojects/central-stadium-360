import { useTranslation } from "react-i18next";

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "mn";

  const setLang = (next: "mn" | "en") => {
    i18n.changeLanguage(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("cs360_lang", next);
    }
  };

  const wrapCls = dark
    ? "inline-flex items-center rounded-full border border-solid border-[rgba(255,255,255,0.18)] overflow-hidden text-[11px] font-bold tracking-[0.06em]"
    : "inline-flex items-center rounded-full border border-solid border-[rgba(31,41,55,0.15)] overflow-hidden text-[11px] font-bold tracking-[0.06em]";

  const btnCls = (active: boolean) =>
    dark
      ? `px-2.5 py-1.5 cursor-pointer font-[inherit] border-0 transition-colors ${active ? "bg-white text-[#071526]" : "bg-transparent text-white/65 hover:text-white"}`
      : `px-2.5 py-1.5 cursor-pointer font-[inherit] border-0 transition-colors ${active ? "bg-brand-blue text-white" : "bg-transparent text-ink/55 hover:text-ink"}`;

  return (
    <div className={wrapCls} role="group" aria-label="Language">
      <button type="button" className={btnCls(lang === "mn")} onClick={() => setLang("mn")} aria-pressed={lang === "mn"}>
        МН
      </button>
      <button type="button" className={btnCls(lang === "en")} onClick={() => setLang("en")} aria-pressed={lang === "en"}>
        EN
      </button>
    </div>
  );
}
