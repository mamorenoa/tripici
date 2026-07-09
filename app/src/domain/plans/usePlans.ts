import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { plansRepository } from "../../repositories/plans/plansRepository";
import { expensesQueryKey } from "../expenses/useExpenses";
import type { PlanCreate, PlanLinkCreate, PlanUpdate } from "./types";

export const plansQueryKey = (tripId: string) => ["plans", tripId] as const;

export function usePlans(tripId: string) {
  return useQuery({
    queryKey: plansQueryKey(tripId),
    queryFn: () => plansRepository.list(tripId),
  });
}

// A plan can mirror its cost into a trip expense, so plan mutations also
// invalidate the expenses list.
function invalidatePlansAndExpenses(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
) {
  queryClient.invalidateQueries({ queryKey: plansQueryKey(tripId) });
  queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
}

export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanCreate) => plansRepository.create(tripId, input),
    onSuccess: () => invalidatePlansAndExpenses(queryClient, tripId),
  });
}

export function useUpdatePlan(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PlanUpdate }) =>
      plansRepository.update(tripId, id, patch),
    onSuccess: () => invalidatePlansAndExpenses(queryClient, tripId),
  });
}

export function useDeletePlan(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => plansRepository.delete(tripId, planId),
    onSuccess: () => invalidatePlansAndExpenses(queryClient, tripId),
  });
}

export function useAddPlanLink(tripId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PlanLinkCreate) =>
      plansRepository.addLink(tripId, planId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansQueryKey(tripId) });
    },
  });
}

export function useDeletePlanLink(tripId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      plansRepository.deleteLink(tripId, planId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansQueryKey(tripId) });
    },
  });
}
