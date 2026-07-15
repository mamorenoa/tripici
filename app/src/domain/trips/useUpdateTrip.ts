import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripsRepository } from "../../repositories/trips/tripsRepository";
import type { TripUpdate } from "./types";
import { tripQueryKey } from "./useTrip";
import { tripsQueryKey } from "./useTrips";

/** Edit a trip's name and/or date range (owner-only on the backend). */
export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: TripUpdate) => tripsRepository.update(tripId, patch),
    onSuccess: (trip) => {
      // Keep the detail screen and the list in sync.
      queryClient.setQueryData(tripQueryKey(tripId), trip);
      queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
  });
}
