import type { CoverImageProvider } from "../../domain/cover/types";
import { backendCoverProvider } from "./backendCoverProvider";
// import { wikipediaCoverProvider } from "./wikipediaCoverProvider";

/**
 * The active cover-image source. This single line is the only place the
 * app commits to a provider — every other file talks to the
 * `CoverImageProvider` interface. Swap the assignment to change source:
 *   - `backendCoverProvider`   → our API proxies Unsplash (key stays
 *     server-side, results cached). This is what production uses.
 *   - `wikipediaCoverProvider` → keyless, called straight from the client.
 */
export const coverImageProvider: CoverImageProvider = backendCoverProvider;
