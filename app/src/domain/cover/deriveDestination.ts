/**
 * Best-effort destination guess from a free-text trip name.
 *
 * There's no explicit destination field yet, so we strip the noise a
 * trip name usually carries (years, month names, filler words) and keep
 * the rest as the place to search for. "Roma en julio" → "Roma",
 * "Málaga 2026" → "Málaga", "New York 2026" → "New York". When nothing
 * meaningful survives, we return the original name untouched.
 */

const MONTHS = new Set([
  // es
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "setiembre", "octubre", "noviembre", "diciembre",
  // en (full + common abbreviations)
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
]);

const FILLER = new Set([
  "en", "de", "del", "la", "el", "los", "las", "a",
  "trip", "viaje", "to", "the", "of", "in",
]);

export function deriveDestination(name: string): string {
  const kept = name
    .trim()
    .split(/\s+/)
    .filter((token) => {
      const t = token.toLowerCase().replace(/[.,;:]/g, "");
      if (/^\d{4}$/.test(t)) return false; // a year
      if (MONTHS.has(t)) return false;
      if (FILLER.has(t)) return false;
      return true;
    });

  const result = kept.join(" ").trim();
  return result.length > 0 ? result : name.trim();
}
