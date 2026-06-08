// Format integer cents as a localized EUR string. The locale is fixed
// to ``en-GB`` for now to keep the rest of the codebase coherent; when
// we add i18n it will read the active locale instead.
const formatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

export function formatEuros(cents: number): string {
  return formatter.format(cents / 100);
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
