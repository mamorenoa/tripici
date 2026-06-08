import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripsRepository } from "../../repositories/trips/tripsRepository";
import { tripsQueryKey } from "./useTrips";

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tripsRepository.create,
    onSuccess: () => {
      // Refetch the list so the new trip shows up immediately.
      queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
  });
}
