/**
 * Persistence for the user's language preference.
 *
 * Repository layer: the domain (`useLanguage`) defines *what* it needs
 * (get / set a language) and this is the concrete storage. Reuses the
 * cross-platform `secureStorage` (Keychain/Keystore on native,
 * localStorage on web) — same mechanism the auth token uses.
 */
import { isSupportedLanguage, type Language } from "../../lib/i18n";
import { secureStorage } from "../../lib/secureStorage";

const LANGUAGE_KEY = "tripinci.language";

export const languageStorage = {
  /** The stored preference, or `null` if the user never chose one. */
  async get(): Promise<Language | null> {
    const value = await secureStorage.getItem(LANGUAGE_KEY);
    return isSupportedLanguage(value) ? value : null;
  },

  async set(language: Language): Promise<void> {
    await secureStorage.setItem(LANGUAGE_KEY, language);
  },
};
