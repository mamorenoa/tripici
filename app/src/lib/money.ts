import { activeLocaleTag } from "./i18n";

// Format integer cents as a localized EUR string, following the active
// language's locale (e.g. "€42.50" in en-GB, "42,50 €" in es-ES).
// Formatters are cached per locale tag — building one is not free.
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(localeTag: string): Intl.NumberFormat {
  let formatter = formatters.get(localeTag);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: "EUR",
    });
    formatters.set(localeTag, formatter);
  }
  return formatter;
}

export function formatEuros(cents: number): string {
  return formatterFor(activeLocaleTag()).format(cents / 100);
}

/**
 * Parse a user-typed euros string ("12.50", "1,200.99") into integer
 * cents. Returns ``null`` for invalid input — the caller decides what
 * to do (typically: disable submit).
 */
export function parseEurosToCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  // ``Math.round`` because of float drift on values like 12.10.
  return Math.round(parseFloat(trimmed) * 100);
}
