import type { CoverImage, CoverImageProvider } from "../../domain/cover/types";

/**
 * Cover images from Unsplash — proper travel photography, far nicer than
 * the encyclopedic Wikipedia shots.
 *
 * Needs a (free) Unsplash access key in `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY`
 * (see `.env.example`). Without it the provider quietly returns `null` so
 * the cover falls back to a gradient — the app never breaks for a missing
 * key.
 *
 * Selected via `./index.ts`; swap that export back to
 * `wikipediaCoverProvider` to revert. Nothing else needs to change.
 */

const ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

// Appended to Unsplash links per their API attribution guidelines.
const UTM = "utm_source=tripinci&utm_medium=referral";

let warnedNoKey = false;

/**
 * Unsplash asks apps to ping a photo's `download_location` when the image
 * is actually used/displayed. Fire-and-forget; never blocks the UI.
 */
function triggerDownload(downloadLocation: string) {
  fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  }).catch(() => {});
}

async function getCoverImage(destination: string): Promise<CoverImage | null> {
  if (!destination) return null;
  if (!ACCESS_KEY) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.warn(
        "[cover] EXPO_PUBLIC_UNSPLASH_ACCESS_KEY not set — falling back to gradient covers.",
      );
    }
    return null;
  }

  const url =
    "https://api.unsplash.com/search/photos?" +
    `query=${encodeURIComponent(destination)}` +
    "&per_page=1&orientation=landscape&content_filter=high";

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${ACCESS_KEY}`,
        "Accept-Version": "v1",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data?.results?.[0];
    const imageUrl: string | undefined = photo?.urls?.regular;
    if (!imageUrl) return null;

    if (photo?.links?.download_location) {
      triggerDownload(photo.links.download_location);
    }

    const author: string | undefined = photo?.user?.name;
    return {
      imageUrl,
      // "Photo · <author> · Unsplash" satisfies Unsplash's attribution ask.
      attribution: author ? `${author} · Unsplash` : "Unsplash",
      sourceUrl: photo?.links?.html ? `${photo.links.html}?${UTM}` : undefined,
    };
  } catch {
    // Never throw — the UI falls back to a gradient on null.
    return null;
  }
}

export const unsplashCoverProvider: CoverImageProvider = { getCoverImage };
