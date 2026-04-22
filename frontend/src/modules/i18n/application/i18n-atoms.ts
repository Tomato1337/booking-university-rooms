import { action, atom, computed } from "@reatom/core";
import { en, ru } from "../domain/types";
import type { Locale, Dictionary } from "../domain/types";

const getInitialLocale = (): Locale => {
  const stored = localStorage.getItem("app_locale") as Locale | null;
  if (stored && (stored === "ru" || stored === "en")) {
    return stored;
  }
  return "ru"; // default to ru as specified by user
};

export const localeAtom = atom<Locale>(getInitialLocale(), "localeAtom");

export const tAtom = computed((): Dictionary => {
  const locale = localeAtom();
  return locale === "ru" ? ru : en;
}, "tAtom");

export const setLocaleAction = action((locale: Locale) => {
  localeAtom.set(locale);
  localStorage.setItem("app_locale", locale);
  document.documentElement.lang = locale;
}, "setLocaleAction");

// Init on load
document.documentElement.lang = getInitialLocale();
