/**
 * i18n bootstrap. Imported once (from the root layout) so the shared
 * i18next instance is initialised before any component calls
 * `useTranslation`.
 *
 * Init is synchronous and seeded with the device locale
 * (`expo-localization.getLocales()` is sync), so the first paint is
 * already in the right language — no loading gate, no flash. A persisted
 * user preference, if any, is applied afterwards at startup by the
 * settings layer (see `useLanguage` / the root layout).
 */
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";

// BCP-47 tags used for locale-aware `Intl` formatting (currency, dates).
const LOCALE_TAGS: Record<Language, string> = {
  en: "en-GB",
  es: "es-ES",
};

export function isSupportedLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/** The device's preferred language if we support it, else the default. */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
}

/** The active language, narrowed to one we support. */
export function activeLanguage(): Language {
  return isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}

/** BCP-47 tag for the active language — for `Intl.*` formatters. */
export function activeLocaleTag(): string {
  return LOCALE_TAGS[activeLanguage()];
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    // React already escapes values, so i18next doesn't need to.
    escapeValue: false,
  },
  // Missing keys should surface the key, never `null`.
  returnNull: false,
});

export default i18n;
