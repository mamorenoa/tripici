import type { CoverImageProvider } from "../../domain/cover/types";
import { wikipediaCoverProvider } from "./wikipediaCoverProvider";

/**
 * The active cover-image source. This single line is the only place the
 * app commits to a provider — swap it for an Unsplash implementation
 * (same `CoverImageProvider` interface) and the whole app follows.
 */
export const coverImageProvider: CoverImageProvider = wikipediaCoverProvider;
