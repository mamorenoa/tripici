import { useQuery } from "@tanstack/react-query";

import { tripsRepository } from "../../repositories/trips/tripsRepository";

// Cache key used to invalidate the list when a new trip is created.
export const tripsQueryKey = ["trips"] as const;

export function useTrips() {
  return useQuery({
    queryKey: tripsQueryKey,
    queryFn: tripsRepository.list,
  });
}
