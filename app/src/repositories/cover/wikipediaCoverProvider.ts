import { activeLanguage } from "../../lib/i18n";
import type { CoverImage, CoverImageProvider } from "../../domain/cover/types";

/**
 * Cover images sourced from Wikipedia's REST summary endpoint. Keyless
 * and CORS-enabled, so it works on web and native alike. For a known
 * place it returns a representative photo (skyline, landmark…).
 *
 * To switch the whole app to another source (e.g. Unsplash), implement
 * `CoverImageProvider` in a sibling file and change the single export in
 * `./index.ts` — nothing else needs to know.
 */

// Above this width we skip the full-res original (some are multi-MB) and
// use the pre-generated thumbnail instead. We deliberately do NOT request
// a custom thumbnail width: asking Wikimedia to render an oversized thumb
// of certain images (large PNG montages) fails server-side.
const MAX_ORIGINAL_WIDTH = 2000;

async function getCoverImage(destination: string): Promise<CoverImage | null> {
  if (!destination) return null;
  const lang = activeLanguage();
  const url =
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/` +
    encodeURIComponent(destination);

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();

    // Disambiguation pages have no single representative image.
    if (data?.type === "disambiguation") return null;

    const original = data?.originalimage as
      | { source?: string; width?: number }
      | undefined;
    const thumb: string | undefined = data?.thumbnail?.source;

    // Prefer the crisp original when it's a sane size, else the safe
    // pre-generated thumbnail.
    const imageUrl =
      original?.source &&
      typeof original.width === "number" &&
      original.width <= MAX_ORIGINAL_WIDTH
        ? original.source
        : (thumb ?? original?.source);
    if (!imageUrl) return null;

    return {
      imageUrl,
      attribution: "Wikipedia",
      sourceUrl: data?.content_urls?.desktop?.page,
    };
  } catch {
    // Never throw — the UI falls back to a gradient on null.
    return null;
  }
}

export const wikipediaCoverProvider: CoverImageProvider = { getCoverImage };
