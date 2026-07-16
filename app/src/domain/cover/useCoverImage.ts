import { useQuery } from "@tanstack/react-query";

import { activeLanguage } from "../../lib/i18n";
import { coverImageProvider } from "../../repositories/cover";
import { deriveDestination } from "./deriveDestination";

/**
 * Resolve a cover image for a trip by its name. Provider-agnostic: it
 * asks whatever `coverImageProvider` is wired in. The active language is
 * part of the cache key because some providers (Wikipedia) return
 * locale-specific results. A destination image is effectively static, so
 * we never mark it stale.
 */
export function useCoverImage(tripName: string | undefined) {
  const lang = activeLanguage();
  const destination = tripName ? deriveDestination(tripName) : "";

  return useQuery({
    queryKey: ["cover", destination, lang],
    queryFn: () => coverImageProvider.getCoverImage(destination),
    enabled: destination.length > 0,
    staleTime: Infinity,
    retry: 1,
  });
}
