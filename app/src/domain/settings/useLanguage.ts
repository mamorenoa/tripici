/**
 * Domain layer for the language preference.
 *
 * `useLanguage` exposes the current language and a setter to the view;
 * `useHydrateLanguage` applies any persisted preference once at startup.
 * Both orchestrate the i18n instance (framework) and `languageStorage`
 * (repository) without the view knowing about either.
 */
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { activeLanguage, type Language } from "../../lib/i18n";
import { languageStorage } from "../../repositories/settings/languageStorage";

export function useLanguage() {
  // `useTranslation` re-renders this component whenever the language
  // changes, so `activeLanguage()` here is always current.
  const { i18n } = useTranslation();

  const setLanguage = useCallback(
    async (language: Language) => {
      await i18n.changeLanguage(language);
      await languageStorage.set(language);
    },
    [i18n],
  );

  return { language: activeLanguage(), setLanguage };
}

/**
 * Apply the persisted language preference at startup, overriding the
 * device-locale default i18n was initialised with. No-op when there's no
 * stored preference or it already matches. Runs once from the root layout.
 */
export function useHydrateLanguage() {
  const { i18n } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    languageStorage.get().then((stored) => {
      if (!cancelled && stored && stored !== i18n.language) {
        i18n.changeLanguage(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [i18n]);
}
