import { useQuery } from "@tanstack/react-query";

import { statsRepository } from "../../repositories/stats/statsRepository";

export const statsQueryKey = (tripId: string) =>
  ["stats", tripId] as const;

export function useTripStats(tripId: string) {
  return useQuery({
    queryKey: statsQueryKey(tripId),
    queryFn: () => statsRepository.get(tripId),
  });
}
