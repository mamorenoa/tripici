import { useQuery } from "@tanstack/react-query";

import { statsRepository } from "../../repositories/stats/statsRepository";

export const globalStatsQueryKey = (categoryCode?: string) =>
  ["global-stats", categoryCode ?? null] as const;

export function useGlobalStats(categoryCode?: string) {
  return useQuery({
    queryKey: globalStatsQueryKey(categoryCode),
    queryFn: () => statsRepository.getGlobal(categoryCode),
  });
}
