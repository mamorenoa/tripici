import { useTranslation } from "react-i18next";

/**
 * Returns a function that localizes a category by its `code`
 * (e.g. "RESTAURANTS" → "Restaurants" / "Restaurantes"). Category codes
 * are stable; the human label is translated on the frontend. The
 * server-provided label, when available, is used as the fallback for any
 * code we don't have a translation for.
 */
export function useCategoryLabel() {
  const { t } = useTranslation();
  return (code: string, fallback?: string) =>
    t(`categories.${code}`, { defaultValue: fallback ?? code });
}
