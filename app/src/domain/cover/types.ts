/**
 * Cover-image domain contract.
 *
 * The domain only knows *what* it needs — "give me a background image for
 * a destination" — never *how* (Wikipedia, Unsplash, …). Concrete
 * providers live in `repositories/cover/` and are wired in one place
 * (`repositories/cover/index.ts`), so swapping the source is a one-line
 * change. This mirrors the backend's Protocol-based ports.
 */

export type CoverImage = {
  /** Full URL of the image to render as the trip cover background. */
  imageUrl: string;
  /** Human-readable source label for the on-screen credit (e.g. "Wikipedia"). */
  attribution?: string;
  /** Link back to the source page (opened when the credit is tapped). */
  sourceUrl?: string;
};

export interface CoverImageProvider {
  /**
   * Resolve a cover image for a destination string, or `null` when the
   * provider has nothing suitable (the UI then falls back to a gradient).
   * Implementations must never throw — return `null` on any failure.
   */
  getCoverImage(destination: string): Promise<CoverImage | null>;
}
