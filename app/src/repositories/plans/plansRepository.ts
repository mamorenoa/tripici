import type { Plan, PlanCreate, PlanUpdate } from "../../domain/plans/types";
import { apiRequest } from "../../lib/apiClient";

export const plansRepository = {
  list: (tripId: string): Promise<Plan[]> =>
    apiRequest<Plan[]>(`/trips/${tripId}/plans`),

  create: (tripId: string, input: PlanCreate): Promise<Plan> =>
    apiRequest<Plan>(`/trips/${tripId}/plans`, {
      method: "POST",
      body: input,
    }),

  update: (tripId: string, planId: string, patch: PlanUpdate): Promise<Plan> =>
    apiRequest<Plan>(`/trips/${tripId}/plans/${planId}`, {
      method: "PATCH",
      body: patch,
    }),

  delete: (tripId: string, planId: string): Promise<void> =>
    apiRequest<void>(`/trips/${tripId}/plans/${planId}`, {
      method: "DELETE",
    }),
};
