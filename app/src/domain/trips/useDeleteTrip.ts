import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expensesQueryKey } from "../expenses/useExpenses";
import { membersQueryKey } from "../members/useMembers";
import { plansQueryKey } from "../plans/usePlans";
import { statsQueryKey } from "../stats/useTripStats";
import { tripsRepository } from "../../repositories/trips/tripsRepository";
import { tripQueryKey } from "./useTrip";
import { tripsQueryKey } from "./useTrips";

/**
 * Delete a trip for good (owner-only on the backend).
 *
 * The backend deletes the trip's expenses, plans, memberships,
 * invitations and settlement payments along with it, so the cached
 * queries for those are *removed*, not invalidated: re-fetching a
 * deleted trip would only produce 404s.
 *
 * Global stats are plain invalidation — they are live aggregates on the
 * server, so the next fetch already excludes the deleted trip. The
 * prefix key covers every cached category filter.
 */
export function useDeleteTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tripsRepository.remove(tripId),
    onSuccess: () => {
      for (const queryKey of [
        tripQueryKey(tripId),
        expensesQueryKey(tripId),
        plansQueryKey(tripId),
        membersQueryKey(tripId),
        statsQueryKey(tripId),
      ]) {
        queryClient.removeQueries({ queryKey });
      }
      queryClient.invalidateQueries({ queryKey: tripsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["global-stats"] });
    },
  });
}
