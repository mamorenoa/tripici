import type { CoverImage, CoverImageProvider } from "../../domain/cover/types";
import type { components } from "../_generated/api";
import { apiRequest } from "../../lib/apiClient";

/**
 * Cover images via our own API (`GET /cover`), which proxies the real
 * provider server-side.
 *
 * Why the indirection: the image provider's API key stays on the backend
 * instead of being inlined into the public web bundle, and the backend
 * caches lookups so repeated views don't burn the provider's quota.
 *
 * The endpoint requires auth, which `apiRequest` handles by attaching the
 * stored bearer token.
 */

type ApiCoverImage = components["schemas"]["CoverImage"];

async function getCoverImage(destination: string): Promise<CoverImage | null> {
  if (!destination) return null;
  try {
    const res = await apiRequest<ApiCoverImage | null>(
      `/cover?destination=${encodeURIComponent(destination)}`,
    );
    if (!res?.image_url) return null;
    return {
      imageUrl: res.image_url,
      attribution: res.attribution ?? undefined,
      sourceUrl: res.source_url ?? undefined,
    };
  } catch {
    // Never throw — the UI falls back to a gradient on null.
    return null;
  }
}

export const backendCoverProvider: CoverImageProvider = { getCoverImage };
