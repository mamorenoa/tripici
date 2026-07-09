import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { plansRepository } from "../../repositories/plans/plansRepository";
import type { PlanCreate, PlanUpdate } from "./types";

export const plansQueryKey = (tripId: string) => ["plans", tripId] as const;

export function usePlans(tripId: string) {
  return useQuery({
    queryKey: plansQueryKey(tripId),
    queryFn: () => plansRepository.list(tripId),
  });
}

export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanCreate) => plansRepository.create(tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansQueryKey(tripId) });
    },
  });
}

export function useUpdatePlan(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PlanUpdate }) =>
      plansRepository.update(tripId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansQueryKey(tripId) });
    },
  });
}

export function useDeletePlan(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => plansRepository.delete(tripId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansQueryKey(tripId) });
    },
  });
}
