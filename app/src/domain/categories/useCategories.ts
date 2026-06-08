import { useQuery } from "@tanstack/react-query";

import { categoriesRepository } from "../../repositories/categories/categoriesRepository";

export const categoriesQueryKey = ["categories"] as const;

// Categories are seed data — they rarely change during a session. Cache
// aggressively to avoid re-fetching every time a screen mounts.
export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: categoriesRepository.list,
    staleTime: 60 * 60 * 1000,
  });
}
