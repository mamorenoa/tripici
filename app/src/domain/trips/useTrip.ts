import { useQuery } from "@tanstack/react-query";

import { tripsRepository } from "../../repositories/trips/tripsRepository";

export const tripQueryKey = (tripId: string) => ["trip", tripId] as const;

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripQueryKey(tripId),
    queryFn: () => tripsRepository.get(tripId),
  });
}
