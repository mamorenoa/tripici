import type { CoverImageProvider } from "../../domain/cover/types";
import { unsplashCoverProvider } from "./unsplashCoverProvider";
// import { wikipediaCoverProvider } from "./wikipediaCoverProvider";

/**
 * The active cover-image source. This single line is the only place the
 * app commits to a provider — every other file talks to the
 * `CoverImageProvider` interface. Swap the assignment to change source:
 *   - `unsplashCoverProvider`  → travel photography (needs an API key)
 *   - `wikipediaCoverProvider` → keyless encyclopedic images
 */
export const coverImageProvider: CoverImageProvider = unsplashCoverProvider;
