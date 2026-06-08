import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import mn from "./locales/mn.json";
import en from "./locales/en.json";

const saved =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("cs360_lang")
    : null;
const lang = saved === "en" ? "en" : "mn";

i18n.use(initReactI18next).init({
  resources: { mn: { translation: mn }, en: { translation: en } },
  lng: lang,
  fallbackLng: "mn",
  interpolation: { escapeValue: false },
});

export default i18n;
